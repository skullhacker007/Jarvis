@echo off
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start /B "" py -3.14 "%~dp0scripts\neural_tts_service.py" 5000 >nul 2>&1
) else if exist "C:\Python314\python.exe" (
    start /B "" "C:\Python314\python.exe" "%~dp0scripts\neural_tts_service.py" 5000 >nul 2>&1
) else (
    start /B "" python "%~dp0scripts\neural_tts_service.py" 5000 >nul 2>&1
)
start "" "%~dp0Jarvis.exe"
