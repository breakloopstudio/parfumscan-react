@echo off
set ANDROID_HOME=C:\Users\Pierre-Louis\AppData\Local\Android\Sdk
echo [%date% %time%] BUILD START > C:\dev\ParfumScan_react\build_release.log
C:\dev\ParfumScan_react\android\gradlew.bat -p C:\dev\ParfumScan_react\android assembleRelease >> C:\dev\ParfumScan_react\build_release.log 2>&1
echo [%date% %time%] BUILD END >> C:\dev\ParfumScan_react\build_release.log
echo.
echo BUILD TERMINE - Voir build_release.log
pause
