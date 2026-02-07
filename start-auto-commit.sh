#!/bin/bash

# 자동 커밋 시스템 시작 스크립트
# 이 스크립트를 실행하면 파일 변경을 감지하여 자동으로 커밋합니다

cd "$(dirname "$0")"

# 이미 실행 중인지 확인
if pgrep -f "watch-and-commit.sh" > /dev/null; then
    echo "⚠️  자동 커밋 시스템이 이미 실행 중입니다."
    echo "중지하려면: ./stop-auto-commit.sh"
    exit 1
fi

# 백그라운드에서 실행
nohup ./watch-and-commit.sh > auto-commit.log 2>&1 &

# PID 저장
echo $! > .auto-commit.pid

echo "✅ 자동 커밋 시스템이 시작되었습니다!"
echo "📝 로그 확인: tail -f auto-commit.log"
echo "🛑 중지: ./stop-auto-commit.sh"
