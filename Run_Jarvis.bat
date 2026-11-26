@echo off
setlocal
set "VENV_PY=%~dp0.venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    where uv >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        uv venv "%~dp0.venv" --python 3.14 >nul 2>&1
        uv pip install --python "%VENV_PY%" -r "%~dp0requirements.txt" >nul 2>&1
    )
)
if exist "%VENV_PY%" (
    start /B "" "%VENV_PY%" "%~dp0scripts\neural_tts_service.py" 5000 >nul 2>&1
) else (
    start /B "" python "%~dp0scripts\neural_tts_service.py" 5000 >nul 2>&1
)
start "" "%~dp0Jarvis.exe"
