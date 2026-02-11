import type { Translations } from './en';

const ko: Translations = {
  // Common
  cancel: '취소',
  save: '저장',
  delete: '삭제',
  confirm: '확인',
  add: '추가',
  ok: '확인',

  // Date / locale
  dateLocale: 'ko-KR',

  // Default data
  defaultCategory: '일상',
  defaultCategories: ['개인', '업무'],

  // Decision Modes
  decisionModes: {
    choose_best: 'A or B or C',
    do_or_not: 'Do or Not',
    no_clear_options: '선택지 불분명',
  },

  // Importance Levels
  importanceLevels: {
    TRIVIAL: '사소함',
    LOW: '낮음',
    MEDIUM: '보통',
    HIGH: '높음',
    CRITICAL: '매우 중요',
  },

  // Dashboard
  all: '전체',
  overdue: '기한 지남',
  active: '진행 중',
  resolved: '완료',
  pendingDecision: '새 결정 추가',
  noActiveDecisions: '진행 중인 결정이 없습니다.',
  tapToAdd: '+ 를 눌러 추가하세요.',
  manageCategoriesTitle: '카테고리 관리',

  // Decision Detail - Title
  titlePlaceholder: '지금 무엇이 머릿속을 복잡하게\n하고 있나요?',
  untitled: '[제목 없음]',

  // Framing Questions
  framingWhatHappened: '결정맥락',
  framingUltimateGoal: '궁극적 목적',
  framingConstraints: '외부 제약',
  framingDealbreakers: '나만의 필수 조건',
  framingKeyFactors: '핵심 판단 기준',
  framingWhatHappenedPlaceholder: '이 결정을 고민하게 된 상황...',
  framingGoalPlaceholder: '이 결정을 통해 궁극적으로 얻고자 하는 것...',
  framingConstraintsPlaceholder: '바꿀 수 없는 외부 조건...',
  framingDealbreakersPlaceholder: '절대 포기할 수 없는 것...',
  framingKeyFactorsPlaceholder: '선택지를 비교할 기준...',

  // Options
  addOption: '선택지 추가',
  option: '선택지',
  doOption: '한다',
  doNotOption: '안 한다',

  // Option Memo
  whyShouldIDo: '왜 해야 할까?',
  whyShouldntIDo: '왜 안 해야 할까?',
  pros: '장점',
  cons: '단점',
  prosPlaceholder: '이 선택지의 좋은 점...',
  consPlaceholder: '이 선택지의 아쉬운 점...',
  switchToFreeFormMemo: '자유 메모로 전환',
  addNotesPlaceholder: '이 선택지에 대한 메모...',
  addProsCons: '장단점 추가',

  // Comparison Matrix
  compareOptions: '선택지 비교',
  comparisonMatrix: '비교 매트릭스',
  optionsHeader: '선택지',
  criteria: '기준',
  addCriteria: '기준 추가',

  // Actions
  reopen: '다시 고민하기',
  randomPickTooltip: '큰 차이가 없다면, 고민을 멈추세요',

  // Settings
  importance: '중요도',
  timeBudget: '시간 예산',
  completed: '완료',
  left: '남음',
  minute: '분',
  hour: '시간',
  day: '일',
  days: '일',

  // Decision Chunking
  decisionChunking: '결정 쪼개기',
  chunkingOptional: '(선택사항)',
  chunkingInfoTitle: '복잡한 결정을 더 작은 결정들로 쪼개보세요.',
  chunkingMore: '...더보기',
  chunkingInfoDesc1Before: '때때로 결정이 막막하게 느껴지는 이유는, 하나의 의사결정 안에',
  chunkingInfoDesc1BeforeBreak: ' ',
  chunkingInfoDesc1Bold: '먼저 해결해야 할 결정들이 ',
  chunkingInfoDesc1After: '겹겹이 쌓여 있기 때문일 수 있습니다.',
  chunkingInfoDesc2Before: '하나의 문제로 대하는 대신, 작은 결정들로 쪼개어',
  chunkingInfoDesc2After: ' 하나씩 판단해보세요.',
  addSubDecision: '하위 결정 추가',
  resolvedText: '완료',

  // Leave Warning
  decisionTitleRequired: '제목은 필수입니다',
  leaveWithoutSaving: '저장하지 않고 나가시겠습니까?',
  leave: '나가기',
  confirmDeleteDecision: '이 결정을 삭제하시겠습니까?',

  // Link Modal
  editLink: '링크 수정',
  addLink: '링크 추가',
  url: 'URL',
  loadingPreview: '미리보기 로딩 중...',
  titleOptional: '제목 (선택사항)',
  customTitle: '사용자 지정 제목',
  editPreview: '미리보기 수정',

  // Time Budget Modal
  deadline: '마감일',
  time: '시간',
  setTime: '시간 설정',
  done: '완료',
  dayLabel: '일',
  hourLabel: '시',
  minuteLabel: '분',
  hourHourLabel: '시',
  minuteMinuteLabel: '분',
  weekDays: ['일', '월', '화', '수', '목', '금', '토'],
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],

  // Category Management
  categoryAlreadyExists: '이미 존재하는 카테고리명입니다.',
  needAtLeastOneCategory: '최소 1개의 카테고리가 필요합니다.',
  cannotDelete: '삭제할 수 없습니다',
  categoryInUse: (category: string, count: number) =>
    `"${category}" 카테고리를 사용하는 ${count}개의 사안이 있습니다.`,
  newCategory: '새 카테고리',

  // DecisionCard
  untitledCard: '(제목 없음)',
  untitledOption: '(옵션)',

  // Type Selection Sheet
  chooseDecisionType: '결정 유형 선택',
  typeDescDoOrNot: '할지/말지 결정',
  typeDescChooseBest: '여러 옵션 중 선택',
  typeDescNoClear: '먼저 탐색 필요',
  typeSelectionOr: '또는',

  // Quick Decision Sheet
  quickExpandTooltip: '전체 작성 화면으로 전환',
};

export default ko;
