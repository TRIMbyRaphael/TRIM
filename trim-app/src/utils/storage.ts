import { Decision } from '../types/decision';
import { t } from '../i18n';
import { createSampleDecisions, SAMPLE_DECISION_IDS } from '../data/sampleDecisions';

const STORAGE_KEY = 'trim-decisions';
const CATEGORIES_STORAGE_KEY = 'trim-categories';
const EXAMPLES_INJECTED_KEY = 'trim-examples-v1-injected';

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
