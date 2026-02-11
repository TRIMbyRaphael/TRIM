import { Decision } from '../types/decision';
import { t } from '../i18n';
import { createSampleDecisions, SAMPLE_DECISION_IDS } from '../data/sampleDecisions';

const STORAGE_KEY = 'trim-decisions';
const CATEGORIES_STORAGE_KEY = 'trim-categories';
const EXAMPLES_INJECTED_KEY = 'trim-examples-v2-injected';

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
 * Inject sample decisions for all users (new and existing) — runs once.
 * Returns the merged decisions array with samples prepended.
 */
export function injectSampleDecisions(existingDecisions: Decision[], lang: string): Decision[] {
  try {
    const alreadyInjected = localStorage.getItem(EXAMPLES_INJECTED_KEY);
    if (alreadyInjected) {
      return existingDecisions;
    }

    // Check if user already has any example decisions (e.g. from a previous version)
    const hasExamples = existingDecisions.some(d => SAMPLE_DECISION_IDS.includes(d.id));
    if (hasExamples) {
      localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
      return existingDecisions;
    }

    // Create sample decisions with current timestamps
    const samples = createSampleDecisions(lang);

    // Adjust order of existing decisions to make room for samples at the top
    const maxSampleOrder = Math.max(...samples.filter(s => !s.parentId).map(s => s.order));
    const shiftedExisting = existingDecisions.map(d => ({
      ...d,
      order: d.parentId ? d.order : d.order + maxSampleOrder + 1,
    }));

    const merged = [...samples, ...shiftedExisting];

    // Mark as injected so it only happens once
    localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
    console.log('📝 Injected sample decisions:', samples.length);

    return merged;
  } catch (error) {
    console.error('❌ Failed to inject sample decisions:', error);
    return existingDecisions;
  }
}
