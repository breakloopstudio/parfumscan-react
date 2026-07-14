@echo off
cd /d C:\dev\ParfumScan_react
set ANDROID_HOME=C:\Users\Pierre-Louis\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%

echo.
echo ======================================
echo   ParfumScan - Dev Build
echo ======================================
echo.
echo [>>] Starting Expo development build...
echo      (first build: ~3-5 min | after: Fast Refresh)
echo.
npx expo run:android
pause
