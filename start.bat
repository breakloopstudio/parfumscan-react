@echo off
setlocal enabledelayedexpansion
cd /d C:\dev\ParfumScan_react
set ANDROID_HOME=C:\Users\Pierre-Louis\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%

echo.
echo ======================================
echo   ParfumScan - Dev
echo ======================================
echo.

:: --- 1. Kill old Metro (prevents port conflicts) ---
echo [~] Killing old Metro process...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: --- 2. Clean ADB (prevents connection issues) ---
echo [~] Clearing ADB state...
adb kill-server >nul 2>&1
adb start-server >nul 2>&1

:: --- 3. Check if emulator already running ---
adb get-state >nul 2>&1
if %errorlevel% equ 0 (
    echo [ok] Emulator already connected.
    goto :check_mode
)

:: --- 4. Start emulator ---
echo [>>] Starting emulator Pixel_7_Pro...
start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd Pixel_7_Pro >nul 2>&1
echo [..] Waiting for emulator boot...
adb wait-for-device

:wait_boot
for /f "delims=" %%i in ('adb shell getprop sys.boot_completed 2^>nul ^| findstr /r "^1$"') do set BOOTED=1
if not defined BOOTED (
    timeout /t 2 /nobreak >nul
    goto wait_boot
)
echo [ok] Emulator booted.

:: --- 5. Mode: fast or full? ---
:check_mode
if "%1"=="build" goto :build
if "%1"=="--build" goto :build

echo.
echo   Mode: FAST (Metro only - no Gradle build)
echo   Usage: start.bat build  -- for full rebuild when native code changed
echo.
echo [>>] Starting Metro bundler...
npx expo start --dev-client
goto :end

:build
echo.
echo   Mode: BUILD (Gradle + install + Metro)
echo.
echo [>>] Building and installing...
npx expo run:android

:end
pause
