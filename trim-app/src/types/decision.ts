export type ImportanceLevel = 'TRIVIAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  category: 'Life' | 'Work';
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
}

export const IMPORTANCE_LEVELS = {
  TRIVIAL: { label: 'Trivial', minutes: 10 },
  LOW: { label: 'Low', minutes: 60 },
  MEDIUM: { label: 'Medium', minutes: 1440 },
  HIGH: { label: 'High', minutes: 4320 },
  CRITICAL: { label: 'Critical', minutes: 10080 },
};
