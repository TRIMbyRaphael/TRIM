export type ImportanceLevel = 'TRIVIAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecisionMode = 'choose_best' | 'do_or_not' | 'no_clear_options';

export const DECISION_MODES: { value: DecisionMode; label: string }[] = [
  { value: 'choose_best', label: 'A or B or C' },
  { value: 'do_or_not', label: 'Do or Not' },
  { value: 'no_clear_options', label: 'no clear options' },
];

export const DEFAULT_DECISION_MODE: DecisionMode = 'do_or_not';

export interface Link {
  id: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface Option {
  id: string;
  title: string;
  isSelected: boolean;
  excluded?: boolean; // 고려 대상에서 제외 (취소선 표시)
  memo?: string;
  pros?: string;
  cons?: string;
  links?: Link[];
}

export interface KeyFactor {
  id: string;
  criteria: string;
  importance: number; // 1-5
}

export interface ComparisonCriteria {
  id: string;
  name: string;
  importance?: number; // 1-5, synced from KeyFactor
  ratings: { [optionId: string]: string };
}

export interface DecisionFraming {
  whatHappened?: string;
  goal?: string;
  constraints?: string;
  dealbreakers?: string;
  keyFactors?: string;
}

export interface Decision {
  id: string;
  title: string;
  category: string;
  importance: ImportanceLevel;
  timeBudget: number;
  deadline: string;
  createdAt: string;
  resolvedAt?: string;
  resolved: boolean;
  options: Option[];
  memo?: string;
  links?: Link[];
  framing?: DecisionFraming;
  keyFactors?: KeyFactor[];
  order: number;
  parentId?: string; // For sub-decisions (chunking)
  mode?: DecisionMode; // Decision mode: choose_best | do_or_not | no_clear_options
  comparisonMatrix?: ComparisonCriteria[];
  isExample?: boolean; // true for sample decisions, removed on user edit
}

export const IMPORTANCE_LEVELS = {
  TRIVIAL: { label: 'Trivial', minutes: 10 },
  LOW: { label: 'Low', minutes: 60 },
  MEDIUM: { label: 'Medium', minutes: 1440 },
  HIGH: { label: 'High', minutes: 4320 },
  CRITICAL: { label: 'Critical', minutes: 10080 },
};
