import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, ChevronDown, AlertCircle, Clock, Maximize2, Check, FolderOpen } from 'lucide-react';
import { Decision, Option, IMPORTANCE_LEVELS, ImportanceLevel, DecisionMode } from '../types/decision';
import TimeBudgetModal from './TimeBudgetModal';
import { t } from '../i18n';

interface QuickDecisionSheetProps {
  isOpen: boolean;
  decisionType: 'do_or_not' | 'choose_best';
  categories: string[];
  onClose: () => void;
  onComplete: (decision: Partial<Decision>) => void;
  onExpand: (decision: Partial<Decision>) => void;
}

export default function QuickDecisionSheet({
  isOpen,
  decisionType,
  categories,
  onClose,
  onComplete,
  onExpand,
}: QuickDecisionSheetProps) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<Option[]>(() => initOptions(decisionType));
  const [category, setCategory] = useState(categories[0] || t.defaultCategory);
  const [importance, setImportance] = useState<ImportanceLevel>('MEDIUM');
  const [timeBudget, setTimeBudget] = useState(IMPORTANCE_LEVELS.MEDIUM.minutes);
  // deadline은 사용자가 TimeBudgetModal에서 직접 설정한 경우에만 저장
  // null이면 complete/expand 시점에 timeBudget 기준으로 계산
  const [customDeadline, setCustomDeadline] = useState<string | null>(null);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [showTimeBudgetModal, setShowTimeBudgetModal] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const importanceDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize options based on decision type
  function initOptions(type: DecisionMode): Option[] {
    const ts = Date.now();
    if (type === 'do_or_not') {
      return [
        { id: `${ts}-1`, title: t.doOption, isSelected: false },
        { id: `${ts}-2`, title: t.doNotOption, isSelected: false },
      ];
    }
    // choose_best
    return [
      { id: `${ts}-1`, title: '', isSelected: false },
      { id: `${ts}-2`, title: '', isSelected: false },
    ];
  }

  // Reset state when type changes
  useEffect(() => {
    setOptions(initOptions(decisionType));
    setTitle('');
  }, [decisionType]);

  // 시트가 열려 있을 때 배경 스크롤 차단 (iOS 키보드 올라올 때 포함)
  useEffect(() => {
    if (isOpen) {
      const html = document.documentElement;
      const body = document.body;
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';

      // 모든 touchmove 차단 — 시트 내부에 스크롤 가능 콘텐츠 없음
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };
      document.addEventListener('touchmove', preventScroll, { passive: false });

      return () => {
        html.style.overflow = '';
        html.style.height = '';
        body.style.overflow = '';
        body.style.height = '';
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isOpen]);

  // 키보드가 이미 프록시 input으로 열린 상태 → 실제 textarea로 포커스 이전
  useEffect(() => {
    if (isOpen) {
      // 짧은 딜레이 후 실제 textarea로 포커스 이전 (키보드는 이미 열려 있음)
      const timer = setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showCategoryDropdown && categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setShowCategoryDropdown(false);
      }
      if (showImportanceDropdown && importanceDropdownRef.current && !importanceDropdownRef.current.contains(target)) {
        setShowImportanceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown, showImportanceDropdown]);

  // Build partial decision data — deadline은 이 시점에 계산 (카운트다운 시작)
  const buildDecision = (): Partial<Decision> => {
    const finalDeadline = customDeadline
      || new Date(Date.now() + timeBudget * 60 * 1000).toISOString();
    return {
      title,
      category,
      importance,
      timeBudget,
      deadline: finalDeadline,
      mode: decisionType,
      options: options.filter(opt => opt.title.trim() !== '' || decisionType === 'do_or_not'),
    };
  };

  // Handle option text change (choose_best only)
  const handleOptionChange = (optionId: string, value: string) => {
    setOptions(options.map(opt =>
      opt.id === optionId ? { ...opt, title: value } : opt
    ));
  };

  // Add new option (choose_best only)
  const handleAddOption = () => {
    const newOption: Option = {
      id: Date.now().toString(),
      title: '',
      isSelected: false,
    };
    setOptions([...options, newOption]);
    // Focus the new option
    setTimeout(() => {
      optionRefs.current[newOption.id]?.focus();
    }, 50);
  };

  // Remove option (choose_best only, minimum 2)
  const handleRemoveOption = (optionId: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(opt => opt.id !== optionId));
  };

  // Importance change — timeBudget만 갱신, deadline은 아직 계산하지 않음
  const handleImportanceChange = (level: ImportanceLevel) => {
    setImportance(level);
    setTimeBudget(IMPORTANCE_LEVELS[level].minutes);
    setCustomDeadline(null); // 중요도 변경 시 사용자 지정 deadline 초기화
    setShowImportanceDropdown(false);
  };

  // Category change
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setShowCategoryDropdown(false);
  };

  // Time budget change (from modal) — 사용자가 직접 설정한 deadline 저장
  const handleTimeBudgetConfirm = (newDeadline: string, newTimeBudget: number) => {
    setCustomDeadline(newDeadline);
    setTimeBudget(newTimeBudget);
    setShowTimeBudgetModal(false);
  };

  // Handle complete
  const handleComplete = () => {
    onComplete(buildDecision());
  };

  // Handle expand to full editor
  const handleExpand = () => {
    onExpand(buildDecision());
  };

  // Format time for compact display — 카운트다운이 아닌 정적 시간 예산 표시
  const formatCompactTime = () => {
    if (customDeadline) {
      // 사용자가 직접 설정한 경우: 남은 시간 표시 (정적, 실시간 갱신 아님)
      const diffMs = new Date(customDeadline).getTime() - Date.now();
      if (diffMs <= 0) return '0m';
      const totalMinutes = Math.floor(diffMs / 60000);
      if (totalMinutes < 60) return `${totalMinutes}m`;
      const hours = Math.floor(totalMinutes / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
    // 기본: timeBudget 기반 정적 표시 (카운트다운 없음)
    if (timeBudget < 60) return `${timeBudget}${t.minute}`;
    if (timeBudget < 1440) return `${Math.floor(timeBudget / 60)}${t.hour}`;
    return `${Math.floor(timeBudget / 1440)}${t.day}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="quick-sheet-content bg-cardBg rounded-t-2xl shadow-lg border-t border-stretchLimo/10">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-stretchLimo200 rounded-full" />
          </div>

          <div className="max-w-2xl mx-auto px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
            {/* Title Row */}
            <div className="flex items-start gap-2 mb-3">
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder={t.titlePlaceholder.replace(/\n/g, ' ')}
                rows={1}
                className="flex-1 text-base font-medium text-black bg-transparent border-none outline-none placeholder-stretchLimo300 resize-none overflow-hidden mt-1"
              />
              <button
                onClick={handleExpand}
                className="p-2 rounded-lg hover:bg-stretchLimo100 transition-colors flex-shrink-0"
                title={t.quickExpandTooltip}
              >
                <Maximize2 className="w-5 h-5 text-stretchLimo" />
              </button>
            </div>

            {/* Options Area */}
            <div className="space-y-2 mb-3">
              {decisionType === 'do_or_not' ? (
                /* Do or Not: Fixed options, non-editable */
                <>
                  {options.map((option) => (
                    <div
                      key={option.id}
                      className="bg-cloudDancer rounded-lg py-2.5 px-3 border border-stretchLimo/10"
                    >
                      <span className="text-sm text-stretchLimo">{option.title}</span>
                    </div>
                  ))}
                </>
              ) : (
                /* Choose Best: Editable options with delete */
                <>
                  {options.map((option, index) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-2 bg-cloudDancer rounded-lg py-2 px-3 border border-stretchLimo/10"
                    >
                      <input
                        ref={(el) => (optionRefs.current[option.id] = el)}
                        type="text"
                        value={option.title}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        placeholder={`${t.option} ${String.fromCharCode(65 + index)}`}
                        className="flex-1 text-sm text-black bg-transparent border-none outline-none placeholder-stretchLimo300"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(option.id)}
                          className="p-1 rounded hover:bg-stretchLimo100 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-micron" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Option */}
                  <button
                    onClick={handleAddOption}
                    className="w-full flex items-center gap-2 py-2 px-3 text-micron hover:text-stretchLimo transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">{t.addOption}</span>
                  </button>
                </>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-stretchLimo/[0.06]">
              {/* Category Selector (compact) */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stretchLimo hover:bg-stretchLimo50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="max-w-[60px] truncate">{category}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute bottom-full mb-1 left-0 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/10 overflow-hidden z-10 min-w-[120px]">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-stretchLimo100 text-stretchLimo whitespace-nowrap ${
                          category === cat ? 'bg-stretchLimo50' : ''
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Importance Selector (compact) */}
              <div className="relative" ref={importanceDropdownRef}>
                <button
                  onClick={() => setShowImportanceDropdown(!showImportanceDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stretchLimo hover:bg-stretchLimo50 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{t.importanceLevels[importance]}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showImportanceDropdown && (
                  <div className="absolute bottom-full mb-1 left-0 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/10 overflow-hidden z-10 min-w-[140px]">
                    {(Object.keys(IMPORTANCE_LEVELS) as ImportanceLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => handleImportanceChange(level)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-stretchLimo100 transition-colors ${
                          importance === level ? 'bg-stretchLimo50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-stretchLimo">
                            {t.importanceLevels[level]}
                          </span>
                          <span className="text-xs text-micron">
                            {IMPORTANCE_LEVELS[level].minutes < 60
                              ? `${IMPORTANCE_LEVELS[level].minutes}${t.minute}`
                              : IMPORTANCE_LEVELS[level].minutes === 1440
                              ? `24${t.hour}`
                              : IMPORTANCE_LEVELS[level].minutes < 1440
                              ? `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 60)}${t.hour}`
                              : `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 1440)}${t.days}`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Budget Selector (compact) */}
              <button
                onClick={() => setShowTimeBudgetModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stretchLimo hover:bg-stretchLimo50 transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>{formatCompactTime()}</span>
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                disabled={!title.trim()}
                className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                  title.trim()
                    ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                    : 'bg-stretchLimo100 text-stretchLimo300 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Safe area는 위 컨테이너 pb에 통합됨 */}
        </div>
      </div>

      {/* Time Budget Modal */}
      {showTimeBudgetModal && (
        <TimeBudgetModal
          initialDeadline={customDeadline || new Date(Date.now() + timeBudget * 60 * 1000).toISOString()}
          initialTimeBudget={timeBudget}
          onConfirm={handleTimeBudgetConfirm}
          onClose={() => setShowTimeBudgetModal(false)}
        />
      )}
    </>
  );
}
