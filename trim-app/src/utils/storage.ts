import { Decision } from '../types/decision';
import { t } from '../i18n';
import { createSampleDecisions, SAMPLE_DECISION_IDS } from '../data/sampleDecisions';

const STORAGE_KEY = 'trim-decisions';
const CATEGORIES_STORAGE_KEY = 'trim-categories';
const FIRST_DASHBOARD_VIEW_KEY = 'trim-first-dashboard-view';
const DELETED_SAMPLES_KEY = 'trim-deleted-sample-ids';
/**
 * Bump this version to force-sync samples for ALL users (resets deleted list, replaces everything).
 * Only bump when you need to override user deletions/edits.
 * For normal sample content updates, keep the same version — smart sync handles it.
 */
const SAMPLE_FORCE_VERSION = 'v1';
const SAMPLE_FORCE_VERSION_KEY = 'trim-sample-force-version';

/**
 * Get or set the timestamp when the user first saw the dashboard.
 * Used to start sample decision timers from first view, not from creation.
 */
function getOrSetFirstDashboardView(): string {
  let firstView = localStorage.getItem(FIRST_DASHBOARD_VIEW_KEY);
  if (!firstView) {
    firstView = new Date().toISOString();
    localStorage.setItem(FIRST_DASHBOARD_VIEW_KEY, firstView);
  }
  return firstView;
}

/** Get the list of sample IDs the user has explicitly deleted. */
function getDeletedSampleIds(): Set<string> {
  try {
    const saved = localStorage.getItem(DELETED_SAMPLES_KEY);
    if (!saved) return new Set();
    return new Set(JSON.parse(saved));
  } catch {
    return new Set();
  }
}

/** Record that the user deleted a sample decision (so it won't be re-injected). */
export function markSampleAsDeleted(decisionId: string): void {
  const sampleIds = new Set(SAMPLE_DECISION_IDS);
  if (!sampleIds.has(decisionId)) return; // not a sample, ignore
  const deleted = getDeletedSampleIds();
  deleted.add(decisionId);
  localStorage.setItem(DELETED_SAMPLES_KEY, JSON.stringify([...deleted]));
}

/**
 * Check if a force-sync is needed (version mismatch → reset everything).
 * Returns true if this is a fresh force-sync.
 */
function checkAndApplyForceSync(): boolean {
  const stored = localStorage.getItem(SAMPLE_FORCE_VERSION_KEY);
  if (stored === SAMPLE_FORCE_VERSION) return false;
  // Version changed or first time → force sync: reset deleted list & first-view
  localStorage.removeItem(DELETED_SAMPLES_KEY);
  localStorage.removeItem(FIRST_DASHBOARD_VIEW_KEY);
  localStorage.setItem(SAMPLE_FORCE_VERSION_KEY, SAMPLE_FORCE_VERSION);
  return true;
}

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

/** Apply first-dashboard-view deadline to sample decisions (timer starts when user first sees dashboard). */
function applyFirstViewDeadlines(decisions: Decision[]): Decision[] {
  const firstView = getOrSetFirstDashboardView();
  const baseTime = new Date(firstView).getTime();
  const sampleIds = new Set(SAMPLE_DECISION_IDS);

  return decisions.map((d) => {
    if (!sampleIds.has(d.id)) return d;
    const deadline = new Date(baseTime + d.timeBudget * 60 * 1000).toISOString();
    return { ...d, deadline };
  });
}

/**
 * Inject sample decisions. In dev (localhost), always replace 3 samples with latest template.
 * In production, inject once; user edits persist.
 * Timer for samples starts from first dashboard view.
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
      const merged = [...samples, ...shifted];
      return applyFirstViewDeadlines(merged);
    }

    const alreadyInjected = localStorage.getItem(EXAMPLES_INJECTED_KEY);
    if (alreadyInjected) {
      return applyFirstViewDeadlines(existingDecisions);
    }

    // Production: inject only when not yet injected
    const existingIds = new Set(existingDecisions.map(d => d.id));
    const toInject = samples.filter(s => !existingIds.has(s.id));
    if (toInject.length === 0) {
      localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
      return applyFirstViewDeadlines(existingDecisions);
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
      return applyFirstViewDeadlines(merged);
    }

    const merged = [...toInject, ...existingDecisions];
    localStorage.setItem(EXAMPLES_INJECTED_KEY, 'true');
    return applyFirstViewDeadlines(merged);
  } catch (error) {
    console.error('❌ Failed to inject sample decisions:', error);
    return existingDecisions;
  }
}
