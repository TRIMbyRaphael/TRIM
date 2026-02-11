import { Decision } from '../types/decision';
import { t } from '../i18n';
import { createSampleDecisions, SAMPLE_DECISION_IDS } from '../data/sampleDecisions';

const STORAGE_KEY = 'trim-decisions';
const CATEGORIES_STORAGE_KEY = 'trim-categories';
const EXAMPLES_INJECTED_KEY = 'trim-examples-v10-injected';

export function saveDecisions(decisions: Decision[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    console.log('✅ Saved to Local Storage:', decisions.length, 'decisions');
  } catch (error) {
    console.error('❌ Failed to save decisions:', error);
    alert('저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
  }
}

export function loadDecisions(): Decision[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      console.log('📭 No data in Local Storage');
      return [];
    }
    
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      console.log('📦 Loaded from Local Storage:', parsed.length, 'decisions');
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to load decisions:', error);
    return [];
  }
}

export function saveCategories(categories: string[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    console.log('✅ Saved categories to Local Storage:', categories);
  } catch (error) {
    console.error('❌ Failed to save categories:', error);
  }
}

export function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!saved) {
      console.log('📭 No categories in Local Storage, using defaults');
      return t.defaultCategories;
    }
    
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log('📦 Loaded categories from Local Storage:', parsed);
      return parsed;
    }
    return t.defaultCategories;
  } catch (error) {
    console.error('❌ Failed to load categories:', error);
    return t.defaultCategories;
  }
}

/**
 * Inject sample decisions. In dev (localhost), always replace 3 samples with latest template.
 * In production, inject once; user edits persist.
 */
export function injectSampleDecisions(existingDecisions: Decision[], lang: string): Decision[] {
  try {
    const isDev = import.meta.env.DEV;

    const samples = createSampleDecisions(lang);

    // Dev: always replace the 3 samples with latest — sampleDecisions.ts changes reflect immediately
    if (isDev) {
      const sampleIds = new Set(SAMPLE_DECISION_IDS);
      const userDecisions = existingDecisions.filter(d => !sampleIds.has(d.id));
      const maxSampleOrder = Math.max(0, ...samples.filter(s => !s.parentId).map(s => s.order));
      const shifted = userDecisions.map(d => ({
        ...d,
        order: d.parentId ? (d.order ?? 0) : (d.order ?? 0) + maxSampleOrder + 1,
      }));
      return [...samples, ...shifted];
    }

    const alreadyInjected = localStorage.getItem(EXAMPLES_INJECTED_KEY);
    if (alreadyInjected) {
      return existingDecisions;
    }

    // Production: inject only when not yet injected
    const existingIds = new Set(existingDecisions.map(d => d.id));
    const toInject = samples.filter(s => !existingIds.has(s.id));
    if (toInject.length === 0) {
      localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
      return existingDecisions;
    }

    const topLevelSamples = toInject.filter(s => !s.parentId);
    if (topLevelSamples.length > 0) {
      const maxSampleOrder = Math.max(...topLevelSamples.map(s => s.order));
      const shiftedExisting = existingDecisions.map(d => ({
        ...d,
        order: d.parentId ? d.order : (d.order ?? 0) + maxSampleOrder + 1,
      }));
      const merged = [...toInject, ...shiftedExisting];
      localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
      console.log('📝 Injected sample decisions:', toInject.length);
      return merged;
    }

    const merged = [...toInject, ...existingDecisions];
    localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
    return merged;
  } catch (error) {
    console.error('❌ Failed to inject sample decisions:', error);
    return existingDecisions;
  }
}
