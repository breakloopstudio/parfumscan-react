@echo off
set ANDROID_HOME=C:\Users\Pierre-Louis\AppData\Local\Android\Sdk
echo [%date% %time%] BUILD RELEASE START > C:\dev\ParfumScan_react\build_log.txt
C:\dev\ParfumScan_react\android\gradlew.bat -p C:\dev\ParfumScan_react\android assembleRelease >> C:\dev\ParfumScan_react\build_log.txt 2>&1
echo [%date% %time%] BUILD RELEASE END >> C:\dev\ParfumScan_react\build_log.txt
echo BUILD DONE > C:\dev\ParfumScan_react\build_done.txt