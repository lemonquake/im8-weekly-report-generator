@echo off
title IM8 Weekly Report Launcher
echo.
echo =========================================
echo    IM8 WEEKLY REPORT GENERATOR
echo =========================================
echo.

set PYTHON_CMD=python

:: Try python
%PYTHON_CMD% --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set PYTHON_CMD=py
    %PYTHON_CMD% --version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Python not found. Please install it from python.org
        pause
        exit /b
    )
)

echo [1/2] Checking dependencies...
%PYTHON_CMD% -m pip install fastapi uvicorn python-multipart pandas python-docx openpyxl -q

echo [2/2] Starting application...
start "" "http://localhost:8000"

echo.
echo Server is running. Do not close this window.
echo.

%PYTHON_CMD% -m uvicorn api:app --port 8000

echo.
echo [INFO] Server has stopped.
pause
