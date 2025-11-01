@echo off
REM Launch Extension Development Host with workspace
REM This script ensures the workspace opens correctly

echo Compiling extension...
cd "%~dp0"
call npm run compile

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Compilation failed!
    echo Please fix compilation errors and try again.
    pause
    exit /b 1
)

echo.
echo Launching Extension Development Host...
echo.
echo Window should open with:
echo - Extension loaded
echo - Lineage workspace opened
echo - Extension activated
echo.

REM Try with folder-uri format
code --extensionDevelopmentPath="%~dp0" --folder-uri="vscode-remote://file/D:/projects/lineage"

REM If that doesn't work, try standard format
timeout /t 2 /nobreak >nul
code --extensionDevelopmentPath="%~dp0" "D:\projects\lineage"

echo.
echo If workspace didn't open:
echo 1. In the Extension Development Host window, press Ctrl+K Ctrl+O
echo 2. Select: D:\projects\lineage
echo 3. Extension will activate once workspace is open
echo.
pause
