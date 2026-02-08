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
  memo?: string;
  pros?: string;
  cons?: string;
  links?: Link[];
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
  order: number;
  parentId?: string; // For sub-decisions (chunking)
  mode?: DecisionMode; // Decision mode: choose_best | do_or_not | no_clear_options
}

export const IMPORTANCE_LEVELS = {
  TRIVIAL: { label: 'Trivial', minutes: 10 },
  LOW: { label: 'Low', minutes: 60 },
  MEDIUM: { label: 'Medium', minutes: 1440 },
  HIGH: { label: 'High', minutes: 4320 },
  CRITICAL: { label: 'Critical', minutes: 10080 },
};
