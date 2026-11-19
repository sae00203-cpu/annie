@echo off
chcp 65001 > nul
title 앤도버 생활기록
cd /d "%~dp0"
where node > nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js 가 설치돼 있지 않아요.
  echo  https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요.
  echo.
  start "" "https://nodejs.org/ko/download"
  pause
  exit /b 1
)
node server.js
pause
