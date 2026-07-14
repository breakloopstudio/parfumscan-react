@echo off
set ANDROID_HOME=C:\Users\Pierre-Louis\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%

echo.
echo ======================================
echo   ParfumScan - Launch Dev Build
echo ======================================
echo.

:: 1. Check if emulator is already running
adb devices 2>nul | findstr "emulator" >nul
if %errorlevel%==0 (
    echo [OK] Emulator already running
    goto :launch
)

:: 2. Start emulator
echo [>>] Starting emulator (Pixel_7_Pro)...
start /min emulator -avd Pixel_7_Pro

:: 3. Wait for device
echo [..] Waiting for device...
adb wait-for-device

:: 4. Wait for boot
echo [..] Waiting for boot...
:bootloop
adb shell getprop sys.boot_completed 2>nul | findstr "1" >nul
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto :bootloop
)
echo [OK] Emulator ready!

:launch
:: 5. Launch Expo
echo.
echo [>>] Starting Expo development build...
echo      (first build: ~3-5 min | after: Fast Refresh)
echo.
npx expo run:android

pause
