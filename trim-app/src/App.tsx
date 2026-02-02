import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DecisionDetail from './components/DecisionDetail';
import { Decision, IMPORTANCE_LEVELS } from './types/decision';
import { loadDecisions, saveDecisions } from './utils/storage';

type View = 'dashboard' | 'detail';

function App() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load decisions on mount
  useEffect(() => {
    const loaded = loadDecisions();
    setDecisions(loaded);
    setIsInitialLoad(false);
  }, []);

  // Save decisions whenever they change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      saveDecisions(decisions);
    }
  }, [decisions, isInitialLoad]);

  const handleCreateDecision = () => {
    const now = new Date();
    const timeBudget = IMPORTANCE_LEVELS.MEDIUM.minutes;
    const deadline = new Date(now.getTime() + timeBudget * 60 * 1000);
    const baseId = Date.now();

    const newDecision: Decision = {
      id: baseId.toString(),
      title: '',
      category: 'Life',
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
      order: decisions.length,
    };

    setDecisions([...decisions, newDecision]);
    setCurrentDecisionId(newDecision.id);
    setCurrentView('detail');
  };

  const handleCreateSubDecision = (parentId: string) => {
    const now = new Date();
    const timeBudget = IMPORTANCE_LEVELS.LOW.minutes; // Sub-decisions default to LOW importance
    const deadline = new Date(now.getTime() + timeBudget * 60 * 1000);
    const baseId = Date.now();

    const newSubDecision: Decision = {
      id: baseId.toString(),
      title: '',
      category: 'Life',
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
      order: decisions.length,
      parentId, // Link to parent decision
    };

    setDecisions([...decisions, newSubDecision]);
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
    setDecisions(decisions.filter((d) => 
      d.id !== decisionId && d.parentId !== decisionId
    ));
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

  const handleSelectDecision = (decisionId: string) => {
    setCurrentDecisionId(decisionId);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentDecisionId(null);
  };

  const currentDecision = decisions.find((d) => d.id === currentDecisionId);

  if (currentView === 'detail' && currentDecision) {
    return (
      <DecisionDetail
        decision={currentDecision}
        decisions={decisions}
        onBack={handleBackToDashboard}
        onUpdate={handleUpdateDecision}
        onDelete={() => handleDeleteDecision(currentDecision.id)}
        onCreateSubDecision={handleCreateSubDecision}
        onSelectDecision={handleSelectDecision}
      />
    );
  }

  return (
    <Dashboard
      decisions={decisions}
      onCreateDecision={handleCreateDecision}
      onSelectDecision={handleSelectDecision}
      onDeleteDecision={handleDeleteDecision}
      onReorderDecisions={handleReorderDecisions}
      onUpdateDecision={handleUpdateDecision}
      onTrimDecision={handleTrimDecision}
    />
  );
}

export default App;
