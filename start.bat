@echo off
echo Starting Sheet Cleaner Setup...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in your system PATH!
    echo Please install Python from https://www.python.org/ and try again.
    echo Make sure to check the box "Add Python to PATH" during installation.
    pause
    exit /b
)

:: Create a virtual environment if it doesn't exist to keep things clean
if not exist "venv\" (
    echo Creating a local Python environment...
    python -m venv venv
)

:: Activate the virtual environment
call venv\Scripts\activate.bat

:: Install or update requirements quietly
echo Installing dependencies (this may take a minute if it is your first time)...
pip install -r requirements.txt -q

:: Start the FastAPI server in a new window
echo.
echo Starting the server...
start "Sheet Cleaner Server" cmd /c "venv\Scripts\activate.bat && uvicorn app:app --host 127.0.0.1 --port 8000"

:: Wait 3 seconds to let the server boot up, then open the default web browser
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8000

echo.
echo The application should now be open in your web browser!
echo (If you want to stop the tool, just close the other black console window.)
echo.
pause
