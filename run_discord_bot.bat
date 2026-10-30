@echo off
title NHL95.net - Live Discord Save State Bot
echo ====================================================================
echo   NHL95.net Live Discord Save State Ingestion Bot
echo   Listening for .state / .sav drops and posting to Supabase...
echo ====================================================================
echo.

set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312-arm64\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=py"

echo Checking Python dependencies (discord.py, Pillow)...
"%PYTHON_EXE%" -c "import discord, PIL" 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo Installing discord.py and Pillow...
    "%PYTHON_EXE%" -m pip install discord.py Pillow
)

:loop
echo.
"%PYTHON_EXE%" -u "%~dp0scripts\discord_savestate_bot.py" %*
echo.
echo Bot process exited (code %ERRORLEVEL%). Restarting in 5 seconds... (Press Ctrl+C to stop)
timeout /t 5 >NUL
goto loop
