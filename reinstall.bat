@echo off
REM Quick reinstall script for extension development
REM Compiles, packages, and installs the extension

echo ============================================================
echo Lineage Planning Extension - Quick Reinstall
echo ============================================================
echo.

echo [1/3] Compiling TypeScript...
call npm run compile
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Compilation failed!
    pause
    exit /b 1
)
echo ✅ Compilation successful
echo.

echo [2/3] Packaging VSIX...
call npm run package
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Packaging failed!
    pause
    exit /b 1
)
echo ✅ VSIX packaged
echo.

echo [3/3] Installing extension...
code --install-extension lineage-planning-extension-0.1.0.vsix --force
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed!
    pause
    exit /b 1
)
echo ✅ Extension installed
echo.

echo ============================================================
echo Extension reinstalled successfully!
echo ============================================================
echo.
echo Next steps:
echo 1. Press Ctrl+Shift+P in VSCode
echo 2. Type "Developer: Reload Window"
echo 3. Press Enter
echo.
echo The extension will activate in the Lineage workspace.
echo Check Output ^> "Lineage Planning" to see logs.
echo.
pause
