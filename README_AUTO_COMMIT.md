# 자동 커밋 설정 가이드

이 프로젝트는 Git hook과 파일 감시 스크립트를 사용하여 변경사항을 자동으로 커밋합니다.

## 설정된 기능

### 1. Pre-commit Hook
- 위치: `.git/hooks/pre-commit`
- 기능: 커밋 전에 변경된 파일들을 자동으로 add합니다.

### 2. 자동 커밋 스크립트
- `auto-commit.sh`: 수동으로 실행하여 현재 변경사항을 커밋합니다.
- `watch-and-commit.sh`: 파일 변경을 감지하여 자동으로 커밋합니다.
- `start-auto-commit.sh`: 자동 커밋 시스템을 백그라운드에서 시작합니다. (권장)
- `stop-auto-commit.sh`: 자동 커밋 시스템을 중지합니다.

## 사용 방법

### 방법 1: 자동 커밋 시스템 시작 (가장 권장) ⭐
프로젝트 루트에서 다음 명령어를 실행하세요:

```bash
./start-auto-commit.sh
```

이 명령어는 백그라운드에서 자동 커밋 시스템을 시작합니다. 파일을 저장할 때마다 자동으로 커밋됩니다.

중지하려면:
```bash
./stop-auto-commit.sh
```

### 방법 2: 파일 감시 스크립트 직접 실행
백그라운드에서 파일 변경을 감지하고 자동으로 커밋합니다:

```bash
./watch-and-commit.sh
```

백그라운드에서 실행하려면:
```bash
./watch-and-commit.sh &
```

중지하려면:
```bash
pkill -f watch-and-commit.sh
```

### 방법 2: 수동 커밋
변경사항이 있을 때 수동으로 커밋하려면:

```bash
./auto-commit.sh
```

### 방법 3: 일반 Git 커밋
일반적인 git 커밋을 사용할 수도 있습니다. pre-commit hook이 자동으로 변경사항을 add합니다:

```bash
git commit -m "커밋 메시지"
```

## 주의사항

- 파일 감시 스크립트는 3초마다 변경사항을 확인합니다.
- 마지막 커밋 후 5초 이상 지나야 새로운 커밋이 생성됩니다 (너무 빈번한 커밋 방지).
- `.gitignore`에 포함된 파일은 자동으로 커밋되지 않습니다.

## 원격 저장소에 푸시

자동 커밋된 내용을 원격 저장소에 푸시하려면:

```bash
git push
```

원격 저장소가 설정되어 있지 않다면:

```bash
git remote add origin <저장소_URL>
git push -u origin main
```
