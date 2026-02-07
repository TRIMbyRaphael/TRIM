#!/bin/bash

# 파일 변경 감지 및 자동 커밋 스크립트
# 이 스크립트를 백그라운드에서 실행하면 파일 변경 시 자동으로 커밋됩니다

cd "$(dirname "$0")"

echo "파일 변경 감지 시작... (Ctrl+C로 중지)"

# 마지막 커밋 시간 추적
LAST_COMMIT_TIME=$(git log -1 --format=%ct 2>/dev/null || echo 0)

while true; do
    # 변경사항이 있는지 확인
    if [ -n "$(git status --porcelain)" ]; then
        # 마지막 커밋 후 5초 이상 지났는지 확인 (너무 빈번한 커밋 방지)
        CURRENT_TIME=$(date +%s)
        TIME_DIFF=$((CURRENT_TIME - LAST_COMMIT_TIME))
        
        if [ $TIME_DIFF -ge 5 ]; then
            # 변경사항을 add
            git add -A
            
            # 커밋 메시지 생성
            CHANGED_FILES=$(git diff --cached --name-only | head -5 | tr '\n' ',' | sed 's/,$//')
            COMMIT_MSG="chore: 자동 커밋 - $(date '+%Y-%m-%d %H:%M:%S') - ${CHANGED_FILES}"
            
            # 커밋
            if git commit -m "$COMMIT_MSG" 2>/dev/null; then
                LAST_COMMIT_TIME=$(date +%s)
                echo "[$(date '+%H:%M:%S')] 자동 커밋 완료: $COMMIT_MSG"
            fi
        fi
    fi
    
    # 3초마다 확인
    sleep 3
done
