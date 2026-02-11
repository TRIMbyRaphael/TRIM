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
      title: '퇴근 후 삶에 하나의 루틴을 추가해볼까?',
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
          pros: '체력 증진, 스트레스 해소에 효과적',
          cons: '초기에 습관 만들기가 어려울 수 있음',
        },
        {
          id: 'example-1-opt-2',
          title: '필라테스',
          isSelected: false,
          pros: '자세 교정, 유연성 향상',
          cons: '비용이 상대적으로 높음',
        },
        {
          id: 'example-1-opt-3',
          title: '독서',
          isSelected: false,
          pros: '지식 확장, 장소 제약 없음',
          cons: '피곤할 때 집중하기 어려움',
        },
        {
          id: 'example-1-opt-4',
          title: '영어 공부',
          isSelected: false,
          pros: '커리어에 직접적 도움, 자기계발',
          cons: '혼자 꾸준히 하기 어려움',
        },
      ],
      framing: {
        whatHappened: '퇴근 후 시간이 무의미하게 흘러가는 느낌이 들어 변화가 필요하다고 느꼈다.',
        goal: '퇴근 후 하루에 의미를 더할 수 있는 루틴 하나를 정해서 꾸준히 실천하고 싶다.',
        constraints: '퇴근 후 사용 가능한 시간은 약 3시간. 비용이 너무 크면 안 된다.',
        dealbreakers: '다음 날 출근에 지장이 생길 정도로 피곤하면 안 된다.',
        keyFactors: '비용, 지속 가능성, 건강 효과, 시간 효율',
      },
      keyFactors: [
        { id: 'example-1-kf-1', criteria: '비용', importance: 3 },
        { id: 'example-1-kf-2', criteria: '지속 가능성', importance: 5 },
        { id: 'example-1-kf-3', criteria: '건강 효과', importance: 4 },
        { id: 'example-1-kf-4', criteria: '시간 효율', importance: 3 },
      ],
      order: 0,
      mode: 'choose_best',
      isExample: true,
    },

    // ─── Decision 2: 설계 검증 (do_or_not, LOW) ───
    {
      id: 'example-2',
      title: '중요도를 기준으로 결정에 쓸 시간(결정 비용)을 제한하도록 한 현재 설계는 적절한가?',
      category: '업무',
      importance: 'LOW',
      timeBudget: IMPORTANCE_LEVELS.LOW.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.LOW.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-opt-1',
          title: '한다',
          isSelected: false,
          pros: '시간 제한이 결정 피로를 줄여주고, 중요도에 맞는 에너지 배분을 유도한다.',
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
        whatHappened: 'TRIM 앱의 핵심 전제 — 결정의 중요도에 따라 고민에 쓸 시간을 제한한다 — 를 검증하고 싶다.',
        goal: '사용자가 사소한 결정에 과도한 시간을 쓰지 않고, 중요한 결정에 충분한 시간을 투자하도록 유도하는 것.',
        keyFactors: '결정 피로 감소 효과, 사용자 체감 적절성',
      },
      keyFactors: [
        { id: 'example-2-kf-1', criteria: '결정 피로 감소 효과', importance: 5 },
        { id: 'example-2-kf-2', criteria: '사용자 체감 적절성', importance: 4 },
      ],
      order: 1,
      mode: 'do_or_not',
      isExample: true,
    },

    // ─── Decision 2 Sub: 권장 시간 체감 검증 (do_or_not, TRIVIAL) ───
    {
      id: 'example-2-sub-1',
      title: '중요도별로 권장된 고민 시간은 체감상 맞는가?',
      category: '업무',
      importance: 'TRIVIAL',
      timeBudget: IMPORTANCE_LEVELS.TRIVIAL.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.TRIVIAL.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-2-sub-1-opt-1',
          title: '한다',
          isSelected: false,
          memo: '현재 설정: Trivial 10분, Low 1시간, Medium 24시간, High 3일, Critical 7일',
        },
        {
          id: 'example-2-sub-1-opt-2',
          title: '안 한다',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: '중요도별 권장 시간이 실제 체감과 맞는지 확인해보고 싶다.',
        goal: '각 중요도 레벨에 부여된 시간이 사용자 입장에서 자연스럽게 느껴지는지 검증.',
        keyFactors: '각 레벨별 체감 시간, 실제 사용 패턴과의 일치도',
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

    // ─── Decision 3: 이사 (no_clear_options, HIGH) ───
    {
      id: 'example-3',
      title: '이사 어디로 가지?',
      category: '개인',
      importance: 'HIGH',
      timeBudget: IMPORTANCE_LEVELS.HIGH.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.HIGH.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-opt-1',
          title: '',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: '현재 살고 있는 집의 계약이 곧 만료되어 새 거처를 찾아야 한다.',
        goal: '출퇴근이 편리하고, 주거 환경이 좋은 곳으로 이사하고 싶다.',
        constraints: '월세 예산 한도 있음. 회사까지 출퇴근 1시간 이내.',
        dealbreakers: '통근 시간이 편도 1시간을 초과하면 안 된다.',
        keyFactors: '통근 시간, 월세, 주거 환경, 생활 인프라',
      },
      keyFactors: [
        { id: 'example-3-kf-1', criteria: '통근 시간', importance: 5 },
        { id: 'example-3-kf-2', criteria: '월세', importance: 4 },
        { id: 'example-3-kf-3', criteria: '주거 환경', importance: 4 },
        { id: 'example-3-kf-4', criteria: '생활 인프라', importance: 3 },
      ],
      order: 2,
      mode: 'no_clear_options',
      isExample: true,
    },

    // ─── Decision 3 Sub 1: 후보 지역 (no_clear_options, MEDIUM) ───
    {
      id: 'example-3-sub-1',
      title: '어떤 지역이 적절한 후보인가?',
      category: '개인',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-sub-1-opt-1',
          title: '',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: '이사할 지역을 먼저 좁혀야 구체적인 매물 검색이 가능하다.',
        goal: '출퇴근, 생활 인프라, 예산을 고려한 후보 지역 목록 만들기.',
        keyFactors: '대중교통 접근성, 주변 편의시설, 평균 월세 수준',
      },
      keyFactors: [
        { id: 'example-3-sub-1-kf-1', criteria: '대중교통 접근성', importance: 5 },
        { id: 'example-3-sub-1-kf-2', criteria: '주변 편의시설', importance: 3 },
        { id: 'example-3-sub-1-kf-3', criteria: '평균 월세 수준', importance: 4 },
      ],
      order: 0,
      parentId: 'example-3',
      mode: 'no_clear_options',
      isExample: true,
    },

    // ─── Decision 3 Sub 1 Sub 1: 버스 탑승 가능 여부 (do_or_not, LOW) ───
    {
      id: 'example-3-sub-1-sub-1',
      title: '오전 8시경 당산역 정류장에서 1999번 버스를 무리 없이 제때 탈 수 있는가?',
      category: '개인',
      importance: 'LOW',
      timeBudget: IMPORTANCE_LEVELS.LOW.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.LOW.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-sub-1-sub-1-opt-1',
          title: '한다',
          isSelected: false,
          memo: '출근 시간대 배차 간격과 혼잡도를 확인해야 한다.',
        },
        {
          id: 'example-3-sub-1-sub-1-opt-2',
          title: '안 한다',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: '당산역 근처를 후보로 고려 중인데, 핵심 통근 수단인 1999번 버스의 이용 가능성을 확인해야 한다.',
        goal: '출근 시간대에 1999번 버스를 안정적으로 탈 수 있는지 판단.',
        keyFactors: '배차 간격, 출근 시간대 혼잡도, 정류장까지 도보 거리',
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
          pros: 'Posture correction, improved flexibility',
          cons: 'Relatively expensive',
        },
        {
          id: 'example-1-opt-3',
          title: 'Reading',
          isSelected: false,
          pros: 'Expands knowledge, no location constraint',
          cons: 'Hard to focus when tired',
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

    // ─── Decision 2: Design validation (do_or_not, LOW) ───
    {
      id: 'example-2',
      title: 'Is the current design of limiting decision time based on importance appropriate?',
      category: 'Work',
      importance: 'LOW',
      timeBudget: IMPORTANCE_LEVELS.LOW.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.LOW.minutes * 60 * 1000).toISOString(),
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
        whatHappened: "Want to validate TRIM's core premise — limiting deliberation time based on a decision's importance.",
        goal: 'Ensure users spend proportional effort: less on trivial decisions, more on critical ones.',
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

    // ─── Decision 2 Sub: Recommended time validation (do_or_not, TRIVIAL) ───
    {
      id: 'example-2-sub-1',
      title: 'Does the recommended deliberation time per importance level feel right?',
      category: 'Work',
      importance: 'TRIVIAL',
      timeBudget: IMPORTANCE_LEVELS.TRIVIAL.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.TRIVIAL.minutes * 60 * 1000).toISOString(),
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
        whatHappened: 'Want to check if the time budgets per importance level match real-world intuition.',
        goal: 'Verify that each importance level feels natural from a user perspective.',
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

    // ─── Decision 3: Moving (no_clear_options, HIGH) ───
    {
      id: 'example-3',
      title: 'Where should I move?',
      category: 'Personal',
      importance: 'HIGH',
      timeBudget: IMPORTANCE_LEVELS.HIGH.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.HIGH.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-opt-1',
          title: '',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: 'My current lease is about to expire, and I need to find a new place.',
        goal: 'Move to a place with a convenient commute and a good living environment.',
        constraints: 'Monthly rent budget is limited. Commute must be under 1 hour.',
        dealbreakers: 'Commute time must not exceed 1 hour one way.',
        keyFactors: 'Commute time, Rent, Living environment, Amenities',
      },
      keyFactors: [
        { id: 'example-3-kf-1', criteria: 'Commute time', importance: 5 },
        { id: 'example-3-kf-2', criteria: 'Rent', importance: 4 },
        { id: 'example-3-kf-3', criteria: 'Living environment', importance: 4 },
        { id: 'example-3-kf-4', criteria: 'Amenities', importance: 3 },
      ],
      order: 2,
      mode: 'no_clear_options',
      isExample: true,
    },

    // ─── Decision 3 Sub 1: Candidate areas (no_clear_options, MEDIUM) ───
    {
      id: 'example-3-sub-1',
      title: 'Which areas are suitable candidates?',
      category: 'Personal',
      importance: 'MEDIUM',
      timeBudget: IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-sub-1-opt-1',
          title: '',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: 'Need to narrow down candidate areas before searching for specific listings.',
        goal: 'Create a shortlist of areas considering commute, amenities, and budget.',
        keyFactors: 'Public transit access, Nearby amenities, Average rent level',
      },
      keyFactors: [
        { id: 'example-3-sub-1-kf-1', criteria: 'Public transit access', importance: 5 },
        { id: 'example-3-sub-1-kf-2', criteria: 'Nearby amenities', importance: 3 },
        { id: 'example-3-sub-1-kf-3', criteria: 'Average rent level', importance: 4 },
      ],
      order: 0,
      parentId: 'example-3',
      mode: 'no_clear_options',
      isExample: true,
    },

    // ─── Decision 3 Sub 1 Sub 1: Bus feasibility (do_or_not, LOW) ───
    {
      id: 'example-3-sub-1-sub-1',
      title: 'Can I reliably catch bus 1999 at the Dangsan station stop around 8 AM?',
      category: 'Personal',
      importance: 'LOW',
      timeBudget: IMPORTANCE_LEVELS.LOW.minutes,
      deadline: new Date(now.getTime() + IMPORTANCE_LEVELS.LOW.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: 'example-3-sub-1-sub-1-opt-1',
          title: 'Do',
          isSelected: false,
          memo: 'Need to check bus frequency and congestion during rush hour.',
        },
        {
          id: 'example-3-sub-1-sub-1-opt-2',
          title: 'Do Not',
          isSelected: false,
        },
      ],
      framing: {
        whatHappened: "Considering Dangsan area as a candidate, but need to verify bus 1999's viability for commuting.",
        goal: 'Determine if bus 1999 can be reliably used during morning rush hour.',
        keyFactors: 'Bus frequency, Rush hour congestion, Walking distance to stop',
      },
      keyFactors: [
        { id: 'example-3-sub-1-sub-1-kf-1', criteria: 'Bus frequency', importance: 5 },
        { id: 'example-3-sub-1-sub-1-kf-2', criteria: 'Rush hour congestion', importance: 4 },
        { id: 'example-3-sub-1-sub-1-kf-3', criteria: 'Walking distance to stop', importance: 3 },
      ],
      order: 0,
      parentId: 'example-3-sub-1',
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
