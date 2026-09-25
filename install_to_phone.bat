@echo off
setlocal
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

echo ========================================================
echo       Osama Studio - Android APK Installer
echo ========================================================
echo.

if not exist %ADB% (
    echo [ERROR] ADB tool was not found at %ADB%
    pause
    exit /b 1
)

echo Checking connected devices:
%ADB% devices
echo.

echo Installing Osama_Studio.apk to your phone...
%ADB% install -r "%~dp0Osama_Studio.apk"
set RES=%ERRORLEVEL%

if %RES% EQU 0 goto :SUCCESS
goto :FAILED

:SUCCESS
echo.
echo ========================================================
echo  [SUCCESS] Osama Studio installed successfully!
echo ========================================================
echo Launching app on your phone...
%ADB% shell monkey -p com.osamastudio.app -c android.intent.category.LAUNCHER 1 >nul 2>&1
goto :END

:FAILED
echo.
echo ========================================================
echo  [FAILED] Installation did not succeed.
echo ========================================================
echo Please check:
echo 1. Phone is connected via USB cable.
echo 2. "USB Debugging" is turned ON in Developer Options.
echo 3. Look at your phone screen and tap "ALLOW" on the USB prompt.
goto :END

:END
echo.
pause
