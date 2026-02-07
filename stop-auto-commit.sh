#!/bin/bash

# 자동 커밋 시스템 중지 스크립트

cd "$(dirname "$0")"

# 실행 중인 프로세스 종료
if pgrep -f "watch-and-commit.sh" > /dev/null; then
    pkill -f "watch-and-commit.sh"
    echo "✅ 자동 커밋 시스템이 중지되었습니다."
    
    # PID 파일 삭제
    [ -f .auto-commit.pid ] && rm .auto-commit.pid
else
    echo "ℹ️  자동 커밋 시스템이 실행 중이 아닙니다."
fi
