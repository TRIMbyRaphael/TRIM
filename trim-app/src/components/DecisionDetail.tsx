import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Plus, ChevronDown, ChevronRight, Info, Clock, FileText, Trash2 } from 'lucide-react';
import { Decision, IMPORTANCE_LEVELS, ImportanceLevel } from '../types/decision';
import TimeBudgetModal from './TimeBudgetModal';

interface DecisionDetailProps {
  decision: Decision;
  onBack: () => void;
  onUpdate: (decision: Decision) => void;
  onDelete: () => void;
}

export default function DecisionDetail({ decision, onBack, onUpdate, onDelete }: DecisionDetailProps) {
  const [localDecision, setLocalDecision] = useState<Decision>(decision);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [showTimeBudgetModal, setShowTimeBudgetModal] = useState(false);
  const [showDecisionFraming, setShowDecisionFraming] = useState(false);
  const [showDecisionMemo, setShowDecisionMemo] = useState(false);
  const [showOptionMemos, setShowOptionMemos] = useState<{ [key: string]: boolean }>({});

  // Auto-save when localDecision changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(localDecision);
    }, 500);

    return () => clearTimeout(timer);
  }, [localDecision, onUpdate]);

  const handleTitleChange = (title: string) => {
    setLocalDecision({ ...localDecision, title });
  };

  const handleDecisionMemoChange = (memo: string) => {
    setLocalDecision({ ...localDecision, memo });
  };

  const toggleOptionMemo = (optionId: string) => {
    setShowOptionMemos({
      ...showOptionMemos,
      [optionId]: !showOptionMemos[optionId],
    });
  };

  const handleOptionMemoChange = (optionId: string, memo: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, memo } : opt
      ),
    });
  };

  const handleCategoryChange = (category: 'Life' | 'Work') => {
    setLocalDecision({ ...localDecision, category });
    setShowCategoryDropdown(false);
  };

  const handleImportanceChange = (importance: ImportanceLevel) => {
    const timeBudget = IMPORTANCE_LEVELS[importance].minutes;
    const deadline = new Date(Date.now() + timeBudget * 60 * 1000).toISOString();
    
    setLocalDecision({
      ...localDecision,
      importance,
      timeBudget,
      deadline,
    });
    setShowImportanceDropdown(false);
  };

  const handleTimeBudgetConfirm = (deadline: string, timeBudget: number) => {
    setLocalDecision({
      ...localDecision,
      deadline,
      timeBudget,
    });
  };

  const handleAddOption = () => {
    const newOption = {
      id: Date.now().toString(),
      title: '',
      isSelected: false,
    };
    setLocalDecision({
      ...localDecision,
      options: [...localDecision.options, newOption],
    });
  };

  const handleOptionChange = (optionId: string, title: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, title } : opt
      ),
    });
  };

  const handleOptionFocus = (optionId: string, currentTitle: string) => {
    // 기본 프리셋 텍스트면 빈칸으로 만들기
    if (currentTitle === 'Do' || currentTitle === 'Do Not') {
      setLocalDecision({
        ...localDecision,
        options: localDecision.options.map((opt) =>
          opt.id === optionId ? { ...opt, title: '' } : opt
        ),
      });
    }
  };

  const handleOptionBlur = (optionId: string, currentTitle: string) => {
    // 빈칸이면 원래 프리셋으로 복구
    if (currentTitle.trim() === '') {
      const optionIndex = localDecision.options.findIndex(opt => opt.id === optionId);
      const originalTitle = optionIndex === 0 ? 'Do' : optionIndex === 1 ? 'Do Not' : '';
      
      if (originalTitle) {
        setLocalDecision({
          ...localDecision,
          options: localDecision.options.map((opt) =>
            opt.id === optionId ? { ...opt, title: originalTitle } : opt
          ),
        });
      }
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) => ({
        ...opt,
        isSelected: opt.id === optionId,
      })),
    });
  };

  const handleDeleteOption = (optionId: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.filter((opt) => opt.id !== optionId),
    });
  };

  const handleRandomPick = () => {
    if (localDecision.options.length < 2) return;

    // Pick a random option
    const randomIndex = Math.floor(Math.random() * localDecision.options.length);
    
    // Set isSelected = true for the picked option, false for others
    const updatedOptions = localDecision.options.map((opt, index) => ({
      ...opt,
      isSelected: index === randomIndex,
    }));

    setLocalDecision({
      ...localDecision,
      options: updatedOptions,
    });
  };

  const handleTrim = () => {
    const trimmedDecision = {
      ...localDecision,
      resolved: true,
      resolvedAt: new Date().toISOString(),
    };
    onUpdate(trimmedDecision);
    onBack();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this decision?')) {
      onDelete();
      onBack();
    }
  };

  const handleFramingChange = (field: keyof typeof localDecision.framing, value: string) => {
    setLocalDecision({
      ...localDecision,
      framing: {
        ...localDecision.framing,
        [field]: value,
      },
    });
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    const minutes = localDecision.timeBudget;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-cloudDancer">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stretchLimo" />
        </button>

        {/* Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-stretchLimo">{localDecision.category}</span>
            <ChevronDown className="w-4 h-4 text-stretchLimo" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              <button
                onClick={() => handleCategoryChange('Life')}
                className="block w-full px-6 py-2 text-left hover:bg-gray-100 text-stretchLimo"
              >
                Life
              </button>
              <button
                onClick={() => handleCategoryChange('Work')}
                className="block w-full px-6 py-2 text-left hover:bg-gray-100 text-stretchLimo"
              >
                Work
              </button>
            </div>
          )}
        </div>

        {/* Kebab Menu */}
        <div className="relative">
          <button
            onClick={() => setShowKebabMenu(!showKebabMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-stretchLimo" />
          </button>

          {showKebabMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              <button
                onClick={handleDelete}
                className="block w-full px-6 py-2 text-left hover:bg-gray-100 text-scarletSmile whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Title Input */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localDecision.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="What's cluttering your mind?"
              className="flex-1 text-xl font-medium text-stretchLimo bg-transparent border-none outline-none placeholder-micron"
            />
            <button
              onClick={() => setShowDecisionMemo(!showDecisionMemo)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className={`w-5 h-5 ${localDecision.memo ? 'text-stretchLimo' : 'text-micron'}`} />
            </button>
          </div>

          {/* Decision Memo */}
          {showDecisionMemo && (
            <textarea
              value={localDecision.memo || ''}
              onChange={(e) => handleDecisionMemoChange(e.target.value)}
              placeholder="Add notes about this decision..."
              className="w-full mt-3 px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
              rows={3}
            />
          )}
        </div>

        {/* Options List */}
        <div className="space-y-3 mb-6">
          {localDecision.options.map((option) => (
            <div key={option.id}>
              <div
                className={`rounded-lg p-4 flex items-center gap-3 group transition-colors ${
                  option.isSelected 
                    ? 'bg-stretchLimo bg-opacity-10 border-2 border-stretchLimo' 
                    : 'bg-white'
                }`}
              >
                <button
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-5 h-5 rounded-full border-2 border-stretchLimo flex-shrink-0 flex items-center justify-center ${
                    option.isSelected ? 'bg-stretchLimo' : ''
                  } hover:bg-opacity-70 transition-colors`}
                >
                  {option.isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </button>
                <input
                  type="text"
                  value={option.title}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  onFocus={() => handleOptionFocus(option.id, option.title)}
                  onBlur={() => handleOptionBlur(option.id, option.title)}
                  placeholder="Option"
                  className={`flex-1 text-base bg-transparent border-none outline-none placeholder-micron ${
                    option.isSelected ? 'text-stretchLimo font-medium' : 'text-stretchLimo'
                  }`}
                />
                <button
                  onClick={() => toggleOptionMemo(option.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-opacity"
                >
                  <FileText className={`w-4 h-4 ${option.memo ? 'text-stretchLimo' : 'text-micron'}`} />
                </button>
                <button
                  onClick={() => handleDeleteOption(option.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-scarletSmile hover:bg-opacity-10 rounded"
                >
                  <Trash2 className="w-4 h-4 text-scarletSmile" />
                </button>
              </div>

              {/* Option Memo */}
              {showOptionMemos[option.id] && (
                <textarea
                  value={option.memo || ''}
                  onChange={(e) => handleOptionMemoChange(option.id, e.target.value)}
                  placeholder="Add notes about this option..."
                  className="w-full mt-2 px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={2}
                />
              )}
            </div>
          ))}

          {/* Add Option Button */}
          <button
            onClick={handleAddOption}
            className="w-full bg-white rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-micron"
          >
            <Plus className="w-5 h-5" />
            <span className="text-base">Add Option</span>
          </button>
        </div>

        {/* TRIM Button */}
        <button
          onClick={handleTrim}
          disabled={!localDecision.options.some(opt => opt.isSelected)}
          className={`w-full rounded-lg py-4 text-lg font-bold transition-colors mb-4 ${
            localDecision.options.some(opt => opt.isSelected)
              ? 'bg-stretchLimo text-white hover:bg-opacity-90'
              : 'bg-gray-100 text-micron cursor-not-allowed'
          }`}
        >
          TRIM
        </button>

        {/* Random Pick Button */}
        <button
          onClick={handleRandomPick}
          disabled={localDecision.options.length < 2}
          className={`w-full rounded-lg py-4 text-base font-medium mb-8 flex items-center justify-center gap-2 transition-colors ${
            localDecision.options.length >= 2
              ? 'bg-white text-stretchLimo hover:bg-gray-50 border-2 border-stretchLimo'
              : 'bg-gray-100 text-micron cursor-not-allowed'
          }`}
        >
          <span className="text-xl">🎲</span>
          <span>Random Pick</span>
        </button>

        {/* Settings Section */}
        <div className="bg-white rounded-lg divide-y divide-gray-200">
          {/* Importance */}
          <div className="relative">
            <button
              onClick={() => setShowImportanceDropdown(!showImportanceDropdown)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-micron" />
                <span className="text-base text-stretchLimo">Importance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base text-stretchLimo">
                  {IMPORTANCE_LEVELS[localDecision.importance].label}
                </span>
                <ChevronDown className="w-4 h-4 text-micron" />
              </div>
            </button>

            {/* Importance Dropdown */}
            {showImportanceDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
                {(Object.keys(IMPORTANCE_LEVELS) as ImportanceLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleImportanceChange(level)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors ${
                      localDecision.importance === level ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base text-stretchLimo">
                        {IMPORTANCE_LEVELS[level].label}
                      </span>
                      <span className="text-sm text-micron">
                        {IMPORTANCE_LEVELS[level].minutes < 60
                          ? `${IMPORTANCE_LEVELS[level].minutes}분`
                          : IMPORTANCE_LEVELS[level].minutes < 1440
                          ? `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 60)}시간`
                          : `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 1440)}일`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Budget */}
          <button
            onClick={() => setShowTimeBudgetModal(true)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-micron" />
              <span className="text-base text-stretchLimo">Time Budget</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base text-stretchLimo">
                {getTimeRemaining()}
              </span>
              <ChevronRight className="w-4 h-4 text-micron" />
            </div>
          </button>
        </div>

        {/* Decision Framing Section */}
        <div className="bg-white rounded-lg mt-6">
          <button
            onClick={() => setShowDecisionFraming(!showDecisionFraming)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-stretchLimo">Decision Framing</h3>
              {showDecisionFraming ? (
                <ChevronDown className="w-4 h-4 text-micron" />
              ) : (
                <ChevronRight className="w-4 h-4 text-micron" />
              )}
            </div>
          </button>

          {showDecisionFraming && (
            <div className="px-4 pb-4 space-y-4">
              {/* What happened? */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-2">
                  What happened?
                </label>
                <textarea
                  value={localDecision.framing?.whatHappened || ''}
                  onChange={(e) => handleFramingChange('whatHappened', e.target.value)}
                  placeholder="Describe the situation..."
                  className="w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={3}
                />
              </div>

              {/* What am I trying to achieve? */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-2">
                  What am I trying to achieve?
                </label>
                <textarea
                  value={localDecision.framing?.goal || ''}
                  onChange={(e) => handleFramingChange('goal', e.target.value)}
                  placeholder="What's your goal..."
                  className="w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={3}
                />
              </div>

              {/* Fixed constraints? */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-2">
                  Fixed constraints?
                </label>
                <textarea
                  value={localDecision.framing?.constraints || ''}
                  onChange={(e) => handleFramingChange('constraints', e.target.value)}
                  placeholder="What can't be changed..."
                  className="w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={3}
                />
              </div>

              {/* Deal-breakers? */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-2">
                  Deal-breakers?
                </label>
                <textarea
                  value={localDecision.framing?.dealbreakers || ''}
                  onChange={(e) => handleFramingChange('dealbreakers', e.target.value)}
                  placeholder="What would make you reject an option..."
                  className="w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={3}
                />
              </div>

              {/* Key factors? */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-2">
                  Key factors?
                </label>
                <textarea
                  value={localDecision.framing?.keyFactors || ''}
                  onChange={(e) => handleFramingChange('keyFactors', e.target.value)}
                  placeholder="What matters most in this decision..."
                  className="w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Budget Modal */}
      {showTimeBudgetModal && (
        <TimeBudgetModal
          initialDeadline={localDecision.deadline}
          onConfirm={handleTimeBudgetConfirm}
          onClose={() => setShowTimeBudgetModal(false)}
        />
      )}
    </div>
  );
}
