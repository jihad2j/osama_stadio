@echo off
chcp 65001 >nul
echo ========================================================
echo       تثبيت تطبيق Osama Studio على هاتفك الأندرويد
echo ========================================================
echo.
echo 1. تأكد من توصيل هاتفك بالكمبيوتر عبر كابل USB.
echo 2. تأكد من تفعيل "تصحيح أخطاء USB" (USB Debugging) في الهاتف.
echo.
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

if not exist %ADB% (
    echo [خطأ] لم يتم العثور على أداة adb في المسار المعتاد.
    pause
    exit /b 1
)

echo [1/2] فحص الأجهزة المتصلة...
%ADB% devices
echo.

echo [2/2] جاري تثبيت التطبيق على الهاتف...
%ADB% install -r "%~dp0Osama_Studio.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [نجاح] تم تثبيت تطبيق Osama Studio بنجاح على هاتفك! 🎉
    echo ========================================================
    echo جاري تشغيل التطبيق على شاشة الهاتف...
    %ADB% shell monkey -p com.osamastudio.app -c android.intent.category.LAUNCHER 1 >nul 2>&1
) else (
    echo.
    echo [تنبيه] فشل التثبيت. تأكد من الموافقة على رسالة السماح بتصحيح USB التي تظهر على شاشة هاتفك، ثم أعد المحاولة.
)

pause
