import { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import DecisionDetail from './components/DecisionDetail';
import TypeSelectionSheet from './components/TypeSelectionSheet';
import QuickDecisionSheet from './components/QuickDecisionSheet';
import { Decision, IMPORTANCE_LEVELS, DecisionMode, DEFAULT_DECISION_MODE } from './types/decision';
import { loadDecisions, saveDecisions, loadCategories, saveCategories } from './utils/storage';
import { t } from './i18n';

type View = 'dashboard' | 'detail';

function App() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track initial sub-decision count for each decision
  const [initialSubDecisionCounts, setInitialSubDecisionCounts] = useState<Record<string, number>>({});

  // Type Selection & Quick Editor states
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [quickEditorType, setQuickEditorType] = useState<'do_or_not' | 'choose_best' | null>(null);

  // iOS 키보드 선점용 숨겨진 input ref
  const keyboardProxyRef = useRef<HTMLInputElement>(null);

  // Load decisions and categories on mount
  useEffect(() => {
    const loaded = loadDecisions();
    const loadedCategories = loadCategories();
    setDecisions(loaded);
    setCategories(loadedCategories);
    
    // Initialize sub-decision counts for loaded decisions
    const initialCounts: Record<string, number> = {};
    loaded.forEach(decision => {
      initialCounts[decision.id] = loaded.filter(d => d.parentId === decision.id).length;
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
      // 키보드가 열리기 전에 배경(Dashboard) 위치 고정 — 뷰포트 변화 시 배경 이동 방지
      const dashboard = document.getElementById('dashboard-scroll');
      if (dashboard) {
        const scrollTop = dashboard.scrollTop;
        dashboard.dataset.lockedScrollTop = String(scrollTop);
        dashboard.style.position = 'fixed';
        dashboard.style.top = `-${scrollTop}px`;
        dashboard.style.left = '0';
        dashboard.style.right = '0';
        dashboard.style.height = 'auto';
        dashboard.style.overflow = 'hidden';
        dashboard.scrollTop = 0;
      }
      // 사용자 탭 이벤트 체인 안에서 즉시 숨겨진 input 포커스 → iOS 키보드 선점
      keyboardProxyRef.current?.focus();
      // do_or_not / choose_best → 간이 작성 화면 표시
      setQuickEditorType(type as 'do_or_not' | 'choose_best');
    }
  };

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
      category: categories[0] || t.defaultCategory,
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

  // 간이 작성 완료 → Decision 생성 후 상세 화면 이동
  const handleQuickComplete = (partialDecision: Partial<Decision>) => {
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
    setCurrentDecisionId(newDecision.id);
    setCurrentView('detail');
  };

  // 간이 작성 → 전체 편집기로 확장
  const handleQuickExpand = (partialDecision: Partial<Decision>) => {
    // 동일하게 Decision 생성 후 전체 편집기로 이동
    handleQuickComplete(partialDecision);
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
    setDecisions(decisions.map((d) => 
      d.id === updatedDecision.id ? updatedDecision : d
    ));
  };

  const handleDeleteDecision = (decisionId: string) => {
    // When deleting a parent decision, also delete all its sub-decisions
    const deletedIds = [decisionId, ...decisions.filter(d => d.parentId === decisionId).map(d => d.id)];
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
    setDecisions(decisions.map((d) => 
      d.id === decisionId
        ? { ...d, resolved: true, resolvedAt: new Date().toISOString() }
        : d
    ));
  };

  const handleReopenDecision = (decisionId: string) => {
    setDecisions(decisions.map((d) => 
      d.id === decisionId
        ? { ...d, resolved: false, resolvedAt: undefined }
        : d
    ));
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
