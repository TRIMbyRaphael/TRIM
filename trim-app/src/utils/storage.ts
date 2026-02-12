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
 * Smart-sync sample decisions on every app load.
 *
 * - Dev: always replace samples with latest template (instant feedback).
 * - Production:
 *   · Force sync (SAMPLE_FORCE_VERSION changed): reset everything, inject all samples fresh.
 *   · Normal sync: for each template sample —
 *       – Deleted by user → skip
 *       – Exists with isExample=true → replace with latest template
 *       – Exists with isExample removed → skip (user modified it)
 *       – Missing & not deleted → inject (new sample)
 * - Timer for samples starts from first dashboard view.
 */
export function injectSampleDecisions(existingDecisions: Decision[], lang: string): Decision[] {
  try {
    const isDev = import.meta.env.DEV;
    const samples = createSampleDecisions(lang);
    const sampleIdSet = new Set(SAMPLE_DECISION_IDS);

    // ── Dev: replace pristine samples with latest template, but preserve user-modified ones ──
    if (isDev) {
      const deletedIds = getDeletedSampleIds();
      const existingById = new Map(existingDecisions.map(d => [d.id, d]));

      const samplesToInject: Decision[] = [];
      for (const sample of samples) {
        if (deletedIds.has(sample.id)) continue; // user deleted → skip

        const existing = existingById.get(sample.id);
        if (existing && (!existing.isExample || existing.resolved)) {
          // User modified (isExample removed) or trimmed (resolved) → keep their version
          samplesToInject.push(existing);
        } else {
          // Pristine or missing → use latest template
          samplesToInject.push(sample);
        }
      }

      const userDecisions = existingDecisions.filter(d => !sampleIdSet.has(d.id));
      const maxSampleOrder = Math.max(0, ...samplesToInject.filter(s => !s.parentId).map(s => s.order));
      const shifted = userDecisions.map(d => ({
        ...d,
        order: d.parentId ? (d.order ?? 0) : (d.order ?? 0) + maxSampleOrder + 1,
      }));
      return applyFirstViewDeadlines([...samplesToInject, ...shifted]);
    }

    // ── Production: smart sync ──
    const isForceSync = checkAndApplyForceSync();
    const deletedIds = isForceSync ? new Set<string>() : getDeletedSampleIds();

    // Build a map of existing decisions by id
    const existingById = new Map(existingDecisions.map(d => [d.id, d]));

    // Determine which template samples to include
    const samplesToInject: Decision[] = [];
    for (const sample of samples) {
      if (deletedIds.has(sample.id)) continue; // user deleted it

      const existing = existingById.get(sample.id);
      if (existing) {
        if (existing.isExample && !existing.resolved) {
          // User hasn't modified and hasn't trimmed → replace with latest template
          samplesToInject.push(sample);
        }
        // else: user modified (isExample removed) or trimmed (resolved) → keep their version
      } else {
        // New sample or force-synced → inject
        samplesToInject.push(sample);
      }
    }

    // Collect user decisions (non-sample + user-modified samples)
    const userDecisions = existingDecisions.filter(d => {
      if (!sampleIdSet.has(d.id)) return true; // user's own decision
      if (d.isExample && !d.resolved) return false; // pristine & not trimmed → will be replaced by template
      if (deletedIds.has(d.id)) return false; // was deleted, skip
      return true; // user-modified or trimmed sample, keep
    });

    // Shift user decision order below samples
    const maxSampleOrder = Math.max(0, ...samplesToInject.filter(s => !s.parentId).map(s => s.order));
    const shifted = userDecisions.map(d => ({
      ...d,
      order: d.parentId ? (d.order ?? 0) : (d.order ?? 0) + maxSampleOrder + 1,
    }));

    const merged = [...samplesToInject, ...shifted];
    console.log(`📝 Sample sync: ${samplesToInject.length} samples, ${shifted.length} user decisions`);
    return applyFirstViewDeadlines(merged);
  } catch (error) {
    console.error('❌ Failed to inject sample decisions:', error);
    return existingDecisions;
  }
}
