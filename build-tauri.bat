@echo off
setlocal

call "F:\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
if errorlevel 1 exit /b %errorlevel%

set "RUSTUP_HOME=D:\rustup"
set "CARGO_HOME=D:\cargo"
set "PATH=D:\cargo\bin;%PATH%"

cd /d "%~dp0"

set "BUILD_SCRIPT=dist"
if /I "%~1"=="installer" set "BUILD_SCRIPT=dist:installer"

echo Running npm run %BUILD_SCRIPT%
call npm run %BUILD_SCRIPT%
exit /b %errorlevel%
