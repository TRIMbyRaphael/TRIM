import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Plus, ChevronDown, ChevronRight, Info, Clock, Brain, FileText, Trash2, Link as LinkIcon, Edit, Home, GripVertical, Shuffle } from 'lucide-react';
import { Decision, Option, IMPORTANCE_LEVELS, ImportanceLevel, Link, DecisionMode, DECISION_MODES, DEFAULT_DECISION_MODE } from '../types/decision';
import TimeBudgetModal from './TimeBudgetModal';
import { fetchOpenGraphData } from '../utils/linkPreview';
import { useCountdown } from '../hooks/useCountdown';
import { formatTimeRemaining } from '../utils/timeFormat';
import { t } from '../i18n';

interface DecisionDetailProps {
  decision: Decision;
  decisions: Decision[]; // All decisions for sub-decision lookup
  categories: string[];
  initialSubDecisionCount: number; // Initial sub-decision count for change detection
  onBack: () => void;
  onUpdate: (decision: Decision) => void;
  onDelete: () => void;
  onCreateSubDecision: (parentId: string) => void;
  onSelectDecision: (decisionId: string) => void;
  onReorderSubDecisions: (parentId: string, reorderedSubDecisionIds: string[]) => void;
}

export default function DecisionDetail({ decision, decisions, categories, initialSubDecisionCount: propInitialSubDecisionCount, onBack, onUpdate, onDelete, onCreateSubDecision, onSelectDecision, onReorderSubDecisions }: DecisionDetailProps) {
  const [localDecision, setLocalDecision] = useState<Decision>(decision);
  const timeData = useCountdown(localDecision.deadline); // Real-time countdown
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [showTimeBudgetModal, setShowTimeBudgetModal] = useState(false);
  const [showSubDecisions, setShowSubDecisions] = useState(true); // Expanded by default
  // Mode-specific memo expand state (each mode maintains its own state)
  const [showDecisionMemoByMode, setShowDecisionMemoByMode] = useState<Record<DecisionMode, boolean>>({
    'do_or_not': false,
    'choose_best': false,
    'no_clear_options': true, // Default expanded for no_clear_options
  });
  
  // Get current memo state based on current mode
  const currentMode = localDecision.mode || 'do_or_not';
  const showDecisionMemo = showDecisionMemoByMode[currentMode];
  
  const toggleDecisionMemo = () => {
    setShowDecisionMemoByMode(prev => ({
      ...prev,
      [currentMode]: !prev[currentMode],
    }));
  };
  const [showOptionMemos, setShowOptionMemos] = useState<{ [key: string]: boolean }>({});
  const [prosConsEnabled, setProsConsEnabled] = useState<{ [key: string]: boolean }>({});
  const [newOptionId, setNewOptionId] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalType, setLinkModalType] = useState<'decision' | 'option'>('decision');
  const [linkModalOptionId, setLinkModalOptionId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkImage, setLinkImage] = useState('');
  const [linkSiteName, setLinkSiteName] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showRandomPickTooltip, setShowRandomPickTooltip] = useState(false);
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(false);
  const [draggedSubDecisionId, setDraggedSubDecisionId] = useState<string | null>(null);
  const [dragOverSubDecisionId, setDragOverSubDecisionId] = useState<string | null>(null);
  const [showChunkingInfo, setShowChunkingInfo] = useState(false);
  const [showChunkingInfoExpanded, setShowChunkingInfoExpanded] = useState(false);
  // Framing question collapse state - persisted per decision
  const [collapsedFramingQuestions, setCollapsedFramingQuestions] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`framing-collapsed-${decision.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [dragOverOptionId, setDragOverOptionId] = useState<string | null>(null);
  const [longPressOptionId, setLongPressOptionId] = useState<string | null>(null); // 꾹 눌러서 삭제 팝업 표시용
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletePopupShownAtRef = useRef<number | null>(null); // 삭제 팝업이 표시된 시간
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const chunkingInfoRef = useRef<HTMLDivElement>(null);
  const chunkingInfoBtnRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const framingRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const initialDecision = useRef<Decision>(decision);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  // Use prop-based initial sub-decision count to persist across remounts
  const initialSubDecisionCount = propInitialSubDecisionCount;

  // 모드별 독립 옵션 관리: 각 모드는 자체 옵션 배열을 가짐
  // 'choose_best' ↔ 'no_clear_options' 간에만 텍스트 동기화, 'do_or_not'은 완전 독립
  const initOptionsForMode = (mode: DecisionMode, srcMode: DecisionMode, srcOptions: Option[]): Option[] => {
    if (mode === srcMode) return srcOptions.map(opt => ({ ...opt }));
    const ts = Date.now();
    if (mode === 'do_or_not') {
      return [
        { id: `${ts}-do-1`, title: t.doOption, isSelected: false },
        { id: `${ts}-do-2`, title: t.doNotOption, isSelected: false },
      ];
    }
    if (mode === 'no_clear_options') {
      return [{ id: `${ts}-nco-1`, title: '', isSelected: false }];
    }
    // choose_best
    return [
      { id: `${ts}-cb-1`, title: '', isSelected: false },
      { id: `${ts}-cb-2`, title: '', isSelected: false },
    ];
  };
  const optionsByModeRef = useRef<Record<DecisionMode, Option[]>>({
    'do_or_not': initOptionsForMode('do_or_not', decision.mode || 'do_or_not', decision.options),
    'choose_best': initOptionsForMode('choose_best', decision.mode || 'do_or_not', decision.options),
    'no_clear_options': initOptionsForMode('no_clear_options', decision.mode || 'do_or_not', decision.options),
  });

  // Detect mobile/desktop for responsive placeholder
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize(); // 초기값 설정
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist framing collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`framing-collapsed-${localDecision.id}`, JSON.stringify(collapsedFramingQuestions));
    } catch { /* ignore */ }
  }, [collapsedFramingQuestions, localDecision.id]);

  const toggleFramingCollapse = (field: string) => {
    setCollapsedFramingQuestions(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Sync localDecision when decision prop changes (e.g., navigating to sub-decision)
  useEffect(() => {
    setLocalDecision(decision);
    initialDecision.current = decision;
    // Load framing collapse state for new decision
    try {
      const saved = localStorage.getItem(`framing-collapsed-${decision.id}`);
      setCollapsedFramingQuestions(saved ? JSON.parse(saved) : {});
    } catch {
      setCollapsedFramingQuestions({});
    }
    // 모드별 옵션 ref 초기화
    const srcMode = decision.mode || 'do_or_not';
    optionsByModeRef.current = {
      'do_or_not': initOptionsForMode('do_or_not', srcMode, decision.options),
      'choose_best': initOptionsForMode('choose_best', srcMode, decision.options),
      'no_clear_options': initOptionsForMode('no_clear_options', srcMode, decision.options),
    };
    // Auto-enable pros/cons for options that already have data
    const autoEnabled: { [key: string]: boolean } = {};
    decision.options.forEach(opt => {
      if (opt.pros || opt.cons) {
        autoEnabled[opt.id] = true;
      }
    });
    setProsConsEnabled(autoEnabled);
  }, [decision.id]);

  // 배경 클릭 시 Chunking Info popover 닫기
  useEffect(() => {
    if (!showChunkingInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // 팝오버 또는 Info 버튼 클릭은 무시
      if (chunkingInfoRef.current?.contains(target)) return;
      if (chunkingInfoBtnRef.current?.contains(target)) return;
      setShowChunkingInfo(false);
      setShowChunkingInfoExpanded(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChunkingInfo]);

  // Auto-resize title textarea on mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = 'auto';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, []);

  // Auto-resize framing textareas on mount and when showDecisionMemo becomes true
  useEffect(() => {
    if (!showDecisionMemo) return;
    
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const framingFields: Array<'whatHappened' | 'goal' | 'constraints' | 'dealbreakers' | 'keyFactors'> = 
        ['whatHappened', 'goal', 'constraints', 'dealbreakers', 'keyFactors'];
      
      framingFields.forEach((field) => {
        const textarea = framingRefs.current[field];
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      });
    }, 0);
  }, [showDecisionMemo, decision.id]);

  // Auto-resize title textarea when content changes
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = 'auto';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, [localDecision.title]);

  // Auto-focus on newly added option
  useEffect(() => {
    if (newOptionId && optionRefs.current[newOptionId]) {
      const textarea = optionRefs.current[newOptionId];
      if (textarea) {
        textarea.focus();
        // Auto-resize on mount
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
      setNewOptionId(null);
    }
  }, [newOptionId, localDecision.options]);

  // Auto-resize all option textareas when options change or component mounts
  useEffect(() => {
    localDecision.options.forEach((option) => {
      const textarea = optionRefs.current[option.id];
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    });
  }, [localDecision.options]);

  // Auto-resize all framing textareas when framing changes
  useEffect(() => {
    if (!showDecisionMemo) return;
    
    const framingFields: Array<'whatHappened' | 'goal' | 'constraints' | 'dealbreakers' | 'keyFactors'> = 
      ['whatHappened', 'goal', 'constraints', 'dealbreakers', 'keyFactors'];
    
    framingFields.forEach((field) => {
      const textarea = framingRefs.current[field];
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    });
  }, [localDecision.framing, showDecisionMemo]);

  // Auto-save when localDecision changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // 빈 옵션 제거 (title이 비어있는 경우)
      const filteredDecision = {
        ...localDecision,
        options: localDecision.options.filter(opt => opt.title.trim() !== ''),
      };
      onUpdate(filteredDecision);
    }, 500);

    return () => clearTimeout(timer);
  }, [localDecision, onUpdate]);

  const handleTitleChange = (title: string) => {
    setLocalDecision({ ...localDecision, title });
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

  const toggleProsCons = (optionId: string) => {
    setProsConsEnabled(prev => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  const handleOptionProsChange = (optionId: string, pros: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, pros } : opt
      ),
    });
  };

  const handleOptionConsChange = (optionId: string, cons: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, cons } : opt
      ),
    });
  };

  // Helper function to extract domain from URL
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Link functions
  const openLinkModal = (type: 'decision' | 'option', optionId?: string, existingLink?: Link) => {
    setLinkModalType(type);
    setLinkModalOptionId(optionId || null);
    
    if (existingLink) {
      // 기존 링크 편집 모드
      setEditingLinkId(existingLink.id);
      setLinkUrl(existingLink.url);
      setLinkTitle(existingLink.title || '');
      setLinkDescription(existingLink.description || '');
      setLinkImage(existingLink.image || '');
      setLinkSiteName(existingLink.siteName || '');
    } else {
      // 새 링크 추가 모드
      setEditingLinkId(null);
      setLinkUrl('');
      setLinkTitle('');
      setLinkDescription('');
      setLinkImage('');
      setLinkSiteName('');
    }
    
    setIsLoadingPreview(false);
    setShowLinkModal(true);
  };

  const handleUrlChange = async (url: string) => {
    setLinkUrl(url);
    
    // URL이 유효한 형식인지 확인
    if (!url.trim() || !url.match(/^https?:\/\//)) {
      // URL 형식이 아니면 기존 프리뷰 데이터 초기화
      setLinkTitle('');
      setLinkDescription('');
      setLinkImage('');
      setLinkSiteName('');
      return;
    }

    setIsLoadingPreview(true);
    
    try {
      const ogData = await fetchOpenGraphData(url);
      
      // OG 데이터는 항상 최소한 title과 siteName을 포함 (fallback 처리됨)
      setLinkTitle(ogData.title || '');
      setLinkDescription(ogData.description || '');
      setLinkImage(ogData.image || '');
      setLinkSiteName(ogData.siteName || '');
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      // 에러 발생 시에도 기본 정보 설정
      setLinkTitle(getDomain(url));
      setLinkSiteName(getDomain(url));
      setLinkDescription('');
      setLinkImage('');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSaveLink = () => {
    if (!linkUrl.trim()) return;

    const url = linkUrl.trim();
    const domain = getDomain(url);

    // 최소한의 데이터 보장: title이나 siteName이 없으면 domain 사용
    const linkData: Link = {
      id: editingLinkId || Date.now().toString(),  // 편집 중이면 기존 ID 사용
      url: url,
      title: linkTitle.trim() || domain,  // title이 없으면 domain 사용
      description: linkDescription.trim() || undefined,
      image: linkImage.trim() || undefined,
      siteName: linkSiteName.trim() || domain,  // siteName이 없으면 domain 사용
    };

    if (linkModalType === 'decision') {
      if (editingLinkId) {
        // 기존 링크 업데이트
        setLocalDecision({
          ...localDecision,
          links: (localDecision.links || []).map(link => 
            link.id === editingLinkId ? linkData : link
          ),
        });
      } else {
        // 새 링크 추가
        setLocalDecision({
          ...localDecision,
          links: [...(localDecision.links || []), linkData],
        });
      }
    } else if (linkModalOptionId) {
      setLocalDecision({
        ...localDecision,
        options: localDecision.options.map((opt) =>
          opt.id === linkModalOptionId
            ? {
                ...opt,
                links: editingLinkId
                  ? (opt.links || []).map(link => link.id === editingLinkId ? linkData : link)
                  : [...(opt.links || []), linkData]
              }
            : opt
        ),
      });
    }

    setShowLinkModal(false);
    setEditingLinkId(null);
    setLinkUrl('');
    setLinkTitle('');
    setLinkDescription('');
    setLinkImage('');
    setLinkSiteName('');
  };

  const handleDeleteDecisionLink = (linkId: string) => {
    setLocalDecision({
      ...localDecision,
      links: (localDecision.links || []).filter(link => link.id !== linkId),
    });
  };

  const handleDeleteOptionLink = (optionId: string, linkId: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId
          ? { ...opt, links: (opt.links || []).filter(link => link.id !== linkId) }
          : opt
      ),
    });
  };

  const handleCategoryChange = (category: string) => {
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
    setNewOptionId(newOption.id);

    // choose_best ↔ no_clear_options 간 옵션 추가 동기화
    // 추가 후 현재 모드의 옵션 수가 상대 모드보다 많아질 때만 상대 모드에도 추가
    if (currentMode === 'choose_best' || currentMode === 'no_clear_options') {
      const otherMode: DecisionMode = currentMode === 'choose_best' ? 'no_clear_options' : 'choose_best';
      const newCount = localDecision.options.length + 1; // 추가 후 현재 모드 옵션 수
      const otherCount = optionsByModeRef.current[otherMode].length;
      if (newCount > otherCount) {
        optionsByModeRef.current[otherMode] = [
          ...optionsByModeRef.current[otherMode],
          { id: `${Date.now()}-sync`, title: '', isSelected: false },
        ];
      }
    }
  };

  const handleOptionChange = (optionId: string, title: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, title } : opt
      ),
    });

    // choose_best ↔ no_clear_options 간 텍스트 실시간 동기화
    if (currentMode === 'choose_best' || currentMode === 'no_clear_options') {
      const otherMode: DecisionMode = currentMode === 'choose_best' ? 'no_clear_options' : 'choose_best';
      const optionIndex = localDecision.options.findIndex(opt => opt.id === optionId);
      if (optionIndex !== -1 && optionsByModeRef.current[otherMode]?.[optionIndex]) {
        optionsByModeRef.current[otherMode][optionIndex] = {
          ...optionsByModeRef.current[otherMode][optionIndex],
          title,
        };
      }
    }
    
    // Auto-resize textarea
    if (optionRefs.current[optionId]) {
      const textarea = optionRefs.current[optionId];
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  };

  const handleOptionFocus = (optionId: string, currentTitle: string) => {
    // 기본 프리셋 텍스트면 빈칸으로 만들기 (do_or_not 모드에서만)
    if (currentMode === 'do_or_not' && (currentTitle === t.doOption || currentTitle === t.doNotOption)) {
      setLocalDecision({
        ...localDecision,
        options: localDecision.options.map((opt) =>
          opt.id === optionId ? { ...opt, title: '' } : opt
        ),
      });
    }
  };

  const handleOptionBlur = (optionId: string, currentTitle: string) => {
    // 빈칸이면 원래 프리셋으로 복구 (do_or_not 모드에서만)
    if (currentMode === 'do_or_not' && currentTitle.trim() === '') {
      const optionIndex = localDecision.options.findIndex(opt => opt.id === optionId);
      const originalTitle = optionIndex === 0 ? t.doOption : optionIndex === 1 ? t.doNotOption : '';
      
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
    const clickedOption = localDecision.options.find(opt => opt.id === optionId);
    
    // 이미 선택된 옵션을 다시 클릭하면 선택 취소
    if (clickedOption?.isSelected) {
      setLocalDecision({
        ...localDecision,
        options: localDecision.options.map((opt) => ({
          ...opt,
          isSelected: false,
        })),
      });
    } else {
      // 새로운 옵션 선택
      setLocalDecision({
        ...localDecision,
        options: localDecision.options.map((opt) => ({
          ...opt,
          isSelected: opt.id === optionId,
        })),
      });
    }
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
    setLocalDecision(trimmedDecision); // 로컬 상태 즉시 업데이트
    onUpdate(trimmedDecision);
    // TRIM 후 작성화면에 남아있음 (onBack() 호출하지 않음)
  };

  const handleReopen = () => {
    const reopenedDecision = {
      ...localDecision,
      resolved: false,
      resolvedAt: undefined,
    };
    setLocalDecision(reopenedDecision); // 로컬 상태 즉시 업데이트
    onUpdate(reopenedDecision);
  };

  const handleDelete = () => {
    if (window.confirm(t.confirmDeleteDecision)) {
      onDelete();
      onBack();
    }
  };

  // 변경사항 체크 함수
  const hasChanges = () => {
    const initial = initialDecision.current;
    
    // Sub-decision 추가 체크
    const currentSubDecisionCount = decisions.filter(d => d.parentId === localDecision.id).length;
    if (currentSubDecisionCount !== initialSubDecisionCount) return true;
    
    // 옵션 변경 체크 (기본 "Do", "Do Not" 이외의 변경)
    if (localDecision.options.length !== initial.options.length) return true;
    
    for (let i = 0; i < localDecision.options.length; i++) {
      const currentOpt = localDecision.options[i];
      const initialOpt = initial.options[i];
      
      if (currentOpt.title !== initialOpt.title || 
          currentOpt.isSelected !== initialOpt.isSelected ||
          currentOpt.memo !== initialOpt.memo ||
          currentOpt.pros !== initialOpt.pros ||
          currentOpt.cons !== initialOpt.cons) {
        return true;
      }
    }
    
    // 메모, framing, 설정, 모드 변경 체크
    if (localDecision.memo !== initial.memo) return true;
    if (localDecision.category !== initial.category) return true;
    if (localDecision.importance !== initial.importance) return true;
    if (localDecision.timeBudget !== initial.timeBudget) return true;
    if (localDecision.mode !== initial.mode) return true;
    
    if (JSON.stringify(localDecision.framing) !== JSON.stringify(initial.framing)) {
      return true;
    }
    
    return false;
  };

  // 모든 이탈 경로에서 사용하는 일반화된 네비게이션 핸들러
  const handleNavigateAway = (destination: () => void) => {
    const titleEmpty = localDecision.title.trim() === '';
    
    if (titleEmpty && hasChanges()) {
      // 제목 비어있고 변경사항 있음 → 경고 팝업 (이탈 목적지 저장)
      pendingNavigationRef.current = destination;
      setShowLeaveWarning(true);
    } else if (titleEmpty && !hasChanges()) {
      // 제목 비어있고 변경사항 없음 → 삭제하고 나가기
      onDelete();
      destination();
    } else {
      // 제목 있음 → 저장하고 나가기
      const filteredDecision = {
        ...localDecision,
        options: localDecision.options.filter(opt => opt.title.trim() !== ''),
      };
      onUpdate(filteredDecision);
      destination();
    }
  };

  const handleLeaveWithoutSaving = () => {
    setShowLeaveWarning(false);
    onDelete();
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    } else {
      onBack();
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveWarning(false);
    pendingNavigationRef.current = null;
    titleInputRef.current?.focus();
  };

  const handleModeChange = (mode: DecisionMode) => {
    // 1. 현재 모드의 옵션을 ref에 저장
    optionsByModeRef.current[currentMode] = localDecision.options.map(opt => ({ ...opt }));

    // 2. choose_best ↔ no_clear_options 간 전환 시, 텍스트를 동기화
    if (
      (currentMode === 'choose_best' && mode === 'no_clear_options') ||
      (currentMode === 'no_clear_options' && mode === 'choose_best')
    ) {
      const sourceOptions = localDecision.options;
      const targetOptions = optionsByModeRef.current[mode];
      sourceOptions.forEach((srcOpt, index) => {
        if (index < targetOptions.length) {
          targetOptions[index] = {
            ...targetOptions[index],
            title: srcOpt.title,
            pros: srcOpt.pros,
            cons: srcOpt.cons,
          };
        }
      });
    }

    // 3. 대상 모드의 옵션을 ref에서 로드
    const targetOptions = optionsByModeRef.current[mode].map(opt => ({ ...opt }));

    setLocalDecision({ ...localDecision, mode, options: targetOptions });
  };

  const handleFramingChange = (field: 'whatHappened' | 'goal' | 'constraints' | 'dealbreakers' | 'keyFactors', value: string) => {
    setLocalDecision({
      ...localDecision,
      framing: {
        ...localDecision.framing,
        [field]: value,
      },
    });
    
    // Auto-resize textarea
    const textarea = framingRefs.current[field];
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Comparison Matrix handlers
  const handleToggleComparisonMatrix = () => {
    if (!showComparisonMatrix && (!localDecision.comparisonMatrix || localDecision.comparisonMatrix.length === 0)) {
      // 처음 열 때 빈 criteria 1개로 초기화
      setLocalDecision({
        ...localDecision,
        comparisonMatrix: [{ id: Date.now().toString(), name: '', ratings: {} }],
      });
    }
    setShowComparisonMatrix(!showComparisonMatrix);
  };

  const handleAddCriteria = () => {
    setLocalDecision({
      ...localDecision,
      comparisonMatrix: [
        ...(localDecision.comparisonMatrix || []),
        { id: Date.now().toString(), name: '', ratings: {} },
      ],
    });
  };

  const handleCriteriaNameChange = (criteriaId: string, name: string) => {
    setLocalDecision({
      ...localDecision,
      comparisonMatrix: (localDecision.comparisonMatrix || []).map(c =>
        c.id === criteriaId ? { ...c, name } : c
      ),
    });
  };

  const handleCriteriaRatingChange = (criteriaId: string, optionId: string, value: string) => {
    setLocalDecision({
      ...localDecision,
      comparisonMatrix: (localDecision.comparisonMatrix || []).map(c =>
        c.id === criteriaId ? { ...c, ratings: { ...c.ratings, [optionId]: value } } : c
      ),
    });
  };

  const handleDeleteCriteria = (criteriaId: string) => {
    setLocalDecision({
      ...localDecision,
      comparisonMatrix: (localDecision.comparisonMatrix || []).filter(c => c.id !== criteriaId),
    });
  };

  const getOptionLabel = (option: Option, index: number): string => {
    if (option.title.trim()) return option.title;
    if (currentMode === 'choose_best') return `${t.option} ${String.fromCharCode(65 + index)}`;
    return `${t.option} ${index + 1}`;
  };

  // Drag and drop handlers for sub-decisions
  const handleDragStart = (e: React.DragEvent, subDecisionId: string) => {
    if (localDecision.resolved) {
      e.preventDefault();
      return;
    }
    setDraggedSubDecisionId(subDecisionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', subDecisionId);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSubDecisionId(null);
    setDragOverSubDecisionId(null);
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, subDecisionId: string) => {
    if (localDecision.resolved || draggedSubDecisionId === subDecisionId) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSubDecisionId(subDecisionId);
  };

  const handleDragLeave = () => {
    setDragOverSubDecisionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSubDecisionId: string) => {
    e.preventDefault();
    if (localDecision.resolved || !draggedSubDecisionId || draggedSubDecisionId === targetSubDecisionId) {
      setDragOverSubDecisionId(null);
      return;
    }

    // Get all sub-decisions sorted by order
    const subDecisions = decisions
      .filter(d => d.parentId === localDecision.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Find indices
    const draggedIndex = subDecisions.findIndex(d => d.id === draggedSubDecisionId);
    const targetIndex = subDecisions.findIndex(d => d.id === targetSubDecisionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDragOverSubDecisionId(null);
      return;
    }

    // Reorder array
    const reordered = [...subDecisions];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Get reordered IDs
    const reorderedIds = reordered.map(d => d.id);

    // Update order
    onReorderSubDecisions(localDecision.id, reorderedIds);

    setDraggedSubDecisionId(null);
    setDragOverSubDecisionId(null);
  };

  // Long press handler for delete popup
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleOptionPointerDown = (e: React.PointerEvent, optionId: string) => {
    if (localDecision.resolved) return;
    // 버튼이나 링크 클릭 시 long press 무시
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    // 400ms 후 삭제 팝업 표시
    longPressTimerRef.current = setTimeout(() => {
      // textarea에서 long press 시 포커스/선택 해제
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl?.closest('textarea')) {
        activeEl.blur();
      }
      window.getSelection()?.removeAllRanges();

      setLongPressOptionId(optionId);
      deletePopupShownAtRef.current = Date.now(); // 팝업 표시 시간 기록
      longPressTimerRef.current = null;
    }, 400);
  };

  const handleOptionPointerUp = () => {
    // 타이머만 취소하고, 이미 표시된 팝업은 유지
    clearLongPressTimer();
  };

  const handleOptionPointerCancel = () => {
    clearLongPressTimer();
  };

  // Drag and drop handlers for options
  const handleOptionDragStart = (e: React.DragEvent, optionId: string) => {
    if (localDecision.resolved) {
      e.preventDefault();
      return;
    }
    
    // 삭제 팝업이 표시된 후 500ms 이내면 드래그 차단 (손을 떼는 시간 여유 제공)
    if (deletePopupShownAtRef.current) {
      const timeSincePopupShown = Date.now() - deletePopupShownAtRef.current;
      if (timeSincePopupShown < 500) {
        e.preventDefault();
        return;
      }
    }
    
    // 드래그 시작 시 long press 타이머 취소
    clearLongPressTimer();
    setLongPressOptionId(null);
    deletePopupShownAtRef.current = null;
    
    setDraggedOptionId(optionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', optionId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleOptionDragEnd = (e: React.DragEvent) => {
    setDraggedOptionId(null);
    setDragOverOptionId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleOptionDragOver = (e: React.DragEvent, optionId: string) => {
    if (localDecision.resolved || draggedOptionId === optionId) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOptionId(optionId);
  };

  const handleOptionDragLeave = () => {
    setDragOverOptionId(null);
  };

  const handleOptionDrop = (e: React.DragEvent, targetOptionId: string) => {
    e.preventDefault();
    if (localDecision.resolved || !draggedOptionId || draggedOptionId === targetOptionId) {
      setDragOverOptionId(null);
      return;
    }

    const draggedIndex = localDecision.options.findIndex(opt => opt.id === draggedOptionId);
    const targetIndex = localDecision.options.findIndex(opt => opt.id === targetOptionId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const reordered = [...localDecision.options];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      setLocalDecision({
        ...localDecision,
        options: reordered,
      });
    }

    setDraggedOptionId(null);
    setDragOverOptionId(null);
  };

  // Build breadcrumb path from root to current decision's parent
  const buildBreadcrumbPath = (): Array<{id: string, title: string}> => {
    const path: Array<{id: string, title: string}> = [];
    let currentId = localDecision.parentId;
    
    // Traverse up the parent chain
    while (currentId) {
      const parent = decisions.find(d => d.id === currentId);
      if (!parent) break;
      
      path.unshift({ id: parent.id, title: parent.title || t.untitled });
      currentId = parent.parentId;
      
      // Prevent infinite loops
      if (path.length > 10) break;
    }
    
    return path;
  };

  const breadcrumbPath = buildBreadcrumbPath();

  // Real-time countdown display (removed getTimeRemaining, using timeData from hook)

  return (
    <div className="min-h-screen bg-cloudDancer">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cardBg shadow-md border-b border-stretchLimo/[0.06] px-4 py-3 flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm">
          <button 
            onClick={() => handleNavigateAway(onBack)}
            className="p-2 hover:bg-stretchLimo100 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 text-stretchLimo" />
          </button>
          
          {breadcrumbPath.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-micron"> &gt; </span>
              <button 
                onClick={() => handleNavigateAway(() => onSelectDecision(item.id))}
                className="text-stretchLimo hover:text-opacity-70 hover:underline truncate max-w-[150px]"
              >
                {item.title}
              </button>
            </div>
          ))}
        </nav>

        {/* Category Dropdown (only for parent decisions) */}
        {!localDecision.parentId && (
          <div className="relative">
            <button
              onClick={() => !localDecision.resolved && setShowCategoryDropdown(!showCategoryDropdown)}
              disabled={localDecision.resolved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm ${
                localDecision.resolved 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-cloudDancer/30 hover:shadow-md'
              }`}
            >
              <span className="font-medium text-stretchLimo">{localDecision.category}</span>
              <ChevronDown className="w-4 h-4 text-stretchLimo" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/[0.06] overflow-hidden z-10">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className="block w-full px-6 py-2 text-left hover:bg-stretchLimo100 text-stretchLimo whitespace-nowrap"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Kebab Menu */}
        <div className="relative">
          <button
            onClick={() => setShowKebabMenu(!showKebabMenu)}
            className="p-2 hover:bg-stretchLimo100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-stretchLimo" />
          </button>

          {showKebabMenu && (
            <div className="absolute top-full right-0 mt-1 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/[0.06] overflow-hidden z-10">
              <button
                onClick={handleDelete}
                className="block w-full px-6 py-2 text-left hover:bg-stretchLimo100 text-scarletSmile whitespace-nowrap"
              >
                {t.delete}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        {/* Title Input */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <textarea
              ref={titleInputRef}
              value={localDecision.title}
              onChange={(e) => {
                handleTitleChange(e.target.value);
                // Auto-resize on input
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder={isMobile ? t.titlePlaceholder : '지금 무엇이 머릿속을 복잡하게 하고 있나요?'}
              disabled={localDecision.resolved}
              rows={1}
              className={`flex-1 text-xl font-medium text-black bg-transparent border-none outline-none placeholder-stretchLimo300 resize-none overflow-hidden mt-1 ${
                localDecision.resolved ? 'line-through opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <button
              onClick={() => openLinkModal('decision')}
              disabled={localDecision.resolved}
              className={`p-2 rounded-lg transition-colors ${
                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stretchLimo100'
              }`}
            >
              <LinkIcon className={`w-5 h-5 ${(localDecision.links && localDecision.links.length > 0) ? 'text-stretchLimo' : 'text-micron'}`} />
            </button>
            <button
              onClick={toggleDecisionMemo}
              disabled={localDecision.resolved}
              className={`p-2 rounded-lg transition-all duration-200 ${
                localDecision.resolved
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-stretchLimo100'
              }`}
            >
              <Brain className="w-5 h-5" stroke={showDecisionMemo ? '#1A1A1A' : '#9E9E9E'} fill={showDecisionMemo ? 'white' : '#1A1A1A'} />
            </button>
          </div>

          {/* Decision Links */}
          {localDecision.links && localDecision.links.length > 0 && (
            <div className="mt-3 space-y-2">
              {localDecision.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-stretchLimo50 rounded-lg overflow-hidden hover:bg-stretchLimo100 transition-colors group"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Thumbnail Image */}
                    {link.image && (
                      <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-stretchLimo200">
                        <img 
                          src={link.image} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!link.image && <LinkIcon className="w-4 h-4 text-micron flex-shrink-0" />}
                        <span className="text-sm font-bold text-stretchLimo truncate">
                          {link.title || link.url}
                        </span>
                      </div>
                      <p className="text-xs text-micron mb-1">
                        {link.siteName || getDomain(link.url)}
                      </p>
                      {link.description && (
                        <p className="text-xs text-micron line-clamp-2">
                          {link.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Edit & Delete Buttons */}
                    {!localDecision.resolved && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openLinkModal('decision', undefined, link);
                          }}
                          className="p-1 hover:bg-stretchLimo hover:bg-opacity-10 rounded flex-shrink-0"
                          title={t.editPreview}
                        >
                          <Edit className="w-4 h-4 text-stretchLimo" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteDecisionLink(link.id);
                          }}
                          className="p-1 hover:bg-scarletSmile hover:bg-opacity-10 rounded flex-shrink-0"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4 text-scarletSmile" />
                        </button>
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Decision Framing Questions (mode-specific) - Micron 배경 */}
          {showDecisionMemo && (
            <div className="mt-3 bg-micron rounded-xl p-4">
              <div className="space-y-2">
                {/* Q1: What happened? - all modes */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleFramingCollapse('whatHappened')}
                    className="w-full flex items-center justify-between mb-0.5 group/q"
                  >
                    <span className="text-sm font-medium text-cloudDancer">{t.framingWhatHappened}</span>
                    {collapsedFramingQuestions['whatHappened'] ? (
                      <ChevronRight className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                    )}
                  </button>
                  {!collapsedFramingQuestions['whatHappened'] && (
                    <textarea
                      ref={(el) => (framingRefs.current['whatHappened'] = el)}
                      value={localDecision.framing?.whatHappened || ''}
                      onChange={(e) => {
                        handleFramingChange('whatHappened', e.target.value);
                        // Auto-resize on input
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder={t.framingWhatHappenedPlaceholder}
                      disabled={localDecision.resolved}
                      className={`w-full px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none overflow-hidden ${
                        localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      rows={1}
                    />
                  )}
                </div>

                {/* Q2: Ultimate Goal - all modes */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleFramingCollapse('goal')}
                    className="w-full flex items-center justify-between mb-0.5 group/q"
                  >
                    <span className="text-sm font-medium text-cloudDancer">{t.framingUltimateGoal}</span>
                    {collapsedFramingQuestions['goal'] ? (
                      <ChevronRight className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                    )}
                  </button>
                  {!collapsedFramingQuestions['goal'] && (
                    <textarea
                      ref={(el) => (framingRefs.current['goal'] = el)}
                      value={localDecision.framing?.goal || ''}
                      onChange={(e) => {
                        handleFramingChange('goal', e.target.value);
                        // Auto-resize on input
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder={t.framingGoalPlaceholder}
                      disabled={localDecision.resolved}
                      className={`w-full px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none overflow-hidden ${
                        localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      rows={1}
                    />
                  )}
                </div>

                {/* Q3: Any fixed constraints? - no_clear_options only */}
                {(localDecision.mode || 'do_or_not') === 'no_clear_options' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleFramingCollapse('constraints')}
                      className="w-full flex items-center justify-between mb-0.5 group/q"
                    >
                      <span className="text-sm font-medium text-cloudDancer">{t.framingConstraints}</span>
                      {collapsedFramingQuestions['constraints'] ? (
                        <ChevronRight className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      )}
                    </button>
                    {!collapsedFramingQuestions['constraints'] && (
                      <textarea
                        ref={(el) => (framingRefs.current['constraints'] = el)}
                        value={localDecision.framing?.constraints || ''}
                        onChange={(e) => {
                          handleFramingChange('constraints', e.target.value);
                          // Auto-resize on input
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder={t.framingConstraintsPlaceholder}
                        disabled={localDecision.resolved}
                        className={`w-full px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none overflow-hidden ${
                          localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        rows={1}
                      />
                    )}
                  </div>
                )}

                {/* Q4: Any deal-breakers? - no_clear_options only */}
                {(localDecision.mode || 'do_or_not') === 'no_clear_options' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleFramingCollapse('dealbreakers')}
                      className="w-full flex items-center justify-between mb-0.5 group/q"
                    >
                      <span className="text-sm font-medium text-cloudDancer">{t.framingDealbreakers}</span>
                      {collapsedFramingQuestions['dealbreakers'] ? (
                        <ChevronRight className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      )}
                    </button>
                    {!collapsedFramingQuestions['dealbreakers'] && (
                      <textarea
                        ref={(el) => (framingRefs.current['dealbreakers'] = el)}
                        value={localDecision.framing?.dealbreakers || ''}
                        onChange={(e) => {
                          handleFramingChange('dealbreakers', e.target.value);
                          // Auto-resize on input
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder={t.framingDealbreakersPlaceholder}
                        disabled={localDecision.resolved}
                        className={`w-full px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none overflow-hidden ${
                          localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        rows={1}
                      />
                    )}
                  </div>
                )}

                {/* Q5: Key factors? - choose_best and no_clear_options */}
                {((localDecision.mode || 'do_or_not') === 'choose_best' || (localDecision.mode || 'do_or_not') === 'no_clear_options') && (
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleFramingCollapse('keyFactors')}
                      className="w-full flex items-center justify-between mb-0.5 group/q"
                    >
                      <span className="text-sm font-medium text-cloudDancer">{t.framingKeyFactors}</span>
                      {collapsedFramingQuestions['keyFactors'] ? (
                        <ChevronRight className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-cloudDancer/60 group-hover/q:text-cloudDancer transition-colors" />
                      )}
                    </button>
                    {!collapsedFramingQuestions['keyFactors'] && (
                      <textarea
                        ref={(el) => (framingRefs.current['keyFactors'] = el)}
                        value={localDecision.framing?.keyFactors || ''}
                        onChange={(e) => {
                          handleFramingChange('keyFactors', e.target.value);
                          // Auto-resize on input
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder={t.framingKeyFactorsPlaceholder}
                        disabled={localDecision.resolved}
                        className={`w-full px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none overflow-hidden ${
                          localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        rows={1}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Decision Container Box */}
        <div className={`bg-cardBg rounded-xl mb-6 shadow border border-stretchLimo/[0.06] ${
          (currentMode === 'choose_best' || currentMode === 'no_clear_options') ? 'pt-4 px-4 pb-4' : 'p-6'
        }`}>
          {/* Options List */}
          <div className={`space-y-3 ${
            (currentMode === 'choose_best' || currentMode === 'no_clear_options') ? 'mb-3' : 'mb-5'
          }`}>
          {/* 삭제 팝업 배경 오버레이 */}
          {longPressOptionId && (
            <div 
              className="fixed inset-0 z-30"
              onClick={() => {
                setLongPressOptionId(null);
                deletePopupShownAtRef.current = null;
              }}
            />
          )}
          {localDecision.options.map((option, index) => {
            const isDragging = draggedOptionId === option.id;
            const isDragOver = dragOverOptionId === option.id;
            const showDeletePopup = longPressOptionId === option.id;
            return (
            <div
              key={option.id}
              className="relative"
              style={{ zIndex: showDeletePopup ? 50 : 'auto' }}
            >
              <div
                draggable={!localDecision.resolved}
                onDragStart={(e) => handleOptionDragStart(e, option.id)}
                onDragEnd={handleOptionDragEnd}
                onDragOver={(e) => handleOptionDragOver(e, option.id)}
                onDragLeave={handleOptionDragLeave}
                onDrop={(e) => handleOptionDrop(e, option.id)}
                className={`rounded-lg py-4 pl-4 pr-2 group transition-colors shadow-sm ${
                  isDragging
                    ? 'opacity-50'
                    : isDragOver
                    ? 'bg-stretchLimo bg-opacity-5 border border-stretchLimo border-dashed'
                    : option.isSelected 
                    ? 'bg-stretchLimo bg-opacity-10 border border-stretchLimo' 
                    : 'bg-cardBg shadow border border-stretchLimo/[0.06]'
                }`}
              >
              {/* Option Header */}
              <div className="flex items-center gap-1 relative">
                {/* Drag Handle - absolute positioned */}
                {!localDecision.resolved && (
                  <div
                    draggable={true}
                    onDragStart={(e) => handleOptionDragStart(e, option.id)}
                    onDragEnd={handleOptionDragEnd}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-stretchLimo500 hover:text-stretchLimo transition-colors"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={() => handleOptionSelect(option.id)}
                  disabled={localDecision.resolved}
                  className={`ml-3 w-5 h-5 rounded-full border-2 border-stretchLimo flex-shrink-0 flex items-center justify-center ${
                    option.isSelected ? 'bg-stretchLimo' : ''
                  } ${localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-opacity-70'} transition-colors`}
                >
                  {option.isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </button>
                {/* Long press 영역: 체크박스 우측부터 첨부파일 버튼 좌측까지 */}
                <div
                  className="flex-1 flex items-center min-w-0"
                  onPointerDown={(e) => handleOptionPointerDown(e, option.id)}
                  onPointerUp={handleOptionPointerUp}
                  onPointerCancel={handleOptionPointerCancel}
                >
                  <textarea
                    ref={(el) => (optionRefs.current[option.id] = el)}
                    value={option.title}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    onFocus={() => handleOptionFocus(option.id, option.title)}
                    onBlur={() => handleOptionBlur(option.id, option.title)}
                    placeholder={
                      currentMode === 'choose_best'
                        ? `${t.option} ${String.fromCharCode(65 + index)}` // A, B, C, ...
                        : t.option
                    }
                    rows={1}
                    disabled={localDecision.resolved}
                    className={`flex-1 text-base bg-transparent border-none outline-none placeholder-stretchLimo300 resize-none overflow-hidden min-w-0 ${
                      option.isSelected ? 'text-black font-medium' : 'text-black'
                    } ${localDecision.resolved && !option.isSelected ? 'line-through opacity-50' : ''} ${
                      localDecision.resolved ? 'cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openLinkModal('option', option.id)}
                    disabled={localDecision.resolved}
                    className={`p-1 rounded transition-opacity ${
                      localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-stretchLimo100'
                    }`}
                  >
                    <LinkIcon className={`w-4 h-4 ${(option.links && option.links.length > 0) ? 'text-stretchLimo' : 'text-micron'}`} />
                  </button>
                  <button
                    onClick={() => toggleOptionMemo(option.id)}
                    disabled={localDecision.resolved}
                    className={`p-1 rounded transition-opacity ${
                      localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-stretchLimo100'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${(option.memo || option.pros || option.cons) ? 'text-stretchLimo' : 'text-micron'}`} />
                  </button>
                </div>
              </div>
              </div>

              {/* Long press 삭제 팝업 */}
              {showDeletePopup && (
                <div 
                  className="absolute -top-12 left-4 z-50 select-none"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  <div className="bg-cardBg rounded-xl shadow-xl border border-stretchLimo/[0.06] overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => {
                        handleDeleteOption(option.id);
                        setLongPressOptionId(null);
                        deletePopupShownAtRef.current = null;
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-scarletSmile hover:bg-scarletSmile hover:bg-opacity-5 transition-colors text-sm font-medium select-none"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.delete}</span>
                    </button>
                  </div>
                  {/* 말풍선 꼬리 */}
                  <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-cardBg transform rotate-45" />
                </div>
              )}

              {/* Option Links */}
              {option.links && option.links.length > 0 && (
                <div className="mt-3 space-y-2">
                  {option.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-stretchLimo100 rounded-lg overflow-hidden hover:bg-stretchLimo200 transition-colors relative group/link"
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Thumbnail Image */}
                        {link.image && (
                          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-stretchLimo300">
                            <img 
                              src={link.image} 
                              alt="" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!link.image && <LinkIcon className="w-3 h-3 text-micron flex-shrink-0" />}
                            <span className="text-sm font-bold text-stretchLimo truncate">
                              {link.title || link.url}
                            </span>
                          </div>
                          <p className="text-xs text-micron mb-1">
                            {link.siteName || getDomain(link.url)}
                          </p>
                          {link.description && (
                            <p className="text-xs text-micron line-clamp-2">
                              {link.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Edit & Delete Buttons */}
                        {!localDecision.resolved && (
                          <div className="flex gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openLinkModal('option', option.id, link);
                              }}
                              className="p-1 hover:bg-stretchLimo hover:bg-opacity-10 rounded flex-shrink-0"
                              title={t.editPreview}
                            >
                              <Edit className="w-3 h-3 text-stretchLimo" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteOptionLink(option.id, link.id);
                              }}
                              className="p-1 hover:bg-scarletSmile hover:bg-opacity-10 rounded flex-shrink-0"
                              title={t.delete}
                            >
                              <Trash2 className="w-3 h-3 text-scarletSmile" />
                            </button>
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Option Memo - Micron 배경 */}
              {showOptionMemos[option.id] && (
                <>
                  {/* do_or_not 모드: 단일 textarea (컨테이너 없음) */}
                  {currentMode === 'do_or_not' ? (
                    <textarea
                      value={option.memo || ''}
                      onChange={(e) => handleOptionMemoChange(option.id, e.target.value)}
                      placeholder={
                        index === 0
                          ? t.whyShouldIDo
                          : t.whyShouldntIDo
                      }
                      disabled={localDecision.resolved}
                      className={`w-full mt-3 px-3 py-2 text-sm text-white placeholder-white/50 bg-micron border border-white/30 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none ${
                        localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      rows={2}
                    />
                  ) : (
                    /* choose_best, no_clear_options 모드: 컨테이너 필요 (pros/cons 구조) */
                    <div className="mt-3 bg-micron rounded-lg p-3">
                      {/* Pros / Cons Template */}
                      {prosConsEnabled[option.id] ? (
                        <div className="space-y-2">
                          {/* Pros */}
                          <div>
                            <label className="flex items-center gap-1 text-xs font-semibold text-cloudDancer mb-1">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/80 text-micron text-[10px] font-bold">+</span>
                              {t.pros}
                            </label>
                            <textarea
                              value={option.pros || ''}
                              onChange={(e) => handleOptionProsChange(option.id, e.target.value)}
                              placeholder={t.prosPlaceholder}
                              disabled={localDecision.resolved}
                              className={`w-full px-3 py-2 text-sm text-white placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none ${
                                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              rows={2}
                            />
                          </div>
                          {/* Cons */}
                          <div>
                            <label className="flex items-center gap-1 text-xs font-semibold text-cloudDancer mb-1">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-bold">&minus;</span>
                              {t.cons}
                            </label>
                            <textarea
                              value={option.cons || ''}
                              onChange={(e) => handleOptionConsChange(option.id, e.target.value)}
                              placeholder={t.consPlaceholder}
                              disabled={localDecision.resolved}
                              className={`w-full px-3 py-2 text-sm text-white placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none ${
                                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              rows={2}
                            />
                          </div>
                          {/* Toggle back to free-form memo */}
                          {!localDecision.resolved && (
                            <button
                              onClick={() => toggleProsCons(option.id)}
                              className="text-xs text-white/50 hover:text-white transition-colors"
                            >
                              {t.switchToFreeFormMemo}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <textarea
                            value={option.memo || ''}
                            onChange={(e) => handleOptionMemoChange(option.id, e.target.value)}
                            placeholder={t.addNotesPlaceholder}
                            disabled={localDecision.resolved}
                            className={`w-full px-3 py-2 text-sm text-white placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 resize-none ${
                              localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            rows={2}
                          />
                          {/* Pros / Cons 추가 button */}
                          {!localDecision.resolved && (
                            <button
                              onClick={() => toggleProsCons(option.id)}
                              className="mt-2 flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{t.addProsCons}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            );
          })}

          {/* Add Option Button - 숨김: do_or_not 모드 */}
          {currentMode !== 'do_or_not' && (
            <button
              onClick={handleAddOption}
              disabled={localDecision.resolved}
              className={`w-full bg-cardBg rounded-lg p-4 flex items-center gap-3 transition-shadow text-micron shadow border border-stretchLimo/[0.06] ${
                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cloudDancer/30 hover:shadow-md'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span className="text-base">{t.addOption}</span>
            </button>
          )}
        </div>

        {/* Compare Options CTA - choose_best, no_clear_options only */}
        {(currentMode === 'choose_best' || currentMode === 'no_clear_options') && !localDecision.resolved && (
          <div className="mb-1 -mt-2">
            <button
              onClick={handleToggleComparisonMatrix}
              className="flex items-center gap-1.5 text-sm text-micron hover:text-stretchLimo transition-colors py-1.5"
            >
              {showComparisonMatrix ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>{t.compareOptions}</span>
            </button>

            {/* Comparison Matrix - Inline Expand - Micron 배경 */}
            {showComparisonMatrix && (
              <div className="mt-2 bg-micron rounded-lg p-4">
                <h4 className="text-xs font-semibold text-cloudDancer uppercase tracking-wide mb-3">
                  {t.comparisonMatrix}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-white/70 pb-2 pr-2 min-w-[90px]">
                          {t.optionsHeader}
                        </th>
                        {(localDecision.comparisonMatrix || []).map((criteria) => (
                          <th key={criteria.id} className="text-center text-xs font-medium text-white/70 pb-2 px-1.5 min-w-[72px] group/criteriaHead">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                value={criteria.name}
                                onChange={(e) => handleCriteriaNameChange(criteria.id, e.target.value)}
                                placeholder={t.criteria}
                                className="w-full text-xs text-center font-medium text-white bg-transparent border-none outline-none placeholder-white/50"
                              />
                              <button
                                onClick={() => handleDeleteCriteria(criteria.id)}
                                className="p-0.5 text-white/50 hover:text-scarletSmile transition-colors flex-shrink-0 opacity-0 group-hover/criteriaHead:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {localDecision.options.map((opt, idx) => (
                        <tr key={opt.id} className="border-t border-white/20">
                          <td className="py-1.5 pr-2 text-sm font-medium text-cloudDancer">
                            <span className="truncate block max-w-[120px]">
                              {getOptionLabel(opt, idx)}
                            </span>
                          </td>
                          {(localDecision.comparisonMatrix || []).map((criteria) => (
                            <td key={criteria.id} className="py-1.5 px-1">
                              <input
                                type="text"
                                value={criteria.ratings[opt.id] || ''}
                                onChange={(e) => handleCriteriaRatingChange(criteria.id, opt.id, e.target.value)}
                                placeholder="—"
                                className="w-full text-sm text-center text-white bg-white/10 border border-white/20 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-white/50 focus:bg-white/20 placeholder-white/50"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Criteria */}
                <button
                  onClick={handleAddCriteria}
                  className="mt-2 flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.addCriteria}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRIM Button and Random Pick Button Container */}
        <div className={`relative flex items-center justify-center w-full ${
          (currentMode === 'choose_best' || currentMode === 'no_clear_options') ? 'mt-2 mb-2' : 'mb-0'
        }`}>
          {!localDecision.resolved ? (
            <>
              {/* TRIM Button - Centered */}
              <button
                onClick={handleTrim}
                disabled={!localDecision.options.some(opt => opt.isSelected)}
                className={`rounded-lg py-3 px-16 text-base font-bold transition-colors ${
                  localDecision.options.some(opt => opt.isSelected)
                    ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                    : 'bg-stretchLimo100 text-stretchLimo300 cursor-not-allowed'
                }`}
              >
                <img 
                  src={localDecision.options.some(opt => opt.isSelected) 
                    ? "/src/assets/logo-button-active.svg" 
                    : "/src/assets/logo-button-inactive.svg"
                  } 
                  alt="TRIM" 
                  className="h-4"
                />
              </button>

              {/* Random Pick Button - Right Positioned */}
              {localDecision.options.length >= 2 && (
                <div className="absolute -right-2 top-[65%] -translate-y-1/2">
                  <button
                    onClick={handleRandomPick}
                    onMouseEnter={() => setShowRandomPickTooltip(true)}
                    onMouseLeave={() => setShowRandomPickTooltip(false)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg transition-colors relative border-0"
                  >
                    <Shuffle className="w-5 h-5 text-stretchLimo -mt-1" />
                    {import.meta.env.VITE_LANG === 'ko' ? (
                      <span className="text-[5px] text-stretchLimo leading-tight">{t.randomPickLine1} {t.randomPickLine2}</span>
                    ) : (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[5px] text-stretchLimo">{t.randomPickLine1}</span>
                        <span className="text-[5px] text-stretchLimo">{t.randomPickLine2}</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Tooltip */}
                  {showRandomPickTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-stretchLimo text-white text-xs rounded-lg whitespace-nowrap z-10">
                      {t.randomPickTooltip}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stretchLimo"></div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Re-open Button - When resolved */
            <button
              onClick={handleReopen}
              className="rounded-lg py-4 px-8 text-lg font-bold transition-colors bg-stretchLimo text-white hover:bg-opacity-90"
            >
              {t.reopen}
            </button>
          )}
        </div>
        </div>

        {/* Settings Section */}
        <div className="bg-cardBg rounded-lg divide-y divide-stretchLimo/[0.06] shadow-md border border-stretchLimo/[0.06] -mt-2">
          {/* Importance */}
          <div className="relative">
            <button
              onClick={() => !localDecision.resolved && setShowImportanceDropdown(!showImportanceDropdown)}
              disabled={localDecision.resolved}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stretchLimo50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-stretchLimo" />
                <span className="text-base text-black">{t.importance}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base text-stretchLimo">
                  {t.importanceLevels[localDecision.importance]}
                </span>
                <ChevronDown className="w-4 h-4 text-stretchLimo" />
              </div>
            </button>

            {/* Importance Dropdown */}
            {showImportanceDropdown && (
              <div className="absolute top-full left-0 right-0 bg-cardBg shadow-lg border border-stretchLimo/[0.06] z-10">
                {(Object.keys(IMPORTANCE_LEVELS) as ImportanceLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleImportanceChange(level)}
                    className={`w-full px-4 py-3 text-left hover:bg-stretchLimo100 transition-colors ${
                      localDecision.importance === level ? 'bg-stretchLimo50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base text-stretchLimo">
                        {t.importanceLevels[level]}
                      </span>
                      <span className="text-sm text-micron">
                        {IMPORTANCE_LEVELS[level].minutes < 60
                          ? `${IMPORTANCE_LEVELS[level].minutes}${t.minute}`
                          : IMPORTANCE_LEVELS[level].minutes === 1440
                          ? `24${t.hour}`
                          : IMPORTANCE_LEVELS[level].minutes < 1440
                          ? `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 60)}${t.hour}`
                          : (() => {
                              const days = Math.floor(IMPORTANCE_LEVELS[level].minutes / 1440);
                              return `${days}${t.days}`;
                            })()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Budget - Real-time Countdown */}
          <button
            onClick={() => !localDecision.resolved && setShowTimeBudgetModal(true)}
            disabled={localDecision.resolved}
            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
              localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stretchLimo50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-stretchLimo" />
              <span className="text-base text-black">{t.timeBudget}</span>
            </div>
            <div className="flex items-center gap-2">
              {localDecision.resolved && localDecision.resolvedAt ? (
                <span className="text-base font-medium text-micron">
                  {new Date(localDecision.resolvedAt).toLocaleDateString(t.dateLocale, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} {t.completed}
                </span>
              ) : (
                <span 
                  className={`text-base font-medium ${
                    timeData.isOverdue 
                      ? 'text-scarletSmile' 
                      : timeData.isUrgent 
                        ? 'text-scarletSmile animate-pulse' 
                        : 'text-stretchLimo'
                  }`}
                >
                  {timeData.isOverdue && '-'}
                  {timeData.days > 0 && `${timeData.days}d `}
                  {(timeData.days > 0 || timeData.hours > 0) && `${timeData.hours}h `}
                  {(timeData.days > 0 || timeData.hours > 0 || timeData.minutes > 0) && `${timeData.minutes}m `}
                  <span className="text-sm">{timeData.seconds}s</span>
                  {!timeData.isOverdue && ` ${t.left}`}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-stretchLimo" />
            </div>
          </button>
        </div>

        {/* Divider after Settings Section */}
        <div className="border-t border-stretchLimo/[0.06] my-6"></div>

        {/* Sub-Decisions Section */}
        <div className="relative bg-cardBg rounded-lg shadow-md border border-stretchLimo/[0.06]">
          {/* Info Popover - 섹션 컨테이너 기준 배치 */}
          {showChunkingInfo && (
            <div ref={chunkingInfoRef} className="absolute left-4 right-4 bottom-full -mb-1 bg-stretchLimo text-white rounded-lg px-4 py-3 z-50 shadow-lg">
              {/* 말풍선 꼬리 - info 버튼 바로 위 */}
              <div className={`absolute w-3 h-3 bg-stretchLimo transform rotate-45 ${
                import.meta.env.VITE_LANG === 'ko' 
                  ? 'left-[86px] -bottom-1.5' 
                  : 'left-[46.5%] -bottom-1.5'
              }`} />
              <div>
                <h4 className="text-xs font-semibold whitespace-nowrap">
                  {t.chunkingInfoTitle}
                </h4>
                {!showChunkingInfoExpanded && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowChunkingInfoExpanded(true);
                    }}
                    className="text-[11px] text-white/70 hover:text-white underline mt-1"
                  >
                    {t.chunkingMore}
                  </button>
                )}
              </div>
              {showChunkingInfoExpanded && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    {t.chunkingInfoDesc1Before}{import.meta.env.VITE_LANG === 'ko' && <br className="md:hidden" />}
                    {t.chunkingInfoDesc1BeforeBreak}
                    <span className="font-bold text-white">{t.chunkingInfoDesc1Bold}</span>{t.chunkingInfoDesc1After}
                  </p>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    {t.chunkingInfoDesc2Before}{import.meta.env.VITE_LANG === 'ko' && <br className="md:hidden" />}
                    {t.chunkingInfoDesc2After}
                  </p>
                </div>
              )}
            </div>
          )}
          <div 
            onClick={() => setShowSubDecisions(!showSubDecisions)}
            className="flex items-center justify-between px-4 py-3 hover:bg-stretchLimo50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              <h3 className="text-base font-medium text-stretchLimo">{t.decisionChunking}</h3>
              {/* Info Icon */}
              <button
                ref={chunkingInfoBtnRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (showChunkingInfo) {
                    setShowChunkingInfo(false);
                    setShowChunkingInfoExpanded(false);
                  } else {
                    setShowChunkingInfo(true);
                    setShowChunkingInfoExpanded(false);
                  }
                }}
                className="p-1 rounded-full hover:bg-stretchLimo/5 transition-colors mt-1.5"
              >
                <Info className="w-4 h-4 text-stretchLimo/60 hover:text-stretchLimo cursor-pointer" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-stretchLimo">
                {decisions.filter(d => d.parentId === localDecision.id).length}
              </span>
              {showSubDecisions ? (
                <ChevronDown className="w-4 h-4 text-micron" />
              ) : (
                <ChevronRight className="w-4 h-4 text-micron" />
              )}
            </div>
          </div>

          {showSubDecisions && (
            <div className="px-4 pb-4">
              {/* Sub-Decision List */}
              {decisions
                .filter(d => d.parentId === localDecision.id)
                .sort((a, b) => {
                  // Resolved된 항목은 맨 아래로
                  if (a.resolved && !b.resolved) return 1;
                  if (!a.resolved && b.resolved) return -1;
                  // 둘 다 resolved이거나 둘 다 resolved가 아니면 order로 정렬
                  return (a.order || 0) - (b.order || 0);
                })
                .map((subDecision) => {
                  const subTimeData = formatTimeRemaining(subDecision.deadline);
                  const isDragging = draggedSubDecisionId === subDecision.id;
                  const isDragOver = dragOverSubDecisionId === subDecision.id;
                  return (
                    <button
                      key={subDecision.id}
                      draggable={!localDecision.resolved}
                      onDragStart={(e) => handleDragStart(e, subDecision.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, subDecision.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, subDecision.id)}
                      onClick={() => onSelectDecision(subDecision.id)}
                      className={`w-full flex items-center justify-between p-3 mb-2 rounded-lg transition-colors text-left ${
                        isDragging
                          ? 'opacity-50 bg-stretchLimo100'
                          : isDragOver
                          ? 'bg-stretchLimo bg-opacity-10 border border-stretchLimo border-dashed'
                          : 'bg-cloudDancer/40 hover:bg-cloudDancer/50'
                      } ${localDecision.resolved ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium text-stretchLimo truncate mb-1 ${
                          subDecision.resolved ? 'line-through' : ''
                        }`}>
                          {subDecision.title || t.untitled}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          {subDecision.resolved ? (
                            <span className="font-bold text-black">
                              {t.resolvedText}
                            </span>
                          ) : (
                            <>
                              <span className={`${
                                subTimeData.isOverdue 
                                  ? 'text-scarletSmile' 
                                  : 'text-micron'
                              }`}>
                                {subTimeData.text}
                              </span>
                              <span className="text-micron">·</span>
                              <span className="text-micron">{t.importanceLevels[subDecision.importance]}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-micron flex-shrink-0 ml-2" />
                    </button>
                  );
                })}

              {/* Add Sub-Decision Button */}
              <button
                onClick={() => onCreateSubDecision(localDecision.id)}
                disabled={localDecision.resolved}
                className={`w-full flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg transition-colors text-sm ${
                  localDecision.resolved
                    ? 'border-stretchLimo/20 text-stretchLimo300 opacity-50 cursor-not-allowed'
                    : 'border-stretchLimo/20 text-stretchLimo hover:border-stretchLimo/30 hover:bg-stretchLimo50 hover:text-stretchLimo'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{t.addSubDecision}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Time Budget Modal */}
      {showTimeBudgetModal && (
        <TimeBudgetModal
          initialDeadline={localDecision.deadline}
          initialTimeBudget={localDecision.timeBudget}
          onConfirm={handleTimeBudgetConfirm}
          onClose={() => setShowTimeBudgetModal(false)}
        />
      )}

      {/* Leave Warning Modal */}
      {showLeaveWarning && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-cardBg rounded-2xl w-full max-w-sm p-6 shadow-lg border border-stretchLimo/[0.06]">
              <h3 className="text-lg font-bold text-stretchLimo mb-3">
                {t.decisionTitleRequired}
              </h3>
              <p className="text-base text-micron mb-6">
                {t.leaveWithoutSaving}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelLeave}
                  className="flex-1 bg-cardBg text-stretchLimo shadow border border-stretchLimo/[0.06] rounded-lg py-3 text-base font-bold hover:bg-cloudDancer/30 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleLeaveWithoutSaving}
                  className="flex-1 bg-scarletSmile text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
                >
                  {t.leave}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Decision Mode Switch - Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-stretchLimo border-t-2 border-stretchLimo200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto flex">
          {DECISION_MODES.map((modeOption) => {
            const currentMode = localDecision.mode || DEFAULT_DECISION_MODE;
            const isActive = currentMode === modeOption.value;
            return (
              <button
                key={modeOption.value}
                onClick={() => handleModeChange(modeOption.value)}
                className={`flex-1 py-6 text-sm transition-colors relative ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-white/40 font-medium hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-cloudDancer" />
                )}
                {t.decisionModes[modeOption.value] || modeOption.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowLinkModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-cardBg rounded-2xl w-full max-w-md p-6 shadow-lg border border-stretchLimo/[0.06]">
              <h3 className="text-lg font-bold text-stretchLimo mb-4">
                {editingLinkId ? t.editLink : t.addLink}
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-2">
                    {t.url} <span className="text-scarletSmile">*</span>
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                    className="w-full px-3 py-2 text-sm text-stretchLimo bg-white border border-stretchLimo200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo"
                  />
                </div>

                {/* Loading Indicator */}
                {isLoadingPreview && (
                  <div className="flex items-center gap-2 text-sm text-micron">
                    <div className="w-4 h-4 border-2 border-micron border-t-transparent rounded-full animate-spin" />
                    <span>{t.loadingPreview}</span>
                  </div>
                )}

                {/* Preview */}
                {!isLoadingPreview && (linkTitle || linkImage) && (
                  <div className="bg-stretchLimo50 rounded-lg p-3">
                    <div className="flex gap-3">
                      {linkImage && (
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-stretchLimo200">
                          <img 
                            src={linkImage} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stretchLimo truncate mb-1">
                          {linkTitle}
                        </p>
                        {linkSiteName && (
                          <p className="text-xs text-micron mb-1">
                            {linkSiteName}
                          </p>
                        )}
                        {linkDescription && (
                          <p className="text-xs text-micron line-clamp-2">
                            {linkDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Title Input (Manual Override) */}
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-2">
                    {t.titleOptional}
                  </label>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder={t.customTitle}
                    className="w-full px-3 py-2 text-sm text-stretchLimo bg-white border border-stretchLimo200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 bg-cardBg text-stretchLimo shadow border border-stretchLimo/[0.06] rounded-lg py-3 text-base font-bold hover:bg-cloudDancer/30 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSaveLink}
                  disabled={!linkUrl.trim()}
                  className={`flex-1 rounded-lg py-3 text-base font-bold transition-colors ${
                    linkUrl.trim()
                      ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                      : 'bg-stretchLimo100 text-micron cursor-not-allowed'
                  }`}
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
