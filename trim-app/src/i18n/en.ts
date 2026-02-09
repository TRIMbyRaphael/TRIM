const en = {
  // Common
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  confirm: 'Confirm',
  add: 'Add',
  ok: 'OK',

  // Date / locale
  dateLocale: 'en-US',

  // Default data
  defaultCategory: 'Life',

  // Decision Modes (keyed by DecisionMode value)
  decisionModes: {
    choose_best: 'A or B or C',
    do_or_not: 'Do or Not',
    no_clear_options: 'no clear options',
  } as Record<string, string>,

  // Importance Levels (keyed by ImportanceLevel)
  importanceLevels: {
    TRIVIAL: 'Trivial',
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  } as Record<string, string>,

  // Dashboard
  all: 'All',
  overdue: 'OVERDUE',
  active: 'ACTIVE',
  resolved: 'RESOLVED',
  pendingDecision: 'Pending Decision',
  noActiveDecisions: 'No active decisions.',
  tapToAdd: 'Tap + to add one.',
  manageCategoriesTitle: 'Manage Categories',

  // Decision Detail - Title
  titlePlaceholder: "What's cluttering your mind?",
  untitled: '[Untitled]',

  // Framing Questions
  framingWhatHappened: 'What happened?',
  framingUltimateGoal: 'Ultimate Goal',
  framingConstraints: 'Any fixed constraints?',
  framingDealbreakers: 'Any deal-breakers?',
  framingKeyFactors: 'Key factors?',
  framingWhatHappenedPlaceholder: 'What situation led to this decision...',
  framingGoalPlaceholder: 'What do I really want by making this decision...',
  framingConstraintsPlaceholder: "External constraints you can't change...",
  framingDealbreakersPlaceholder: "What's non-negotiable for you...",
  framingKeyFactorsPlaceholder: "Criteria you'll use to compare options...",

  // Options
  addOption: 'Add Option',
  option: 'Option',
  doOption: 'Do',
  doNotOption: 'Do Not',

  // Option Memo
  whyShouldIDo: 'Why should I do this?',
  whyShouldntIDo: "Why shouldn't I do this?",
  pros: 'Pros',
  cons: 'Cons',
  prosPlaceholder: "What's good about this option...",
  consPlaceholder: "What's not ideal about this option...",
  switchToFreeFormMemo: 'Switch to free-form memo',
  addNotesPlaceholder: 'Add notes about this option...',
  addProsCons: 'Add Pros / Cons',

  // Comparison Matrix
  compareOptions: 'Compare Options',
  comparisonMatrix: 'Comparison Matrix',
  optionsHeader: 'Options',
  criteria: 'Criteria',
  addCriteria: 'Add Criteria',

  // Actions
  reopen: 'Re-open',
  randomPickLine1: 'Random',
  randomPickLine2: 'Pick',
  randomPickTooltip: 'Stop thinking when impact differences are minimal',

  // Settings
  importance: 'Importance',
  timeBudget: 'Time Budget',
  completed: 'completed',
  left: 'left',
  minute: 'min',
  hour: 'hr',
  day: 'day',

  // Decision Chunking
  decisionChunking: 'Decision Chunking',
  chunkingOptional: '(optional)',
  chunkingInfoTitle: 'Break a complex decision into smaller ones.',
  chunkingMore: '...more',
  chunkingInfoDesc1Before: 'Sometimes a decision feels overwhelming because it contains ',
  chunkingInfoDesc1BeforeBreak: '',
  chunkingInfoDesc1Bold: 'multiple prior decisions',
  chunkingInfoDesc1After: " you haven't resolved yet.",
  chunkingInfoDesc2Before: 'Instead of treating it as one problem, break it into chunks and resolve them step by step.',
  chunkingInfoDesc2After: '',
  addSubDecision: 'Add Sub-Decision',
  resolvedText: 'Resolved',

  // Leave Warning
  decisionTitleRequired: 'Decision title is required',
  leaveWithoutSaving: 'Leave without saving?',
  leave: 'Leave',
  confirmDeleteDecision: 'Are you sure you want to delete this decision?',

  // Link Modal
  editLink: 'Edit Link',
  addLink: 'Add Link',
  url: 'URL',
  loadingPreview: 'Loading preview...',
  titleOptional: 'Title (optional)',
  customTitle: 'Custom title',
  editPreview: 'Edit preview',

  // Time Budget Modal
  deadline: 'Deadline',
  time: 'Time',
  setTime: 'Set Time',
  done: 'Done',
  dayLabel: 'D',
  hourLabel: 'H',
  minuteLabel: 'M',
  hourHourLabel: 'HH',
  minuteMinuteLabel: 'MM',
  weekDays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  // Category Management
  categoryAlreadyExists: 'Category name already exists.',
  needAtLeastOneCategory: 'At least 1 category is required.',
  cannotDelete: 'Cannot Delete',
  categoryInUse: (category: string, count: number) =>
    `"${category}" category is used by ${count} decision(s).`,
  newCategory: 'New Category',

  // DecisionCard
  untitledCard: '(Untitled)',
  untitledOption: '(Option)',
};

export type Translations = typeof en;
export default en;
