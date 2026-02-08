import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DecisionDetail from './components/DecisionDetail';
import { Decision, IMPORTANCE_LEVELS, DEFAULT_DECISION_MODE } from './types/decision';
import { loadDecisions, saveDecisions, loadCategories, saveCategories } from './utils/storage';

type View = 'dashboard' | 'detail';

function App() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track initial sub-decision count for each decision
  const [initialSubDecisionCounts, setInitialSubDecisionCounts] = useState<Record<string, number>>({});

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

  const handleCreateDecision = () => {
    const now = new Date();
    const timeBudget = IMPORTANCE_LEVELS.MEDIUM.minutes;
    const deadline = new Date(now.getTime() + timeBudget * 60 * 1000);
    const baseId = Date.now();

    // 새 사안을 맨 위에 표시하기 위해 order를 최소값으로 설정
    const activeDecisions = decisions.filter(d => !d.resolved && !d.parentId);
    const minOrder = activeDecisions.length > 0 
      ? Math.min(...activeDecisions.map(d => d.order || 0)) - 1 
      : 0;

    const newDecision: Decision = {
      id: baseId.toString(),
      title: '',
      category: categories[0] || 'Life',
      importance: 'MEDIUM',
      timeBudget,
      deadline: deadline.toISOString(),
      createdAt: now.toISOString(),
      resolved: false,
      options: [
        {
          id: `${baseId}-1`,
          title: 'Do',
          isSelected: false,
        },
        {
          id: `${baseId}-2`,
          title: 'Do Not',
          isSelected: false,
        },
      ],
      order: minOrder,
      mode: DEFAULT_DECISION_MODE,
    };

    setDecisions([...decisions, newDecision]);
    // Track initial sub-decision count (0 for new decision)
    setInitialSubDecisionCounts(prev => ({
      ...prev,
      [newDecision.id]: 0,
    }));
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
    const parentCategory = parentDecision?.category || 'Life';

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
          title: 'Do',
          isSelected: false,
        },
        {
          id: `${baseId}-2`,
          title: 'Do Not',
          isSelected: false,
        },
      ],
      order: maxOrder + 1,
      parentId, // Link to parent decision
    };

    setDecisions([...decisions, newSubDecision]);
    // Track initial sub-decision count (0 for new decision)
    setInitialSubDecisionCounts(prev => ({
      ...prev,
      [newSubDecision.id]: 0,
    }));
    setCurrentDecisionId(newSubDecision.id);
    setCurrentView('detail');
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
    // Get all sub-decisions for this parent
    const subDecisions = decisions.filter(d => d.parentId === parentId);
    
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
  );
}

export default App;
