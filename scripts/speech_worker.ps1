# J.A.R.V.I.S. High-Performance Background Speech Recognition Worker
# Supports:
# 1. Modern Windows 10/11 WinRT Speech Recognition (Free-form Dictation + All Sample Rates)
# 2. Resilient Fallback to System.Speech Shared Recognizer with DictationGrammar
$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Run-WinRTWorker {
    $parentPid = 0
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    } catch {}

    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    } | Select-Object -First 1

    [Windows.Media.SpeechRecognition.SpeechRecognizer, Windows.Media.SpeechRecognition, ContentType = WindowsRuntime] | Out-Null
    $rec = [Windows.Media.SpeechRecognition.SpeechRecognizer]::new()
    $rec.Timeouts.InitialSilenceTimeout = [TimeSpan]::FromSeconds(3)
    $rec.Timeouts.EndSilenceTimeout = [TimeSpan]::FromMilliseconds(500)

    $compileOp = $rec.CompileConstraintsAsync()
    $compileTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.SpeechRecognition.SpeechRecognitionCompilationResult]).Invoke($null, @($compileOp))
    $null = $compileTask.Wait(3000)

    $ready = @{ status = "ready"; engine = "WinRT"; lang = $rec.CurrentLanguage.LanguageTag } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($ready)

    while ($true) {
        if ($parentPid -gt 0 -and (-not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue))) {
            break
        }
        try {
            $recOp = $rec.RecognizeAsync()
            $recTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.SpeechRecognition.SpeechRecognitionResult]).Invoke($null, @($recOp))
            $null = $recTask.Wait(4500)

            if ($recTask.IsCompleted -and $recTask.Result -and $recTask.Result.Text) {
                $text = $recTask.Result.Text.Trim()
                if ($text.Length -gt 0) {
                    $isWake = ($text.ToLower() -match '\bjarvis\b')
                    $json = @{ event = "speech"; text = $text; confidence = $recTask.Result.Confidence.ToString(); is_wake_word = $isWake } | ConvertTo-Json -Compress
                    [Console]::Out.WriteLine($json)
                }
            }
        } catch {
            Start-Sleep -Milliseconds 300
        }
    }
}

function Run-SapiWorker {
    $parentPid = 0
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    } catch {}

    Add-Type -AssemblyName System.Speech
    $rec = New-Object System.Speech.Recognition.SpeechRecognizer
    $dg = New-Object System.Speech.Recognition.DictationGrammar
    $rec.LoadGrammar($dg)

    $ready = @{ status = "ready"; engine = "SAPI_Shared"; lang = $rec.RecognizerInfo.Culture.Name } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($ready)

    # In SAPI Shared Recognizer, subscribe to SpeechRecognized event
    Register-ObjectEvent -InputObject $rec -EventName "SpeechRecognized" -Action {
        $text = $Event.SourceEventArgs.Result.Text
        if ($text -and $text.Trim().Length -gt 0) {
            $isWake = ($text.ToLower() -match '\bjarvis\b')
            $json = @{ event = "speech"; text = $text.Trim(); is_wake_word = $isWake } | ConvertTo-Json -Compress
            [Console]::Out.WriteLine($json)
        }
    } | Out-Null

    while ($true) {
        if ($parentPid -gt 0 -and (-not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue))) {
            break
        }
        Start-Sleep -Milliseconds 500
    }
}

try {
    Run-WinRTWorker
} catch {
    try {
        Run-SapiWorker
    } catch {
        $err = @{ status = "error"; message = $_.Exception.Message } | ConvertTo-Json -Compress
        [Console]::Out.WriteLine($err)
        Start-Sleep -Seconds 5
    }
}
