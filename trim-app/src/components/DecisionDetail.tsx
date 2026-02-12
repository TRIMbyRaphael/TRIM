import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Plus, ChevronDown, ChevronRight, Info, AlertCircle, Clock, Lightbulb, FileText, Trash2, Link as LinkIcon, Edit, Home, GripVertical } from 'lucide-react';
import { Decision, Option, IMPORTANCE_LEVELS, ImportanceLevel, Link, DecisionMode, DECISION_MODES, DEFAULT_DECISION_MODE, KeyFactor } from '../types/decision';
import { FaStar, FaRegStar } from 'react-icons/fa';
import TimeBudgetModal from './TimeBudgetModal';
import { fetchOpenGraphData } from '../utils/linkPreview';
import { useCountdown } from '../hooks/useCountdown';
import { formatTimeRemaining } from '../utils/timeFormat';
import { t } from '../i18n';
import logoButtonActive from '../assets/logo-button-active.svg';
import logoButtonInactive from '../assets/logo-button-inactive.svg';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// @dnd-kit 기반 Sortable 래퍼 컴포넌트 (옵션 & 서브디시전 공용)
function SortableItemWrapper({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
    handleProps: Record<string, any>;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return <>{children({ setNodeRef, style, isDragging, handleProps: { ...attributes, ...listeners } })}</>;
}

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
  // @dnd-kit sensors (옵션 & 서브디시전 공용)
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
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
  // 옵션 스와이프 삭제 관련 state & refs
  const [swipedOptionId, setSwipedOptionId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; optionId: string; decided: boolean } | null>(null);
  const swipeCurrentXRef = useRef<number>(0);
  const swipeElementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const chunkingInfoRef = useRef<HTMLDivElement>(null);
  const chunkingInfoBtnRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const framingRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const factorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusFactorIdRef = useRef<string | null>(null);
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

  // 스와이프 열림 상태에서 다른 곳 터치/클릭 시 닫기
  useEffect(() => {
    if (!swipedOptionId) return;
    const handleOutside = (e: TouchEvent | MouseEvent) => {
      const el = swipeElementRefs.current[swipedOptionId];
      const target = e.target as Node;
      // 스와이프된 옵션 내부(콘텐츠 + 삭제 버튼 영역) 터치면 무시
      if (el && el.parentElement?.contains(target)) return;
      resetSwipe(swipedOptionId);
    };
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [swipedOptionId]);

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
    const mode = decision.mode || 'do_or_not';
    const needsKeyFactors = mode === 'choose_best' || mode === 'no_clear_options';
    const hasNoKeyFactors = !decision.keyFactors || decision.keyFactors.length === 0;

    const initDecision =
      needsKeyFactors && hasNoKeyFactors
        ? {
            ...decision,
            keyFactors: [{ id: Date.now().toString(), criteria: '', importance: 0 }],
          }
        : decision;

    setLocalDecision(initDecision);
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
      const framingFields: Array<'whatHappened' | 'goal' | 'constraints' | 'dealbreakers'> = 
        ['whatHappened', 'goal', 'constraints', 'dealbreakers'];
      
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
    
    const framingFields: Array<'whatHappened' | 'goal' | 'constraints' | 'dealbreakers'> = 
      ['whatHappened', 'goal', 'constraints', 'dealbreakers'];
    
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
      // 유저가 샘플을 수정하면 isExample 제거 → 이후 자동 업데이트 대상에서 제외
      if (filteredDecision.isExample && hasChanges()) {
        delete (filteredDecision as Partial<Decision>).isExample;
      }
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

    // 4. choose_best / no_clear_options 전환 시 keyFactors가 비어있으면 기본 1행 추가
    const needsKeyFactors = mode === 'choose_best' || mode === 'no_clear_options';
    const hasNoKeyFactors = !localDecision.keyFactors || localDecision.keyFactors.length === 0;
    const keyFactors = needsKeyFactors && hasNoKeyFactors
      ? [{ id: Date.now().toString(), criteria: '', importance: 0 }]
      : (localDecision.keyFactors || []);

    setLocalDecision({ ...localDecision, mode, options: targetOptions, keyFactors });
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

  // Key Factors handlers
  const handleAddKeyFactor = (): string => {
    const newFactor: KeyFactor = { id: Date.now().toString(), criteria: '', importance: 0 };
    const updatedFactors = [...(localDecision.keyFactors || []), newFactor];
    setLocalDecision({
      ...localDecision,
      keyFactors: updatedFactors,
    });
    return newFactor.id;
  };

  const handleKeyFactorCriteriaChange = (factorId: string, criteria: string) => {
    const updatedFactors = (localDecision.keyFactors || []).map(f =>
      f.id === factorId ? { ...f, criteria } : f
    );
    setLocalDecision({
      ...localDecision,
      keyFactors: updatedFactors,
    });
  };

  const handleKeyFactorImportanceChange = (factorId: string, importance: number) => {
    const updatedFactors = (localDecision.keyFactors || []).map(f =>
      f.id === factorId ? { ...f, importance } : f
    );
    setLocalDecision({
      ...localDecision,
      keyFactors: updatedFactors,
    });
  };

  const handleDeleteKeyFactor = (factorId: string) => {
    const updatedFactors = (localDecision.keyFactors || []).filter(f => f.id !== factorId);
    // Also remove from comparison matrix
    const updatedMatrix = (localDecision.comparisonMatrix || []).filter(c => c.id !== factorId);
    setLocalDecision({
      ...localDecision,
      keyFactors: updatedFactors,
      comparisonMatrix: updatedMatrix,
    });
  };

  // Sync Key Factors → Comparison Matrix
  useEffect(() => {
    const factors = localDecision.keyFactors || [];
    if (factors.length === 0) return;

    const existingMatrix = localDecision.comparisonMatrix || [];
    const existingIds = new Set(existingMatrix.map(c => c.id));
    const factorIds = new Set(factors.map(f => f.id));

    // Add new factors to matrix, update existing ones
    let updated = false;
    let newMatrix = existingMatrix.map(c => {
      if (factorIds.has(c.id)) {
        const factor = factors.find(f => f.id === c.id)!;
        if (c.name !== factor.criteria || c.importance !== factor.importance) {
          updated = true;
          return { ...c, name: factor.criteria, importance: factor.importance };
        }
      }
      return c;
    });

    // Add factors that don't exist in matrix yet
    for (const factor of factors) {
      if (!existingIds.has(factor.id)) {
        newMatrix.push({ id: factor.id, name: factor.criteria, importance: factor.importance, ratings: {} });
        updated = true;
      }
    }

    // Remove matrix entries that were from key factors but were deleted
    const beforeLen = newMatrix.length;
    newMatrix = newMatrix.filter(c => factorIds.has(c.id) || !factors.some(() => false));
    if (newMatrix.length !== beforeLen) updated = true;

    if (updated) {
      setLocalDecision(prev => ({
        ...prev,
        comparisonMatrix: newMatrix,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDecision.keyFactors]);

  // Comparison Matrix handlers
  const handleToggleComparisonMatrix = () => {
    if (!showComparisonMatrix && (!localDecision.comparisonMatrix || localDecision.comparisonMatrix.length === 0)) {
      // Key Factors가 있으면 그것을 기반으로 초기화
      const factors = localDecision.keyFactors || [];
      if (factors.length > 0) {
        setLocalDecision({
          ...localDecision,
          comparisonMatrix: factors.map(f => ({ id: f.id, name: f.criteria, importance: f.importance, ratings: {} })),
        });
      } else {
        // 빈 criteria 1개로 초기화
        setLocalDecision({
          ...localDecision,
          comparisonMatrix: [{ id: Date.now().toString(), name: '', ratings: {} }],
        });
      }
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
  // @dnd-kit: 서브디시전 드래그 종료 핸들러
  const handleSubDecisionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const subDecisions = decisions
      .filter(d => d.parentId === localDecision.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIndex = subDecisions.findIndex(d => d.id === active.id);
    const newIndex = subDecisions.findIndex(d => d.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(subDecisions, oldIndex, newIndex);
      onReorderSubDecisions(localDecision.id, reordered.map(d => d.id));
    }
  };

  // 옵션 스와이프 삭제 핸들러
  const SWIPE_DELETE_WIDTH = 72; // 삭제 버튼 노출 너비 (px)
  const SWIPE_THRESHOLD = 36; // 이 거리 이상 스와이프하면 삭제 버튼 고정 노출

  const resetSwipe = (optionId: string) => {
    const el = swipeElementRefs.current[optionId];
    if (el) {
      el.style.transition = 'transform 0.25s ease-out';
      el.style.transform = 'translateX(0)';
    }
    setSwipedOptionId(null);
  };

  const snapSwipeOpen = (optionId: string) => {
    const el = swipeElementRefs.current[optionId];
    if (el) {
      el.style.transition = 'transform 0.25s ease-out';
      el.style.transform = `translateX(-${SWIPE_DELETE_WIDTH}px)`;
    }
    setSwipedOptionId(optionId);
  };

  const handleOptionTouchStart = (e: React.TouchEvent, optionId: string) => {
    if (localDecision.resolved) return;
    const touch = e.touches[0];
    // 이미 열려있는 다른 옵션이 있으면 닫기
    if (swipedOptionId && swipedOptionId !== optionId) {
      resetSwipe(swipedOptionId);
    }
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, optionId, decided: false };
    swipeCurrentXRef.current = swipedOptionId === optionId ? -SWIPE_DELETE_WIDTH : 0;
    const el = swipeElementRefs.current[optionId];
    if (el) {
      el.style.transition = 'none'; // 드래그 중 애니메이션 제거
    }
  };

  const handleOptionTouchMove = (e: React.TouchEvent, optionId: string) => {
    if (!swipeStartRef.current || swipeStartRef.current.optionId !== optionId) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;

    // 아직 방향이 결정되지 않은 경우
    if (!swipeStartRef.current.decided) {
      // 최소 이동 거리 확인
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;
      // 세로 스크롤이 더 큰 경우 스와이프 무시
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeStartRef.current = null;
        return;
      }
      swipeStartRef.current.decided = true;
    }

    // 수평 스와이프 처리 - 스크롤 방지
    e.stopPropagation();
    const baseOffset = swipedOptionId === optionId ? -SWIPE_DELETE_WIDTH : 0;
    const newOffset = Math.max(-SWIPE_DELETE_WIDTH, Math.min(0, baseOffset + deltaX));

    const el = swipeElementRefs.current[optionId];
    if (el) {
      el.style.transform = `translateX(${newOffset}px)`;
    }
    swipeCurrentXRef.current = newOffset;
  };

  const handleOptionTouchEnd = (optionId: string) => {
    if (!swipeStartRef.current || swipeStartRef.current.optionId !== optionId) return;

    const currentOffset = swipeCurrentXRef.current;
    if (currentOffset < -SWIPE_THRESHOLD) {
      snapSwipeOpen(optionId);
    } else {
      resetSwipe(optionId);
    }
    swipeStartRef.current = null;
  };

  // Drag and drop handlers for options
  // @dnd-kit: 옵션 드래그 종료 핸들러
  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localDecision.options.findIndex(opt => opt.id === active.id);
    const newIndex = localDecision.options.findIndex(opt => opt.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalDecision({
        ...localDecision,
        options: arrayMove(localDecision.options, oldIndex, newIndex),
      });
    }
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
    <div className="h-full bg-cloudDancer overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cardBg shadow-md border-b border-stretchLimo/10 px-4 py-3 flex items-center justify-between">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm border border-stretchLimo/20 ${
                localDecision.resolved 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-cloudDancer/30 hover:shadow-md'
              }`}
            >
              <span className="font-medium text-stretchLimo">{localDecision.category}</span>
              <ChevronDown className="w-4 h-4 text-stretchLimo" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/10 overflow-hidden z-10">
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
            <div className="absolute top-full right-0 mt-1 bg-cardBg rounded-lg shadow-lg border border-stretchLimo/10 overflow-hidden z-10">
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
              <LinkIcon className={`w-5 h-5 ${(localDecision.links && localDecision.links.length > 0) ? 'text-stretchLimo' : 'text-black'}`} />
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
              <Lightbulb className="w-5 h-5" stroke="#1A1A1A" fill={showDecisionMemo ? 'none' : '#1A1A1A'} />
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

                {/* Q5: Key Factors - choose_best and no_clear_options */}
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
                      <div className="space-y-2">
                        {/* Header row */}
                        {(localDecision.keyFactors || []).length > 0 && (
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-xs text-white/50 flex-1">{t.criteria}</span>
                          </div>
                        )}

                        {/* Factor rows */}
                        {(localDecision.keyFactors || []).map((factor, factorIndex) => (
                          <div key={factor.id} className="flex items-center gap-2 group/factor">
                            {/* Criteria text input */}
                            <input
                              ref={(el) => {
                                if (el) {
                                  factorInputRefs.current[factor.id] = el;
                                  if (factor.id === pendingFocusFactorIdRef.current) {
                                    el.focus();
                                    pendingFocusFactorIdRef.current = null;
                                  }
                                } else {
                                  delete factorInputRefs.current[factor.id];
                                }
                              }}
                              type="text"
                              value={factor.criteria}
                              onChange={(e) => handleKeyFactorCriteriaChange(factor.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !localDecision.resolved) {
                                  e.preventDefault();
                                  const factors = localDecision.keyFactors || [];
                                  if (factorIndex < factors.length - 1) {
                                    const nextFactor = factors[factorIndex + 1];
                                    factorInputRefs.current[nextFactor.id]?.focus();
                                  } else {
                                    const newId = handleAddKeyFactor();
                                    pendingFocusFactorIdRef.current = newId;
                                  }
                                }
                              }}
                              placeholder={t.factorCriteriaPlaceholder}
                              disabled={localDecision.resolved}
                              className={`flex-1 min-w-0 max-w-[240px] px-3 py-1.5 text-sm text-white placeholder:text-xs placeholder-white/50 bg-white/10 border border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-white/50 ${
                                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                            {/* Star rating (1-5) */}
                            <div className="flex items-center gap-0.5 flex-shrink-0 ml-4">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    if (localDecision.resolved) return;
                                    // 같은 별을 다시 클릭하면 해제
                                    const newImportance = factor.importance === star ? 0 : star;
                                    handleKeyFactorImportanceChange(factor.id, newImportance);
                                  }}
                                  disabled={localDecision.resolved}
                                  className={`p-0.5 transition-colors ${
                                    localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                                  }`}
                                >
                                  {star <= factor.importance ? (
                                    <FaStar className="w-4 h-4 text-cloudDancer" />
                                  ) : (
                                    <FaRegStar className="w-4 h-4 text-white/40" />
                                  )}
                                </button>
                              ))}
                            </div>
                            {/* Delete button */}
                            {!localDecision.resolved && (
                              <button
                                type="button"
                                onClick={() => handleDeleteKeyFactor(factor.id)}
                                className="p-1 text-white/30 hover:text-scarletSmile transition-colors flex-shrink-0 opacity-0 group-hover/factor:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add factor button */}
                        {!localDecision.resolved && (
                          <button
                            type="button"
                            onClick={handleAddKeyFactor}
                            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors mt-1"
                          >
                            <span>{t.addFactor}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Decision Container Box */}
        <div className={`bg-cardBg rounded-xl mb-6 shadow border border-stretchLimo/10 ${
          (currentMode === 'choose_best' || currentMode === 'no_clear_options') ? 'pt-4 px-4 pb-4' : 'p-6'
        }`}>
          {/* Options List */}
          <div className={`space-y-3 ${
            (currentMode === 'choose_best' || currentMode === 'no_clear_options') ? 'mb-3' : 'mb-5'
          }`}>
          {/* 스와이프 닫기: 다른 곳 터치 시 열린 스와이프 닫기 */}
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionDragEnd}
          >
            <SortableContext
              items={localDecision.options.map(opt => opt.id)}
              strategy={verticalListSortingStrategy}
            >
          {localDecision.options.map((option, index) => {
            return (
            <SortableItemWrapper key={option.id} id={option.id} disabled={!!localDecision.resolved}>
              {({ setNodeRef, style, isDragging, handleProps }) => (
            <div
              ref={setNodeRef}
              style={style}
              className="relative overflow-hidden rounded-lg"
              onTouchStart={(e) => handleOptionTouchStart(e, option.id)}
              onTouchMove={(e) => handleOptionTouchMove(e, option.id)}
              onTouchEnd={() => handleOptionTouchEnd(option.id)}
            >
              {/* 스와이프 시 노출되는 삭제 버튼 (뒤에 고정) */}
              {!localDecision.resolved && (
                <div
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-scarletSmile"
                  style={{ width: `${SWIPE_DELETE_WIDTH}px` }}
                  onClick={() => {
                    handleDeleteOption(option.id);
                    setSwipedOptionId(null);
                  }}
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
              )}

              {/* 스와이프 가능한 콘텐츠 영역 */}
              <div
                ref={(el) => { swipeElementRefs.current[option.id] = el; }}
                className="relative bg-cloudDancer"
                style={{
                  transform: swipedOptionId === option.id ? `translateX(-${SWIPE_DELETE_WIDTH}px)` : 'translateX(0)',
                  transition: 'transform 0.25s ease-out',
                }}
              >
              <div
                className={`rounded-lg py-4 pl-4 pr-2 group transition-colors shadow-sm ${
                  isDragging
                    ? 'opacity-50'
                    : option.isSelected 
                    ? 'bg-stretchLimo bg-opacity-10 border border-stretchLimo' 
                    : 'bg-cardBg shadow border border-stretchLimo/10'
                }`}
              >
              {/* Option Header */}
              <div className="flex items-center gap-1 relative">
                {/* Drag Handle - @dnd-kit listeners 바인딩 */}
                {!localDecision.resolved && (
                  <div
                    {...handleProps}
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
                <div
                  className="flex-1 flex items-center min-w-0"
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
            </div>
              )}
            </SortableItemWrapper>
            );
          })}
            </SortableContext>
          </DndContext>

          {/* Add Option Button - 숨김: do_or_not 모드 */}
          {currentMode !== 'do_or_not' && (
            <button
              onClick={handleAddOption}
              disabled={localDecision.resolved}
              className={`w-full bg-cardBg rounded-lg p-4 flex items-center gap-3 transition-shadow text-micron shadow border border-stretchLimo/10 ${
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
                          <th key={criteria.id} className="text-center text-xs font-medium text-white/70 pb-2 px-1 min-w-[72px] group/criteriaHead relative">
                            <div className="relative">
                              <input
                                type="text"
                                value={criteria.name}
                                onChange={(e) => handleCriteriaNameChange(criteria.id, e.target.value)}
                                placeholder={t.criteria}
                                className="w-full text-xs text-center font-medium text-white bg-transparent border-none outline-none placeholder-white/50"
                              />
                              <button
                                onClick={() => handleDeleteCriteria(criteria.id)}
                                className="absolute -right-1 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-scarletSmile transition-colors opacity-0 group-hover/criteriaHead:opacity-100"
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
                    ? logoButtonActive 
                    : logoButtonInactive
                  } 
                  alt="TRIM" 
                  className="h-4"
                />
              </button>

              {/* Random Pick Button - Right Positioned */}
              {localDecision.options.length >= 2 && (
                <div className="absolute -right-2 top-[50%] -translate-y-1/2">
                  <button
                    onClick={handleRandomPick}
                    onMouseEnter={() => setShowRandomPickTooltip(true)}
                    onMouseLeave={() => setShowRandomPickTooltip(false)}
                    className="flex items-center justify-center p-2 rounded-lg transition-colors relative border-0"
                  >
                    {/* Dice with question marks on each face */}
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                      {/* Top face */}
                      <path d="M16 2L28 9V9L16 16L4 9V9L16 2Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      {/* Left face */}
                      <path d="M4 9L16 16V30L4 23V9Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      {/* Right face */}
                      <path d="M28 9L16 16V30L28 23V9Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      {/* Question mark - top face (compressed vertically to look flat) */}
                      <text x="16" y="12" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif" transform="translate(0,9) scale(1,0.58) translate(0,-9)">?</text>
                      {/* Question mark - left face (skewed to follow face slope) */}
                      <text x="10" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif" transform="translate(10,0) skewY(30) translate(-10,0)">?</text>
                      {/* Question mark - right face (skewed opposite direction) */}
                      <text x="22" y="22" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif" transform="translate(22,0) skewY(-30) translate(-22,0)">?</text>
                    </svg>
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
        <div className="bg-cardBg rounded-lg divide-y divide-stretchLimo/[0.06] shadow-md border border-stretchLimo/10 -mt-2">
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
                <AlertCircle className="w-5 h-5 text-stretchLimo" />
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
              <div className="absolute top-full left-0 right-0 bg-cardBg shadow-lg border border-stretchLimo/10 z-10">
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
        <div className="border-t border-stretchLimo/10 my-6"></div>

        {/* Sub-Decisions Section */}
        <div className="relative bg-cardBg rounded-lg shadow-md border border-stretchLimo/10">
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
              {/* Sub-Decision List - @dnd-kit */}
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSubDecisionDragEnd}
              >
                <SortableContext
                  items={decisions
                    .filter(d => d.parentId === localDecision.id)
                    .sort((a, b) => {
                      if (a.resolved && !b.resolved) return 1;
                      if (!a.resolved && b.resolved) return -1;
                      return (a.order || 0) - (b.order || 0);
                    })
                    .map(d => d.id)}
                  strategy={verticalListSortingStrategy}
                >
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
                  return (
                    <SortableItemWrapper key={subDecision.id} id={subDecision.id} disabled={!!localDecision.resolved}>
                      {({ setNodeRef, style, isDragging, handleProps }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className="mb-2"
                    >
                      <button
                        onClick={() => onSelectDecision(subDecision.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                          isDragging
                            ? 'opacity-50 bg-stretchLimo100'
                            : 'bg-cloudDancer/40 hover:bg-cloudDancer/50'
                        } ${localDecision.resolved ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {/* Drag Handle */}
                        {!localDecision.resolved && (
                          <div
                            {...handleProps}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-grab active:cursor-grabbing mr-2 text-micron hover:text-stretchLimo transition-colors"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
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
                    </div>
                      )}
                    </SortableItemWrapper>
                  );
                })}
                </SortableContext>
              </DndContext>

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
            <div className="bg-cardBg rounded-2xl w-full max-w-sm p-6 shadow-lg border border-stretchLimo/10">
              <h3 className="text-lg font-bold text-stretchLimo mb-3">
                {t.decisionTitleRequired}
              </h3>
              <p className="text-base text-micron mb-6">
                {t.leaveWithoutSaving}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelLeave}
                  className="flex-1 bg-cardBg text-stretchLimo shadow border border-stretchLimo/10 rounded-lg py-3 text-base font-bold hover:bg-cloudDancer/30 transition-colors"
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
                className={`flex-1 py-5 text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'text-white font-bold scale-105 bg-white/10'
                    : 'text-white/35 font-medium hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                )}
                <span className={`relative ${isActive ? 'text-[15px]' : 'text-[13px]'}`}>
                  {t.decisionModes[modeOption.value] || modeOption.label}
                </span>
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
            <div className="bg-cardBg rounded-2xl w-full max-w-md p-6 shadow-lg border border-stretchLimo/10">
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
                  className="flex-1 bg-cardBg text-stretchLimo shadow border border-stretchLimo/10 rounded-lg py-3 text-base font-bold hover:bg-cloudDancer/30 transition-colors"
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
