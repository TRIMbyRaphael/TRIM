import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import DecisionDetail from './components/DecisionDetail';
import TypeSelectionSheet from './components/TypeSelectionSheet';
import QuickDecisionSheet from './components/QuickDecisionSheet';
import { Decision, IMPORTANCE_LEVELS, DecisionMode, DEFAULT_DECISION_MODE } from './types/decision';
import { loadDecisions, saveDecisions, loadCategories, saveCategories, injectSampleDecisions, markSampleAsDeleted } from './utils/storage';
import { t } from './i18n';

type View = 'dashboard' | 'detail';

function App() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track initial sub-decision count for each decision
  const [initialSubDecisionCounts, setInitialSubDecisionCounts] = useState<Record<string, number>>({});

  // Type Selection & Quick Editor states
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [quickEditorType, setQuickEditorType] = useState<'do_or_not' | 'choose_best' | null>(null);

  // iOS 키보드 선점용 숨겨진 input ref
  const keyboardProxyRef = useRef<HTMLInputElement>(null);

  // overlays-content 모드에서 키보드가 input을 가리지 않도록
  // 포커스된 요소를 자동으로 스크롤하여 보이게 처리 (DecisionDetail 등)
  // QuickDecisionSheet는 자체 VisualViewport 핸들러가 있으므로 제외
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT')) return;

      // QuickDecisionSheet 내부 요소는 자체 처리하므로 스킵
      if (target.closest('.quick-sheet-content')) return;

      // 키보드 애니메이션 완료 후 스크롤
      setTimeout(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const rect = target.getBoundingClientRect();
        const visibleBottom = vv.height + vv.offsetTop;

        // 요소가 키보드에 가려진 경우에만 스크롤
        if (rect.bottom > visibleBottom - 20) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 400);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Load decisions and categories on mount
  useEffect(() => {
    const lang = import.meta.env.VITE_LANG || 'en';
    const loaded = loadDecisions();
    const loadedCategories = loadCategories();

    // Inject sample decisions (runs once for all users, new and existing)
    const withSamples = injectSampleDecisions(loaded, lang);

    setDecisions(withSamples);
    setCategories(loadedCategories);
    
    // Initialize sub-decision counts for loaded decisions
    const initialCounts: Record<string, number> = {};
    withSamples.forEach(decision => {
      initialCounts[decision.id] = withSamples.filter(d => d.parentId === decision.id).length;
    });
    setInitialSubDecisionCounts(initialCounts);
    
    setIsInitialLoad(false);
  }, []);

  // Save decisions whenever they change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      saveDecisions(decisions);
    }
  }, [decisions, isInitialLoad]);

  // Save categories whenever they change
  useEffect(() => {
    if (!isInitialLoad) {
      saveCategories(categories);
    }
  }, [categories, isInitialLoad]);

  // 1단계: "Pending Decision" 버튼 클릭 → 타입 선택 시트 표시
  const handleCreateDecision = () => {
    setShowTypeSelection(true);
  };

  // 2단계: 타입 선택 후 분기
  const handleTypeSelect = (type: DecisionMode) => {
    setShowTypeSelection(false);

    if (type === 'no_clear_options') {
      // no_clear_options → 바로 전체 작성 화면으로 이동
      createDecisionWithMode(type);
    } else {
      // 사용자 탭 이벤트 체인 안에서 즉시 숨겨진 input 포커스 → iOS 키보드 선점
      keyboardProxyRef.current?.focus({ preventScroll: true });
      // do_or_not / choose_best → 간이 작성 화면 표시
      setQuickEditorType(type as 'do_or_not' | 'choose_best');
    }
  };

  // 대시보드에서 선택 중인 카테고리를 프리셋으로 사용
  // 'All'이면 첫 번째 카테고리, 특정 카테고리면 그 카테고리를 사용
  const getPresetCategory = () =>
    selectedCategory !== 'All' ? selectedCategory : (categories[0] || t.defaultCategory);

  // 모드와 함께 Decision 생성 (전체 편집기용)
  const createDecisionWithMode = (mode: DecisionMode) => {
    const now = new Date();
    const timeBudgetVal = IMPORTANCE_LEVELS.MEDIUM.minutes;
    const deadlineVal = new Date(now.getTime() + timeBudgetVal * 60 * 1000);
    const baseId = Date.now();

    const activeDecisionsArr = decisions.filter(d => !d.resolved && !d.parentId);
    const minOrder = activeDecisionsArr.length > 0
      ? Math.min(...activeDecisionsArr.map(d => d.order || 0)) - 1
      : 0;

    let initialOptions;
    if (mode === 'do_or_not') {
      initialOptions = [
        { id: `${baseId}-1`, title: t.doOption, isSelected: false },
        { id: `${baseId}-2`, title: t.doNotOption, isSelected: false },
      ];
    } else if (mode === 'no_clear_options') {
      initialOptions = [
        { id: `${baseId}-1`, title: '', isSelected: false },
      ];
    } else {
      initialOptions = [
        { id: `${baseId}-1`, title: '', isSelected: false },
        { id: `${baseId}-2`, title: '', isSelected: false },
      ];
    }

    const newDecision: Decision = {
      id: baseId.toString(),
      title: '',
      category: getPresetCategory(),
      importance: 'MEDIUM',
      timeBudget: timeBudgetVal,
      deadline: deadlineVal.toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: initialOptions,
      order: minOrder,
      mode,
    };

    setDecisions([...decisions, newDecision]);
    setInitialSubDecisionCounts(prev => ({
      ...prev,
      [newDecision.id]: 0,
    }));
    setCurrentDecisionId(newDecision.id);
    setCurrentView('detail');
  };

  // 간이 작성 공통 — Decision 생성 후 newDecision 반환
  const createQuickDecision = (partialDecision: Partial<Decision>): Decision => {
    const now = new Date();
    const baseId = Date.now();

    const activeDecisionsArr = decisions.filter(d => !d.resolved && !d.parentId);
    const minOrder = activeDecisionsArr.length > 0
      ? Math.min(...activeDecisionsArr.map(d => d.order || 0)) - 1
      : 0;

    const newDecision: Decision = {
      id: baseId.toString(),
      title: partialDecision.title || '',
      category: partialDecision.category || categories[0] || t.defaultCategory,
      importance: partialDecision.importance || 'MEDIUM',
      timeBudget: partialDecision.timeBudget || IMPORTANCE_LEVELS.MEDIUM.minutes,
      deadline: partialDecision.deadline || new Date(now.getTime() + IMPORTANCE_LEVELS.MEDIUM.minutes * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: (partialDecision.options || []).map((opt, idx) => ({
        ...opt,
        id: `${baseId}-${idx + 1}`,
      })),
      order: minOrder,
      mode: partialDecision.mode || 'do_or_not',
    };

    setDecisions([...decisions, newDecision]);
    setInitialSubDecisionCounts(prev => ({
      ...prev,
      [newDecision.id]: 0,
    }));
    setQuickEditorType(null);
    return newDecision;
  };

  // 간이 작성 완료 → Decision 생성 후 대시보드에 머무름
  const handleQuickComplete = (partialDecision: Partial<Decision>) => {
    createQuickDecision(partialDecision);
  };

  // 간이 작성 → 전체 편집기로 확장 (상세 화면 이동)
  const handleQuickExpand = (partialDecision: Partial<Decision>) => {
    const newDecision = createQuickDecision(partialDecision);
    setCurrentDecisionId(newDecision.id);
    setCurrentView('detail');
  };

  const handleCreateSubDecision = (parentId: string) => {
    const now = new Date();
    const timeBudget = IMPORTANCE_LEVELS.LOW.minutes; // Sub-decisions default to LOW importance
    const deadline = new Date(now.getTime() + timeBudget * 60 * 1000);
    const baseId = Date.now();

    // Find parent decision to inherit category
    const parentDecision = decisions.find(d => d.id === parentId);
    const parentCategory = parentDecision?.category || t.defaultCategory;

    // Get existing sub-decisions for this parent to determine order
    const existingSubDecisions = decisions.filter(d => d.parentId === parentId);
    const maxOrder = existingSubDecisions.length > 0
      ? Math.max(...existingSubDecisions.map(d => d.order || 0))
      : -1;

    const newSubDecision: Decision = {
      id: baseId.toString(),
      title: '',
      category: parentCategory, // Inherit parent's category
      importance: 'LOW',
      timeBudget,
      deadline: deadline.toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: `${baseId}-1`,
          title: t.doOption,
          isSelected: false,
        },
        {
          id: `${baseId}-2`,
          title: t.doNotOption,
          isSelected: false,
        },
      ],
      order: maxOrder + 1,
      parentId, // Link to parent decision
      mode: DEFAULT_DECISION_MODE,
    };

    setDecisions([...decisions, newSubDecision]);
    // Track initial sub-decision count (0 for new decision)
    setInitialSubDecisionCounts(prev => ({
      ...prev,
      [newSubDecision.id]: 0,
    }));
    // 목록에만 추가하고 현재 화면에 머무름 (사용자가 목록에서 선택해야 이동)
  };

  const handleUpdateDecision = (updatedDecision: Decision) => {
    setDecisions(decisions.map((d) => {
      if (d.id !== updatedDecision.id) return d;
      // 샘플을 유저가 수정하면 isExample 제거 → 재시작 시 템플릿으로 덮어쓰지 않음
      if (updatedDecision.isExample) {
        const rest = { ...updatedDecision };
        delete rest.isExample;
        return rest as Decision;
      }
      return updatedDecision;
    }));
  };

  const handleDeleteDecision = (decisionId: string) => {
    // When deleting a parent decision, also delete all its sub-decisions
    const deletedIds = [decisionId, ...decisions.filter(d => d.parentId === decisionId).map(d => d.id)];

    // Track sample deletions so they aren't re-injected on next load
    deletedIds.forEach(id => markSampleAsDeleted(id));

    setDecisions(decisions.filter((d) => 
      d.id !== decisionId && d.parentId !== decisionId
    ));
    
    // Clean up initial sub-decision counts
    setInitialSubDecisionCounts(prev => {
      const newCounts = { ...prev };
      deletedIds.forEach(id => delete newCounts[id]);
      return newCounts;
    });
  };

  const handleReorderDecisions = (reorderedDecisions: Decision[]) => {
    setDecisions(reorderedDecisions);
  };

  const handleTrimDecision = (decisionId: string) => {
    setDecisions(decisions.map((d) => {
      if (d.id !== decisionId) return d;
      // trim 시 isExample 제거 → 재시작 시 템플릿으로 원상복구되지 않음
      const rest = { ...d };
      delete rest.isExample;
      return Object.assign(rest, { resolved: true, resolvedAt: new Date().toISOString() });
    }));
  };

  const handleReopenDecision = (decisionId: string) => {
    setDecisions(decisions.map((d) => {
      if (d.id !== decisionId) return d;
      // reopen 시에도 isExample 제거 → 유저가 조작한 것으로 간주
      const rest = { ...d };
      delete rest.isExample;
      return Object.assign(rest, { resolved: false, resolvedAt: undefined });
    }));
  };

  const handleSelectDecision = (decisionId: string) => {
    setCurrentDecisionId(decisionId);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentDecisionId(null);
  };

  const handleUpdateCategories = (newCategories: string[]) => {
    setCategories(newCategories);
  };

  const handleReorderSubDecisions = (parentId: string, reorderedSubDecisionIds: string[]) => {
    // Create a map of new order values
    const orderMap: Record<string, number> = {};
    reorderedSubDecisionIds.forEach((id, index) => {
      orderMap[id] = index;
    });
    
    // Update decisions with new order values
    setDecisions(decisions.map((d) => {
      if (d.parentId === parentId && orderMap[d.id] !== undefined) {
        return { ...d, order: orderMap[d.id] };
      }
      return d;
    }));
  };

  const currentDecision = decisions.find((d) => d.id === currentDecisionId);

  if (currentView === 'detail' && currentDecision) {
    return (
      <DecisionDetail
        key={currentDecision.id}
        decision={currentDecision}
        decisions={decisions}
        categories={categories}
        initialSubDecisionCount={initialSubDecisionCounts[currentDecision.id] ?? decisions.filter(d => d.parentId === currentDecision.id).length}
        onBack={handleBackToDashboard}
        onUpdate={handleUpdateDecision}
        onDelete={() => handleDeleteDecision(currentDecision.id)}
        onCreateSubDecision={handleCreateSubDecision}
        onSelectDecision={handleSelectDecision}
        onReorderSubDecisions={handleReorderSubDecisions}
      />
    );
  }

  return (
    <>
      {/* iOS 키보드 선점용 숨겨진 input — 사용자 탭 체인에서 즉시 포커스하여 키보드 활성화 */}
      <input
        ref={keyboardProxyRef}
        type="text"
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', opacity: 0, width: 0, height: 0 }}
      />

      <Dashboard
        decisions={decisions}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
        onCreateDecision={handleCreateDecision}
        onSelectDecision={handleSelectDecision}
        onDeleteDecision={handleDeleteDecision}
        onReorderDecisions={handleReorderDecisions}
        onUpdateDecision={handleUpdateDecision}
        onTrimDecision={handleTrimDecision}
        onReopenDecision={handleReopenDecision}
        onUpdateCategories={handleUpdateCategories}
      />

      {/* 1단계: Decision Type 선택 Bottom Sheet */}
      <TypeSelectionSheet
        isOpen={showTypeSelection}
        onClose={() => setShowTypeSelection(false)}
        onTypeSelect={handleTypeSelect}
      />

      {/* 2단계: 간이 작성 Bottom Sheet (do_or_not / choose_best) */}
      {quickEditorType && (
        <QuickDecisionSheet
          isOpen={!!quickEditorType}
          decisionType={quickEditorType}
          categories={categories}
          onClose={() => setQuickEditorType(null)}
          onComplete={handleQuickComplete}
          onExpand={handleQuickExpand}
        />
      )}
    </>
  );
}

export default App;
