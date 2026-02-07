#!/bin/bash

# 자동 커밋 스크립트
# 변경사항이 있으면 자동으로 커밋

cd "$(dirname "$0")"

# 변경사항이 있는지 확인
if [ -n "$(git status --porcelain)" ]; then
    # 변경사항을 add
    git add -A
    
    # 커밋 메시지 생성 (변경된 파일 목록 기반)
    CHANGED_FILES=$(git diff --cached --name-only | head -5 | tr '\n' ',' | sed 's/,$//')
    COMMIT_MSG="chore: 자동 커밋 - 변경된 파일: ${CHANGED_FILES}"
    
    # 커밋
    git commit -m "$COMMIT_MSG" || true
    
    echo "자동 커밋 완료: $COMMIT_MSG"
else
    echo "변경사항 없음"
fi
