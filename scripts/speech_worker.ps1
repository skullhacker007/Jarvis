# JARVIS High-Performance Continuous Speech & Wake-Word Recognition Worker
# Features:
# 1. Zero-latency Dedicated Wake-Word Grammar ("hey jarvis", "jarvis", "ok jarvis", "hello jarvis", "hi jarvis")
# 2. Continuous Real-time Dictation Streaming via SAPI In-Process Engine (Non-blocking Multiple Mode)
# 3. Resilient Fallbacks to WinRT Continuous Dictation & Shared System Speech
$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Run-SapiEngineWorker {
    $parentPid = 0
    try {
        $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    } catch {}

    Add-Type -AssemblyName System.Speech
    $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    
    try {
        $engine.SetInputToDefaultAudioDevice()
    } catch {
        return Run-SapiSharedWorker
    }

    # 1. Dedicated Wake-Word Grammar for instant exact phoneme triggering
    $choices = New-Object System.Speech.Recognition.Choices
    $choices.Add([string[]]@("hey jarvis", "jarvis", "ok jarvis", "hello jarvis", "hi jarvis"))
    $gb = New-Object System.Speech.Recognition.GrammarBuilder($choices)
    $wakeGrammar = New-Object System.Speech.Recognition.Grammar($gb)
    $wakeGrammar.Name = "WakeGrammar"
    $wakeGrammar.Priority = 127
    $engine.LoadGrammar($wakeGrammar)

    # 2. Continuous Free-Form Dictation Grammar
    $dictation = New-Object System.Speech.Recognition.DictationGrammar
    $dictation.Name = "DictationGrammar"
    $engine.LoadGrammar($dictation)

    # 3. Continuous Event Registration
    Register-ObjectEvent -InputObject $engine -EventName "SpeechRecognized" -Action {
        $res = $Event.SourceEventArgs.Result
        if ($res -and $res.Text) {
            $text = $res.Text.Trim()
            if ($text.Length -gt 0) {
                $isWake = ($res.Grammar.Name -eq "WakeGrammar") -or ($text.ToLower() -match '\b(hey\s+|ok\s+|hi\s+|hello\s+)?jarvis\b')
                $json = @{
                    event = "speech"
                    text = $text
                    confidence = [math]::Round($res.Confidence, 2)
                    is_wake_word = $isWake
                    grammar = $res.Grammar.Name
                } | ConvertTo-Json -Compress
                [Console]::Out.WriteLine($json)
            }
        }
    } | Out-Null

    # Start non-blocking continuous listening
    $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)

    $ready = @{
        status = "ready"
        engine = "SAPI_Continuous"
        lang = $engine.RecognizerInfo.Culture.Name
        wake_words = @("hey jarvis", "jarvis", "ok jarvis", "hello jarvis", "hi jarvis")
    } | ConvertTo-Json -Compress
    [Console]::Out.WriteLine($ready)

    while ($true) {
        if ($parentPid -gt 0 -and (-not (Get-Process -Id $parentPid -ErrorAction SilentlyContinue))) {
            break
        }
        Start-Sleep -Milliseconds 400
    }
}

function Run-SapiSharedWorker {
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

    Register-ObjectEvent -InputObject $rec -EventName "SpeechRecognized" -Action {
        $text = $Event.SourceEventArgs.Result.Text
        if ($text -and $text.Trim().Length -gt 0) {
            $isWake = ($text.ToLower() -match '\b(hey\s+|ok\s+|hi\s+|hello\s+)?jarvis\b')
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
            $null = $recTask.Wait(3500)

            if ($recTask.IsCompleted -and $recTask.Result -and $recTask.Result.Text) {
                $text = $recTask.Result.Text.Trim()
                if ($text.Length -gt 0) {
                    $isWake = ($text.ToLower() -match '\b(hey\s+|ok\s+|hi\s+|hello\s+)?jarvis\b')
                    $json = @{ event = "speech"; text = $text; confidence = $recTask.Result.Confidence.ToString(); is_wake_word = $isWake } | ConvertTo-Json -Compress
                    [Console]::Out.WriteLine($json)
                }
            }
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
}

try {
    Run-SapiEngineWorker
} catch {
    try {
        Run-WinRTWorker
    } catch {
        try {
            Run-SapiSharedWorker
        } catch {
            $err = @{ status = "error"; message = $_.Exception.Message } | ConvertTo-Json -Compress
            [Console]::Out.WriteLine($err)
            Start-Sleep -Seconds 5
        }
    }
}
