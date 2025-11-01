@echo off
REM Diagnostic script for VSCode Extension Development issues

echo ============================================================
echo VSCode Extension Development Diagnostics
echo ============================================================
echo.

echo [1/6] Checking VSCode installation...
where code >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ VSCode CLI found
    code --version
) else (
    echo ❌ VSCode CLI not found in PATH
    echo    Please add VSCode to PATH or use full path
)
echo.

echo [2/6] Checking workspace directory...
if exist "D:\projects\lineage\plans" (
    echo ✅ Workspace directory exists: D:\projects\lineage
    echo ✅ Plans directory exists
) else (
    echo ❌ Plans directory not found
)
echo.

echo [3/6] Checking extension directory...
if exist "%~dp0dist\extension.js" (
    echo ✅ Extension compiled: dist\extension.js exists
) else (
    echo ❌ Extension not compiled
    echo    Run: npm run compile
)
echo.

echo [4/6] Checking node_modules...
if exist "%~dp0node_modules" (
    echo ✅ Dependencies installed
) else (
    echo ❌ Dependencies not installed
    echo    Run: npm install
)
echo.

echo [5/6] Testing VSCode workspace opening (normal mode)...
echo    Opening workspace in normal VSCode...
start "" code "D:\projects\lineage"
echo ✅ Normal workspace opened
echo    (Check if this window opens correctly)
echo.
timeout /t 3 /nobreak >nul

echo [6/6] Testing Extension Development Host...
echo    Opening Extension Development Host...
echo.
cd "%~dp0"
code --extensionDevelopmentPath="%~dp0" "D:\projects\lineage"
echo.
echo ============================================================
echo Diagnostic Results:
echo ============================================================
echo.
echo If normal VSCode opens the workspace but Extension Development Host doesn't:
echo   → VSCode bug with extensionDevelopmentPath parameter
echo   → Solution: Install extension via VSIX (see TROUBLESHOOTING.md)
echo.
echo If neither window opens the workspace:
echo   → Possible VSCode configuration issue
echo   → Solution: Reinstall VSCode or check workspace trust settings
echo.
echo If Extension Development Host opens but workspace is empty:
echo   → Try manual open: Ctrl+K Ctrl+O in that window
echo   → If manual open also fails: VSCode bug with Extension Development Host
echo.
echo ============================================================
pause
