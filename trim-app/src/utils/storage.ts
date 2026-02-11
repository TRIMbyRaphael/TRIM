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
 * Inject sample decisions for all users (new and existing) — runs once per version.
 * If an older version of examples exists (same IDs, isExample: true), they are
 * replaced with the latest version. User-edited examples (isExample: false) or
 * user-deleted examples are NOT re-injected.
 */
export function injectSampleDecisions(existingDecisions: Decision[], lang: string): Decision[] {
  try {
    const alreadyInjected = localStorage.getItem(EXAMPLES_INJECTED_KEY);
    if (alreadyInjected) {
      return existingDecisions;
    }

    // Create sample decisions with current timestamps
    const samples = createSampleDecisions(lang);

    // Separate existing decisions into:
    // 1) Old example decisions still marked isExample (will be replaced)
    // 2) User-edited former examples (isExample removed) → keep as-is
    // 3) Regular user decisions → keep as-is
    const oldExampleIds = new Set(
      existingDecisions
        .filter(d => SAMPLE_DECISION_IDS.includes(d.id) && d.isExample)
        .map(d => d.id)
    );
    const userDecisions = existingDecisions.filter(d => !oldExampleIds.has(d.id));

    // Check if user previously had examples and deleted some — don't re-inject deleted ones
    const previousVersionKey = 'trim-examples-v1-injected';
    const hadPreviousVersion = localStorage.getItem(previousVersionKey);
    let samplesToInject = samples;

    if (hadPreviousVersion) {
      // User had a previous version. Only inject samples whose IDs don't already
      // exist in userDecisions (those were edited by user and kept, or never deleted).
      // Also skip IDs that were in the old set but got deleted by user (not in existing at all).
      const existingIds = new Set(existingDecisions.map(d => d.id));
      const editedExampleIds = new Set(
        userDecisions
          .filter(d => SAMPLE_DECISION_IDS.includes(d.id))
          .map(d => d.id)
      );
      samplesToInject = samples.filter(s => {
        // If user edited this example (isExample was removed), don't replace it
        if (editedExampleIds.has(s.id)) return false;
        // If the ID previously existed but was deleted by user, don't re-inject
        if (hadPreviousVersion && !existingIds.has(s.id) && !oldExampleIds.has(s.id)) return false;
        return true;
      });
    }

    // Adjust order of user decisions to make room for samples at the top
    const topLevelSamples = samplesToInject.filter(s => !s.parentId);
    if (topLevelSamples.length > 0) {
      const maxSampleOrder = Math.max(...topLevelSamples.map(s => s.order));
      const shifted = userDecisions.map(d => ({
        ...d,
        order: d.parentId ? d.order : d.order + maxSampleOrder + 1,
      }));
      const merged = [...samplesToInject, ...shifted];
      localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
      console.log('📝 Injected sample decisions:', samplesToInject.length);
      return merged;
    }

    // No new samples to inject (all were edited/deleted by user)
    localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
    return userDecisions;
  } catch (error) {
    console.error('❌ Failed to inject sample decisions:', error);
    return existingDecisions;
  }
}
