# TRIM - Phase 1 개발 명세서

## 프로젝트 개요

**앱 이름:** TRIM (또는 TR!M)

**핵심 가치:** 사람들이 의사결정을 "끝낼 수 있게" 만드는 도구

**목적:** 
- 결정 피로를 줄이고
- 선택지를 체계적으로 정리하며
- 적절한 시간과 에너지로 결정을 완료하게 돕는다

---

## 기술 스택

### 프론트엔드
- **React** (함수형 컴포넌트 + Hooks)
- **Tailwind CSS** (스타일링)
- **Lucide React** (아이콘)
- **react-beautiful-dnd** 또는 **@dnd-kit** (Drag & Drop)

### 데이터 저장
- **Local Storage** (Phase 1에서는 백엔드 없음)
- JSON 형태로 저장

### 반응형
- 모바일 우선 설계
- 데스크톱 지원 (max-width 제한 + 가운데 정렬)

---

## 디자인 시스템

### 색상 팔레트 (Pantone 2026 기반)

```javascript
const colors = {
  cloudDancer: '#F5F5F5',    // 베이스 배경
  stretchLimo: '#1A1A1A',    // 주요 텍스트
  micron: '#6B6B6B',         // 보조 텍스트
  scarletSmile: '#E63946',   // 경고/강조
  white: '#FFFFFF',
};
```

### 타이포그래피
- **헤더 (TRIM 로고):** 
  - Font-size: 36px
  - Font-weight: Bold
  - Color: stretchLimo
  
- **섹션 제목 (ACTIVE, OVERDUE, etc):**
  - Font-size: 18px
  - Font-weight: Bold
  - Color: stretchLimo (Overdue는 scarletSmile)

- **본문:**
  - Font-size: 16px
  - Font-weight: Regular
  - Color: stretchLimo

- **보조 텍스트:**
  - Font-size: 14px
  - Color: micron

### 레이아웃
- 최대 너비: 640px (Tailwind의 max-w-2xl)
- 패딩: 16px (px-4)
- 카드 간격: 12px (space-y-3)

---

## 데이터 구조

### Decision (사안)

```typescript
interface Decision {
  id: string;                    // 고유 ID (Date.now().toString())
  title: string;                 // 사안 제목
  category: 'Life' | 'Work';     // 카테고리 (고정)
  importance: ImportanceLevel;   // 중요도
  timeBudget: number;            // 시간 예산 (분 단위)
  deadline: string;              // 마감 시각 (ISO 8601)
  createdAt: string;             // 생성 시각 (ISO 8601)
  resolvedAt?: string;           // 완료 시각 (ISO 8601, 선택)
  resolved: boolean;             // 완료 여부
  options: Option[];             // 선택지 배열
  memo?: string;                 // 사안 메모
  framing?: DecisionFraming;     // Decision Framing 답변
}

type ImportanceLevel = 'TRIVIAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface Option {
  id: string;                    // 고유 ID
  title: string;                 // 선택지 제목
  isSelected: boolean;           // Random Pick으로 선택됨
  memo?: string;                 // 선택지 메모
}

interface DecisionFraming {
  whatHappened?: string;         // 상황
  goal?: string;                 // 목표
  constraints?: string;          // 제약사항
  dealbreakers?: string;         // 거부 조건
  keyFactors?: string;           // 판단 기준
}
```

### Importance 레벨 설정

```javascript
const IMPORTANCE_LEVELS = {
  TRIVIAL: { label: 'Trivial', minutes: 10 },
  LOW: { label: 'Low', minutes: 60 },
  MEDIUM: { label: 'Medium', minutes: 1440 },  // 24시간
  HIGH: { label: 'High', minutes: 4320 },      // 72시간
  CRITICAL: { label: 'Critical', minutes: 10080 }, // 1주일
};
```

### Local Storage Keys

```javascript
'trim-decisions'  // Decision 배열 저장
```

---

## 핵심 기능 명세

### 1. Dashboard (메인 화면)

#### 레이아웃

```
┌─────────────────────────────────────┐
│             TRIM                    │  ← 헤더
├─────────────────────────────────────┤
│ [All] [Life] [Work]                 │  ← 카테고리 필터
├─────────────────────────────────────┤
│                                     │
│ OVERDUE                      3 >    │  ← 접힌 상태
│                                     │
│ ACTIVE                       7 ∨    │  ← 펼쳐진 상태
│ ┌─────────────────────────────┐   │
│ │ [+] Pending Decision        │   │  ← 새 사안 생성 버튼
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │
│ │ 노트북 구매                  │   │  ← 사안 카드
│ │ Medium · 18시간 남음         │   │
│ │ ○ 맥북 프로                  │   │
│ │ ○ 맥북 에어                  │   │
│ └─────────────────────────────┘   │
│                                     │
│ RESOLVED                     6 >    │  ← 접힌 상태
└─────────────────────────────────────┘
```

#### 기능

**카테고리 필터:**
- All / Life / Work 토글 버튼
- 선택된 카테고리만 필터링
- 기본값: All

**섹션 구조:**
- **OVERDUE:** 기본 접힘 (>), 클릭 시 펼침 (∨)
- **ACTIVE:** 기본 펼침 (∨), 클릭 시 접힘 (>)
- **RESOLVED:** 기본 접힘 (>), 클릭 시 펼침 (∨)

**상태 계산:**
```javascript
function getStatus(deadline, resolved) {
  if (resolved) return 'resolved';
  if (new Date(deadline) < new Date()) return 'overdue';
  return 'active';
}
```

**사안 카드:**
- 제목 (없으면 "(제목 없음)")
- Importance 레벨
- 남은 시간 (또는 초과 시간)
  - Overdue인 경우 빨간색 표시
- 옵션 미리보기 (최대 2개, 나머지는 "+N more")

**Pending Decision 버튼:**
- Active 섹션 맨 위에 고정
- 클릭 시 새 사안 생성 → 사안 상세 화면으로 이동
- 기본값: category = Life, importance = MEDIUM

**시간 포맷:**
```javascript
function formatTimeRemaining(deadline) {
  const now = new Date();
  const diff = new Date(deadline) - now;
  
  if (diff < 0) {
    // 초과
    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}일 초과`;
    if (hours > 0) return `${hours}시간 초과`;
    return `${minutes}분 초과`;
  }
  
  // 남음
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}
```

**삭제 기능:**
- 모바일: 좌측 스와이프 → 🗑️ 아이콘 노출
- 데스크톱: Hover 시 우측에 🗑️ 버튼 표시
- 클릭 시 확인 없이 즉시 삭제

**Drag & Drop:**
- Active와 Overdue 섹션 내에서만 가능
- Resolved는 순서 변경 불가 (최신순 고정)
- 드래그 시 시각적 피드백 (투명도, 그림자)
- 라이브러리: react-beautiful-dnd 또는 @dnd-kit 사용

---

### 2. 사안 상세 화면 (Decision Detail)

#### 레이아웃

```
┌─────────────────────────────────────┐
│ ←  Life ∨                      ···  │  ← 헤더
├─────────────────────────────────────┤
│                                     │
│ What's cluttering your mind?        │  ← 제목 입력
│ 📝 💬                               │  ← 사안 메모 아이콘
│                                     │
│ ○ Do                           📝💬 │  ← 옵션 1
│ ○ Do Not                       📝💬 │  ← 옵션 2
│ + Add Option                        │
│                                     │
│ ┌─────────────────────────────┐   │
│ │         TRIM                │   │  ← 완료 버튼
│ └─────────────────────────────┘   │
│                                     │
│ ╔═════════════════════════════╗   │
│ ║ 🎲 Random Pick              ║   │  ← 기능 버튼들
│ ║ 👥 Post for Help            ║   │  (Phase 2)
│ ╚═════════════════════════════╝   │
├─────────────────────────────────────┤
│ ⓘ Importance            Medium ∨   │  ← Importance 설정
│ ⏱ Time Budget           24 hours > │  ← Time Budget 설정
├─────────────────────────────────────┤
│ Decision Framing               ∨   │  ← 접기/펼치기
└─────────────────────────────────────┘
```

#### 헤더

**좌측: 뒤로 가기 버튼**
- 클릭 시 Dashboard로 이동
- 변경사항 자동 저장 (Local Storage)

**중앙: 카테고리 선택**
- 드롭다운: Life / Work
- 선택 즉시 반영

**우측: 케밥 메뉴 (···)**
- Delete (사안 삭제)
- Phase 2: Add as Sub-Decision, Connect to Parent

#### 사안 제목 & 메모

**제목 입력:**
- placeholder: "What's cluttering your mind?"
- 자동 저장 (debounce 500ms)

**메모 아이콘 (📝):**
- 클릭 시 제목 바로 아래 텍스트 영역 펼침
- 다시 클릭하면 접힘

#### 옵션 리스트

**각 옵션:**
- 라디오 버튼 (○) 또는 체크박스
- 제목 입력 (인라인 편집)
- 우측: 메모 아이콘 (📝)
  - 클릭 시 옵션 바로 아래 메모 입력창 펼침

**+ Add Option:**
- 클릭 시 새 옵션 추가
- 자동으로 포커스 이동

**삭제:**
- 옵션 스와이프 또는 Hover로 삭제 버튼

#### TRIM 버튼

**위치:** 옵션 리스트 바로 아래, 큰 버튼
**동작:**
1. 현재 선택된 옵션 저장 (isSelected = true)
2. decision.resolved = true
3. decision.resolvedAt = 현재 시각
4. Dashboard로 이동
5. 해당 사안이 Resolved 섹션으로 이동

#### Random Pick 버튼

**위치:** TRIM 버튼 아래
**동작:**
1. 옵션 중 랜덤으로 1개 선택
2. 해당 옵션에 시각적 강조 (음영 또는 체크)
3. isSelected = true 설정
4. 사용자는 TRIM 버튼을 눌러 최종 확정

#### Importance 설정

**표시:**
- 아이콘 + "Importance" 레이블
- 현재 레벨 표시 (예: Medium)
- 우측에 ∨ 아이콘

**동작:**
- 클릭 시 인라인 드롭다운 펼침
- 5개 레벨 선택: Trivial / Low / Medium / High / Critical
- 선택 즉시:
  1. Importance 업데이트
  2. Time Budget 자동 재계산
  3. Deadline 자동 재계산
  4. 기존 수동 조정값 덮어씀

#### Time Budget 설정

**표시:**
- 아이콘 + "Time Budget" 레이블
- 남은 시간 표시 (예: 24 hours)
- 우측에 > 아이콘

**동작:**
- 클릭 시 Bottom Sheet 팝업 (다음 섹션 참조)

---

### 3. Time Budget 설정 Bottom Sheet

#### 레이아웃

```
┌─────────────────────────────────────┐
│                              [X]    │
├─────────────────────────────────────┤
│                                     │
│  Time Budget                        │
│  ┌─────────────────────────────┐   │
│  │      D      H      M        │   │
│  │     ──     ──     ──        │   │
│  │      1      0     21        │   │  ← 스크롤 휠 (항상 노출)
│  │     ──     ──     ──        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Deadline                           │
│  ┌─────────────────────────────┐   │
│  │   Jan, 2026          >      │   │
│  │                             │   │
│  │   [달력]                    │   │
│  │   19일 선택됨               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Time                15:27      >   │  ← 클릭 시 작은 팝업
│                                     │
│  [Confirm]                          │
└─────────────────────────────────────┘
```

#### Time Budget (상단)

**스크롤 휠:**
- D (일), H (시간), M (분) 각각 독립적으로 스크롤
- 범위:
  - D: 0 ~ 30
  - H: 0 ~ 23
  - M: 0 ~ 59
- 조작 시 즉시 Deadline 자동 계산

**자동 계산 로직:**
```javascript
// Time Budget → Deadline
const totalMinutes = days * 1440 + hours * 60 + minutes;
const newDeadline = new Date(Date.now() + totalMinutes * 60 * 1000);
```

#### Deadline (하단)

**달력:**
- 월 선택 (< Jan, 2026 >)
- 날짜 그리드
- 선택된 날짜 강조 (파란색 원)

**시각 선택 (Time):**
- 현재 시각 표시 (예: 15:27)
- 우측 > 아이콘
- 클릭 시 작은 팝업:

```
┌───────────────────┐
│   Set Time   [X]  │
├───────────────────┤
│                   │
│   HH  :  MM       │
│   ──     ──       │
│   15     27       │  ← 스크롤 휠
│   ──     ──       │
│                   │
│   [Done]          │
└───────────────────┘
```

**자동 계산 로직:**
```javascript
// Deadline → Time Budget
const diff = new Date(deadline) - new Date();
const totalMinutes = Math.floor(diff / (1000 * 60));
const days = Math.floor(totalMinutes / 1440);
const hours = Math.floor((totalMinutes % 1440) / 60);
const minutes = totalMinutes % 60;
```

#### Confirm 버튼

- 클릭 시:
  1. decision.timeBudget 업데이트
  2. decision.deadline 업데이트
  3. Local Storage 저장
  4. Bottom Sheet 닫기

---

### 4. Decision Framing

#### 레이아웃

```
┌─────────────────────────────────────┐
│ Decision Framing               ∨   │  ← 클릭 시 펼침/접힘
├─────────────────────────────────────┤
│                                     │
│ What happened?                      │
│ ┌─────────────────────────────┐   │
│ │ (텍스트 입력)                │   │
│ └─────────────────────────────┘   │
│                                     │
│ What am I trying to achieve?        │
│ ┌─────────────────────────────┐   │
│ │ (텍스트 입력)                │   │
│ └─────────────────────────────┘   │
│                                     │
│ Fixed constraints?                  │
│ ┌─────────────────────────────┐   │
│ │ (텍스트 입력)                │   │
│ └─────────────────────────────┘   │
│                                     │
│ Deal-breakers?                      │
│ ┌─────────────────────────────┐   │
│ │ (텍스트 입력)                │   │
│ └─────────────────────────────┘   │
│                                     │
│ Key factors?                        │
│ ┌─────────────────────────────┐   │
│ │ (텍스트 입력)                │   │
│ └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

#### 기능

**5개 고정 질문:**
1. What happened? (상황)
2. What am I trying to achieve? (목표)
3. Fixed constraints? (제약사항)
4. Deal-breakers? (거부 조건)
5. Key factors? (판단 기준)

**작성:**
- 모두 선택사항 (안 써도 됨)
- 각 질문 아래 텍스트 영역
- 자동 저장 (debounce 500ms)
- decision.framing 객체에 저장

**접기/펼치기:**
- 기본값: 접힌 상태
- 헤더 클릭 시 토글

---

## 상태 관리

### Local Storage 구조

```javascript
// 저장
localStorage.setItem('trim-decisions', JSON.stringify(decisions));

// 불러오기
const saved = localStorage.getItem('trim-decisions');
const decisions = saved ? JSON.parse(saved) : [];
```

### React State

```javascript
const [decisions, setDecisions] = useState([]);
const [selectedCategory, setSelectedCategory] = useState('All');
const [expandedSections, setExpandedSections] = useState({
  overdue: false,
  active: true,
  resolved: false,
});
```

### 자동 저장

- 모든 변경사항은 즉시 Local Storage에 저장
- useEffect 사용:

```javascript
useEffect(() => {
  localStorage.setItem('trim-decisions', JSON.stringify(decisions));
}, [decisions]);
```

---

## 상호작용 플로우

### 1. 새 사안 생성

```
Dashboard → Pending Decision 클릭
→ 새 Decision 객체 생성
→ 사안 상세 화면으로 이동
→ 제목 입력
→ 옵션 추가
→ Importance/Time Budget 설정
→ TRIM 버튼 클릭
→ Resolved로 이동
→ Dashboard로 복귀
```

### 2. Random Pick

```
사안 상세 화면
→ 옵션 2개 이상 존재
→ Random Pick 버튼 클릭
→ Math.random()으로 1개 선택
→ 선택된 옵션 시각적 강조
→ isSelected = true
→ 사용자가 TRIM 버튼 클릭
→ 완료 처리
```

### 3. Importance 변경 시 자동 계산

```
사안 상세 화면
→ Importance 드롭다운 클릭
→ 'High' 선택
→ timeBudget = 4320 (72시간)
→ deadline = 현재 시각 + 72시간
→ 화면 업데이트
→ Local Storage 저장
```

### 4. Time Budget 수동 조정

```
사안 상세 화면
→ Time Budget 클릭
→ Bottom Sheet 팝업
→ 스크롤 휠로 2일 3시간 설정
→ deadline 자동 계산
→ Confirm 클릭
→ decision.timeBudget, deadline 업데이트
→ Bottom Sheet 닫기
```

---

## Drag & Drop 구현

### 라이브러리 선택

**추천: @dnd-kit/core + @dnd-kit/sortable**
- react-beautiful-dnd보다 가볍고 유지보수 활발
- 터치 지원 우수

### 구현 범위

**가능한 영역:**
- Active 섹션 내
- Overdue 섹션 내

**불가능한 영역:**
- Resolved 섹션 (최신순 고정)
- 섹션 간 이동 (Active → Overdue 같은 건 불가)

### 시각적 피드백

**드래그 중:**
- 드래그되는 카드: 투명도 50%, 그림자 증가
- 드롭 위치: 파란색 선 표시

**드롭 후:**
- 부드러운 애니메이션으로 재정렬
- 새 순서를 Local Storage에 저장

### 순서 저장

```javascript
// Decision 객체에 order 필드 추가
interface Decision {
  // ... 기존 필드
  order: number;  // 순서 (낮을수록 위)
}

// 정렬 시
decisions.sort((a, b) => a.order - b.order);
```

---

## 반응형 디자인

### 모바일 (< 640px)

- 최대 너비 없음 (화면 전체 사용)
- 터치 제스처:
  - 좌측 스와이프: 삭제
  - 롱 프레스: Drag & Drop
- Bottom Sheet: 화면 하단에서 올라옴

### 데스크톱 (≥ 640px)

- 최대 너비: 640px
- 가운데 정렬
- Hover 인터랙션:
  - 사안 카드 Hover → 삭제 버튼 표시
  - 버튼 Hover → 배경색 변경
- Bottom Sheet: 모달 형태 (중앙 팝업)

---

## 에러 처리

### Local Storage 실패

```javascript
try {
  localStorage.setItem('trim-decisions', JSON.stringify(decisions));
} catch (error) {
  console.error('Failed to save:', error);
  // 사용자에게 알림 (Toast 또는 Alert)
  alert('저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
}
```

### 잘못된 데이터

```javascript
// 불러올 때 검증
const saved = localStorage.getItem('trim-decisions');
let decisions = [];

try {
  const parsed = JSON.parse(saved);
  if (Array.isArray(parsed)) {
    decisions = parsed;
  }
} catch (error) {
  console.error('Invalid data:', error);
  decisions = [];
}
```

---

## 접근성 (Accessibility)

### 키보드 네비게이션

- Tab: 포커스 이동
- Enter: 버튼 클릭
- Escape: 팝업/Bottom Sheet 닫기
- Arrow Keys: 드롭다운 선택

### ARIA 속성

```jsx
<button
  aria-label="Delete decision"
  onClick={handleDelete}
>
  <Trash2 />
</button>

<section
  aria-expanded={expandedSections.active}
  aria-labelledby="active-section"
>
  <h2 id="active-section">ACTIVE</h2>
  {/* 내용 */}
</section>
```

### 색상 대비

- 모든 텍스트는 WCAG AA 기준 충족 (4.5:1 이상)
- 빨간색 경고는 텍스트로도 명확히 표시 ("초과")

---

## 테스트 체크리스트

### 기능 테스트

- [ ] 사안 생성/수정/삭제
- [ ] 옵션 추가/수정/삭제
- [ ] Importance 변경 시 Time Budget 자동 계산
- [ ] Time Budget 수동 조정 시 Deadline 자동 계산
- [ ] Deadline 조정 시 Time Budget 자동 계산
- [ ] Random Pick 동작
- [ ] TRIM 버튼으로 완료 처리
- [ ] Overdue 자동 감지
- [ ] 섹션 접기/펼치기
- [ ] 카테고리 필터링
- [ ] Drag & Drop 순서 변경
- [ ] Decision Framing 저장

### UI/UX 테스트

- [ ] 모바일 반응형 (320px ~ 640px)
- [ ] 데스크톱 레이아웃 (> 640px)
- [ ] 터치 제스처 (스와이프, 롱 프레스)
- [ ] Hover 효과
- [ ] 애니메이션 부드러움
- [ ] 로딩 없이 즉시 반응

### 데이터 무결성

- [ ] Local Storage 저장/불러오기
- [ ] 새로고침 후 데이터 유지
- [ ] 브라우저 종료 후 데이터 유지
- [ ] 잘못된 데이터 처리

---

## Phase 2 예고

**다음 버전에 추가될 기능:**
- Decision Chunking (부모-자식 연결)
- 첨부파일 (링크, 사진)
- 카테고리 커스터마이징
- Sort by Deadline 모드
- Decision Navigator (AI 진단/조언)
- Comparison Matrix
- Public Feed (투표 커뮤니티)

---

## 참고 사항

### 개발 우선순위

1. **핵심 CRUD** (사안/옵션 생성/수정/삭제)
2. **상태 관리** (Active/Overdue/Resolved)
3. **Time Budget 설정**
4. **Random Pick**
5. **Decision Framing**
6. **Drag & Drop**
7. **폴리싱** (애니메이션, 반응형)

### 예상 개발 기간

- 1-2주: 핵심 기능
- 3-4일: Drag & Drop
- 3-4일: 폴리싱 + 버그 수정

**총: 2-3주**

---

## 문의 사항

궁금한 점이나 애매한 부분이 있으면:
1. 이 명세서 기준으로 판단
2. 미니멀하고 단순한 쪽으로 구현
3. 모바일 우선 고려

**목표: 사용자가 "결정을 끝낼 수 있게" 만드는 것**
