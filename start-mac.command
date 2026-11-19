#!/bin/bash
# 더블클릭하면 앤도버 생활기록이 켜져요 (macOS)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js 가 설치돼 있지 않아요."
  echo "  https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
  open "https://nodejs.org/ko/download"
  read -n 1 -s -r -p "  아무 키나 누르면 닫혀요"
  exit 1
fi
node server.js
