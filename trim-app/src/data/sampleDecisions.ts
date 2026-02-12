import { Decision, IMPORTANCE_LEVELS } from '../types/decision';

/**
 * Sample decisions for new users.
 * Dynamically generates timestamps relative to current time.
 */

interface SampleData {
  decisions: Decision[];
}

function createKoreanSamples(now: Date): SampleData {
  const decisions: Decision[] = [
    // ─── Decision 1: 루틴 추가 (choose_best, MEDIUM) ───
    {
      id: 'example-1',
      title: '퇴근 후 루틴을 하나 추가해볼까?',
      category: '개인',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-1-opt-1',
          title: '헬스',
          isSelected: false,
          pros: '- 체력이 너무 부족하고 근육이 거의 없음\n- 나중에 후회하지 않으려면 지금 시작하는 게 맞는 것 같음',
          cons: '- 재미를 못 느껴서 오래 유지할 자신이 없음\n- 과거 경험상 결국 안 가게 될 가능성이 큼',
        },
        {
          id: 'example-1-opt-2',
          title: '필라테스',
          isSelected: false,
          pros: '- 수업 시간에 맞춰 가면 되니까 루틴을 유지하기는 더 쉬움\n- 체형 교정에는 확실히 도움이 됨',
          cons: '- 체력이나 근육이 눈에 띄게 늘지는 않는 느낌\n- 비용 대비 효과가 크지는 않다고 느낌',
        },
        {
          id: 'example-1-opt-3',
          title: '독서',
          isSelected: false,
          pros: '나이가 들수록 격차가 벌어질 수 있는 영역이라는 생각이 듦',
          cons: "- 결국 유튜브나 휴대폰을 더 보게 될 가능성이 큼\n- '언젠가 읽어야지' 하다 책만 쌓아둘 것 같음",
        },
        {
          id: 'example-1-opt-4',
          title: '영어 공부',
          isSelected: false,
          pros: '- 커리어적으로 직접적인 도움이 될 가능성이 큼\n- 커리어 선택지와 기회를 넓혀줄 수 있음',
          cons: '- 과거에 몇 번 시도했다가 흐지부지 됐음\n- 스스로 효과적인 방법을 찾기 어렵고, 다른 방법은 비용이 큼',
        },
      ],
      framing: {
        whatHappened: '취업 후 퇴근하면 지치고,\n아무 계획 없이 시간을 보내는 날이 많아졌다.\n체력은 떨어지고 살은 찌었고,\n오히려 아무것도 안 하는 게 더 힘들게 느껴진다.',
        goal: '억지 아닌, 오래 지속 가능한 루틴을 만들고 싶다.\n오늘의 활력과 성취감,\n미래의 성장까지 함께 가져가고 싶다.',
        keyFactors: '건강, 지속성, 비용',
      },
      keyFactors: [
        { id: 'example-1-kf-1', criteria: '건강', importance: 4 },
        { id: 'example-1-kf-2', criteria: '지속성', importance: 5 },
        { id: 'example-1-kf-3', criteria: '비용', importance: 2 },
      ],
      order: 0,
      mode: 'choose_best',
      isExample: true,
    },

    // ─── Decision 2: 설계 검증 (do_or_not, HIGH) ───
    {
      id: 'example-2',
      title: '[TRIM · PM 업무 결정] 중요도를 기준으로 결정에 쓸 시간을 제한하도록 한 현재 설계는 적절한가?',
      category: '업무',
      importance: 'HIGH',
      timeBudget: IMPORTANCE_LEVELS.HIGH.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.HIGH.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-opt-1',
          title: '한다',
          isSelected: false,
          cons: '획일적인 시간 배분이 모든 상황에 맞지 않을 수 있다.',
        },
        {
          id: 'example-2-opt-2',
          title: '안 한다',
          isSelected: false,
          pros: '유연한 사용이 가능하다.',
          cons: '사소한 결정에 과도한 시간을 소비할 위험이 있다.',
        },
      ],
      framing: {
        goal: '결정의 중요도를 넘는 결정 비용을 쓰지 않게 하고,\n동시에 결정을 미루지 않고 제때 끝내도록 돕는 구조를 만드는 것.',
      },
      keyFactors: [
        { id: 'example-2-kf-1', criteria: '결정 피로 감소 효과', importance: 5 },
        { id: 'example-2-kf-2', criteria: '사용자 체감 적절성', importance: 4 },
      ],
      order: 1,
      mode: 'do_or_not',
      isExample: true,
    },

    // ─── Decision 2 Sub: 권장 시간 체감 검증 (do_or_not, MEDIUM) ───
    {
      id: 'example-2-sub-1',
      title: '중요도별로 권장된 고민 시간은 체감상 맞는가?',
      category: '업무',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-sub-1-opt-1',
          title: '한다',
          isSelected: false,
        },
        {
          id: 'example-2-sub-1-opt-2',
          title: '안 한다',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: '사소함–10분 / 낮음–1시간 / 보통–24시간 / 높음–3일 / 매우 중요–7일\n의 결정 시간 예산을 설정해두었다.',
        goal: '중요도에 따라 자동으로 제시된 결정 시간이\n대부분의 상황에서 납득 가능하게 느껴지도록 하는 것.',
      },
      keyFactors: [
        { id: 'example-2-sub-1-kf-1', criteria: '각 레벨별 체감 시간', importance: 5 },
        { id: 'example-2-sub-1-kf-2', criteria: '실제 사용 패턴과의 일치도', importance: 4 },
      ],
      order: 0,
      parentId: 'example-2',
      mode: 'do_or_not',
      isExample: true,
    },

    // ─── Decision 3: 이사 (no_clear_options, CRITICAL) ───
    {
      id: 'example-3',
      title: '이사 어디로 가지?',
      category: '개인',
      importance: 'CRITICAL',
      timeBudget: IMPORTANCE_LEVELS.CRITICAL.minutes,
      // 6일 23시간 남음 (applyFirstViewDeadlines에서 firstView 기준으로 재계산됨)
      deadline: new Date(now.getTime() + (6 * 24 * 60 + 23 * 60) * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        { id: 'example-3-opt-1', title: '사당 A집', isSelected: false },
        { id: 'example-3-opt-2', title: '서울대입구역 B집', isSelected: false },
        { id: 'example-3-opt-3', title: '서울대입구역 C집', isSelected: false },
        { id: 'example-3-opt-4', title: '당사역 D집', isSelected: false },
      ],
      framing: {
        whatHappened: '- 이직해서 출근 시간이 너무 길어짐',
        goal: '- 이직한 회사 기준으로 통근 부담을 줄이면서,\n- 월세에서 전세로 바꿔 주거 비용 안정화',
        constraints: '전세자금대출 조건 충족\n- 임차보증금 2억원 이하\n- 전용면적 85㎡이하',
        dealbreakers: '- 환승 1번 이하\n- 통근 시간 2시간 이하\n- 월 지출 n원 이하',
        keyFactors: '월 지출 수준, 입주 가능 시점, 생활 인프라, 교통 편의성',
      },
      keyFactors: [
        { id: 'example-3-kf-1', criteria: '월 지출 수준', importance: 5 },
        { id: 'example-3-kf-2', criteria: '입주 가능 시점', importance: 4 },
        { id: 'example-3-kf-3', criteria: '생활 인프라', importance: 3 },
        { id: 'example-3-kf-4', criteria: '교통 편의성', importance: 5 },
      ],
      order: 2,
      mode: 'no_clear_options',
      isExample: true,
    },

    // ─── Decision 3 Sub 1: 후보 지역 (choose_best, MEDIUM) ───
    {
      id: 'example-3-sub-1',
      title: '어디 역쪽을 알아볼까?',
      category: '개인',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      // overdue by 23h (1380 min)
      deadline: new Date(now.getTime() - 1380 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - (IMPORTANCE_LEVELS.MEDIUM.minutes + 1380) * 60 * 1000).toISOString(),
      resolved: false,
      options: [
        { id: 'example-3-sub-1-opt-1', title: '사당역', isSelected: false },
        { id: 'example-3-sub-1-opt-2', title: '서울대입구역', isSelected: false },
        { id: 'example-3-sub-1-opt-3', title: '당산역', isSelected: false },
      ],
      framing: {},
      keyFactors: [
        { id: 'example-3-sub-1-kf-1', criteria: '교통 편의성', importance: 5 },
        { id: 'example-3-sub-1-kf-2', criteria: '생활 인프라', importance: 3 },
        { id: 'example-3-sub-1-kf-3', criteria: '가격 대비 주거 퀄리티', importance: 5 },
      ],
      order: 0,
      parentId: 'example-3',
      mode: 'choose_best',
      isExample: true,
    },

    // ─── Decision 3 Sub 1 Sub 1: 버스 탑승 가능 여부 (do_or_not, LOW) ───
    {
      id: 'example-3-sub-1-sub-1',
      title: '출근 시간에 당산역 정류장에서 199번 버스를 제때 탈 수 있는가?',
      category: '개인',
      importance: 'LOW',
      timeBudget: IMPORTANCE_LEVELS.LOW.minutes,
      // overdue by ~0m
      deadline: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - (IMPORTANCE_LEVELS.LOW.minutes + 1) * 60 * 1000).toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-sub-1-sub-1-opt-1',
          title: '한다',
          isSelected: false,
        },
        {
          id: 'example-3-sub-1-sub-1-opt-2',
          title: '안 한다',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: 'D집에서 직장까지 지하철만으로는 통근 시간이 길어지고, 199번 버스를 이용할 수 있어야 설정한 통근 시간 제약을 만족한다.',
      },
      keyFactors: [
        { id: 'example-3-sub-1-sub-1-kf-1', criteria: '배차 간격', importance: 5 },
        { id: 'example-3-sub-1-sub-1-kf-2', criteria: '출근 시간대 혼잡도', importance: 4 },
        { id: 'example-3-sub-1-sub-1-kf-3', criteria: '정류장까지 도보 거리', importance: 3 },
      ],
      order: 0,
      parentId: 'example-3-sub-1',
      mode: 'do_or_not',
      isExample: true,
    },
  ];

  return { decisions };
}

function createEnglishSamples(now: Date): SampleData {
  const decisions: Decision[] = [
    // ─── Decision 1: Adding a routine (choose_best, MEDIUM) ───
    {
      id: 'example-1',
      title: 'Should I add a routine to my after-work life?',
      category: 'Personal',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-1-opt-1',
          title: 'Gym',
          isSelected: false,
          pros: '- My stamina is very low, and I have almost no muscle.\n- If I don\'t start now, I feel like I\'ll regret it later.',
          cons: '- I don\'t enjoy it enough to keep it up.\n- I\'ve tried before, and I usually end up quitting.',
        },
        {
          id: 'example-1-opt-2',
          title: 'Pilates',
          isSelected: false,
          pros: '- Because classes are scheduled, it\'s easier to stick to a routine.\n- It definitely helps with posture correction.',
          cons: '- It doesn\'t seem to noticeably improve stamina or muscle strength.\n- The results don\'t feel significant relative to the cost.',
        },
        {
          id: 'example-1-opt-3',
          title: 'Reading',
          isSelected: false,
          pros: 'It feels like an area where the gap only widens with age.',
          cons: '- There\'s a high chance I\'ll default to YouTube or my phone.\n- I might just keep telling myself "I\'ll read it someday" and let books pile up.',
        },
      ],
      framing: {
        whatHappened: 'Since starting my job, I\'ve been feeling exhausted after work, and I often end up spending my evenings with no plan at all.\nMy stamina has dropped, my body is clearly out of shape, and ironically, doing nothing feels more draining than doing something.',
        goal: 'To build a routine that\'s sustainable and easy to maintain.\nOne that energizes me today and supports long-term growth.',
        constraints: 'About 3 hours available after work. Cost should be reasonable.',
        dealbreakers: "It shouldn't be so tiring that it affects the next workday.",
        keyFactors: 'Physical health, Sustainability, Cost',
      },
      keyFactors: [
        { id: 'example-1-kf-1', criteria: 'Physical health', importance: 4 },
        { id: 'example-1-kf-2', criteria: 'Sustainability', importance: 5 },
        { id: 'example-1-kf-3', criteria: 'Cost', importance: 2 },
      ],
      order: 0,
      mode: 'choose_best',
      isExample: true,
    },

    // ─── Decision 2: Design validation (do_or_not, HIGH) ───
    {
      id: 'example-2',
      title: '[TRIM · PM Work Decision] Is the current design for limiting decision time based on importance well-designed?',
      category: 'Work',
      importance: 'HIGH',
      timeBudget: IMPORTANCE_LEVELS.HIGH.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.HIGH.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-opt-1',
          title: 'Do',
          isSelected: false,
          pros: 'Time limits reduce decision fatigue and encourage proportional energy allocation.',
          cons: 'A uniform time allocation may not suit every situation.',
        },
        {
          id: 'example-2-opt-2',
          title: 'Do Not',
          isSelected: false,
          pros: 'Allows more flexible usage.',
          cons: 'Risk of spending excessive time on trivial decisions.',
        },
      ],
      framing: {
        whatHappened: '',
        goal: 'Creating a structure that prevents spending more decision effort than a decision deserves, while also helping decisions get made on time instead of being delayed.',
        keyFactors: 'Decision fatigue reduction, User-perceived appropriateness',
      },
      keyFactors: [
        { id: 'example-2-kf-1', criteria: 'Decision fatigue reduction', importance: 5 },
        { id: 'example-2-kf-2', criteria: 'User-perceived appropriateness', importance: 4 },
      ],
      order: 1,
      mode: 'do_or_not',
      isExample: true,
    },

    // ─── Decision 2 Sub: Recommended time validation (do_or_not, MEDIUM) ───
    {
      id: 'example-2-sub-1',
      title: 'Do the recommended time budgets for each importance level feel right in practice?',
      category: 'Work',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-sub-1-opt-1',
          title: 'Do',
          isSelected: false,
          memo: 'Current settings: Trivial 10min, Low 1hr, Medium 24hr, High 3 days, Critical 7 days',
        },
        {
          id: 'example-2-sub-1-opt-2',
          title: 'Do Not',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: 'Decision time budgets are set as follows: Trivial – 10 minutes / Low – 1 hour / Medium – 24 hours / High – 3 days / Critical – 7 days.',
        goal: 'For the automatically suggested decision time, based on importance, to feel reasonable and acceptable in most situations.',
        keyFactors: 'Perceived time per level, Alignment with actual usage patterns',
      },
      keyFactors: [
        { id: 'example-2-sub-1-kf-1', criteria: 'Perceived time per level', importance: 5 },
        { id: 'example-2-sub-1-kf-2', criteria: 'Alignment with actual usage patterns', importance: 4 },
      ],
      order: 0,
      parentId: 'example-2',
      mode: 'do_or_not',
      isExample: true,
    },
  ];

  return { decisions };
}

/**
 * Creates sample decisions based on the current language.
 * Timestamps are set relative to the current time.
 */
export function createSampleDecisions(lang: string): Decision[] {
  const now = new Date();
  const samples = lang === 'ko' ? createKoreanSamples(now) : createEnglishSamples(now);
  return samples.decisions;
}

/**
 * IDs of all sample decisions for identification.
 */
export const SAMPLE_DECISION_IDS = [
  'example-1',
  'example-2',
  'example-2-sub-1',
  'example-3',
  'example-3-sub-1',
  'example-3-sub-1-sub-1',
];
