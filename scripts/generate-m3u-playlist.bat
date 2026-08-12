@echo off
cd /d "%~dp0.."

set "NODE_EXE="
where node >nul 2>&1
if not errorlevel 1 set "NODE_EXE=node"

if not defined NODE_EXE (
    for %%P in (
        "%ProgramFiles%\Node.js\node.exe"
        "%ProgramFiles(x86)%\Node.js\node.exe"
        "%LOCALAPPDATA%\Programs\Node.js\node.exe"
    ) do if exist %%P set "NODE_EXE=%%P"
)

if not defined NODE_EXE (
    for /f "delims=" %%P in ('where /r "%ProgramFiles%" node.exe 2^>nul') do (
        set "NODE_EXE=%%P"
        goto :run
    )
)

if not defined NODE_EXE (
    echo Node.js not found. Install it from https://nodejs.org and add to PATH.
    pause
    exit /b 1
)

:run
echo Generating M3U playlist...
"%NODE_EXE%" scripts/generate-m3u-playlist.js
if errorlevel 1 (
    echo Error generating playlist.
    pause
    exit /b 1
)
echo Done! Playlist regenerated.
pause
