@echo off
cd /d "%~dp0.."
echo Generating M3U playlist...
node scripts/generate-m3u-playlist.js
if %errorlevel% neq 0 (
    echo Error generating playlist.
    pause
    exit /b 1
)
echo Done! Playlist regenerated.
pause
