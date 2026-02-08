import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Plus, ChevronDown, ChevronRight, Info, Clock, Brain, FileText, Trash2, Link as LinkIcon, Edit, Home } from 'lucide-react';
import { Decision, IMPORTANCE_LEVELS, ImportanceLevel, Link, DecisionMode, DECISION_MODES, DEFAULT_DECISION_MODE } from '../types/decision';
import TimeBudgetModal from './TimeBudgetModal';
import { fetchOpenGraphData } from '../utils/linkPreview';
import { useCountdown } from '../hooks/useCountdown';
import { formatTimeRemaining } from '../utils/timeFormat';

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

  // Sync localDecision when decision prop changes (e.g., navigating to sub-decision)
  useEffect(() => {
    setLocalDecision(decision);
    initialDecision.current = decision;
  }, [decision.id]);
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
  const [draggedSubDecisionId, setDraggedSubDecisionId] = useState<string | null>(null);
  const [dragOverSubDecisionId, setDragOverSubDecisionId] = useState<string | null>(null);
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [dragOverOptionId, setDragOverOptionId] = useState<string | null>(null);
  const [longPressOptionId, setLongPressOptionId] = useState<string | null>(null); // 꾹 눌러서 삭제 팝업 표시용
  const [isDragMode, setIsDragMode] = useState(false); // 드래그 모드 활성화 여부
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressingOptionId = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const initialDecision = useRef<Decision>(decision);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  // Use prop-based initial sub-decision count to persist across remounts
  const initialSubDecisionCount = propInitialSubDecisionCount;

  // Auto-focus on title input when component mounts
  useEffect(() => {
    titleInputRef.current?.focus();
    // Auto-resize on mount
    if (titleInputRef.current) {
      titleInputRef.current.style.height = 'auto';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, []);

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
  };

  const handleOptionChange = (optionId: string, title: string) => {
    setLocalDecision({
      ...localDecision,
      options: localDecision.options.map((opt) =>
        opt.id === optionId ? { ...opt, title } : opt
      ),
    });
    
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
    if (window.confirm('Are you sure you want to delete this decision?')) {
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
          currentOpt.memo !== initialOpt.memo) {
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
    setLocalDecision({ ...localDecision, mode });
  };

  const handleFramingChange = (field: 'whatHappened' | 'goal' | 'constraints' | 'dealbreakers' | 'keyFactors', value: string) => {
    setLocalDecision({
      ...localDecision,
      framing: {
        ...localDecision.framing,
        [field]: value,
      },
    });
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

  // Long press handlers for options (iPhone-style)
  const clearLongPressTimers = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (dragModeTimerRef.current) {
      clearTimeout(dragModeTimerRef.current);
      dragModeTimerRef.current = null;
    }
  };

  const handleOptionPointerDown = (e: React.PointerEvent, optionId: string) => {
    if (localDecision.resolved) return;
    // 버튼이나 링크 클릭 시 long press 무시
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    longPressingOptionId.current = optionId;

    // 첫 번째 단계: 300ms 후 삭제 팝업 표시
    longPressTimerRef.current = setTimeout(() => {
      // textarea에서 long press 시 포커스/선택 해제
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl?.closest('textarea')) {
        activeEl.blur();
      }
      window.getSelection()?.removeAllRanges();

      setLongPressOptionId(optionId);

      // 두 번째 단계: 추가 300ms 후 드래그 모드 진입
      dragModeTimerRef.current = setTimeout(() => {
        setLongPressOptionId(null);
        setIsDragMode(true);
        setDraggedOptionId(optionId);
      }, 300);
    }, 300);
  };

  const handleOptionPointerMove = (e: React.PointerEvent) => {
    if (!longPressStartPos.current) return;
    const dx = e.clientX - longPressStartPos.current.x;
    const dy = e.clientY - longPressStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 이동 거리가 크면 → 즉시 드래그 모드 진입 (타이머 단계 건너뜀)
    if (distance > 10 && longPressingOptionId.current) {
      clearLongPressTimers();
      if (!isDragMode) {
        setLongPressOptionId(null);
        setIsDragMode(true);
        setDraggedOptionId(longPressingOptionId.current);
      }
    }
  };

  const handleOptionPointerUp = () => {
    clearLongPressTimers();
    longPressStartPos.current = null;
    longPressingOptionId.current = null;

    // 드래그 모드가 아닐 때만 팝업도 닫기 (팝업 표시 상태에서 놓으면 팝업 유지)
    if (!isDragMode && !longPressOptionId) {
      setLongPressOptionId(null);
    }
  };

  const handleOptionPointerCancel = () => {
    clearLongPressTimers();
    longPressStartPos.current = null;
    longPressingOptionId.current = null;
  };

  // 드래그 모드에서의 터치/마우스 이동으로 reorder
  const handleOptionDragMove = (_e: React.PointerEvent, targetOptionId: string) => {
    if (!isDragMode || !draggedOptionId || draggedOptionId === targetOptionId) return;
    setDragOverOptionId(targetOptionId);
  };

  const handleOptionDragPointerUp = (targetOptionId: string) => {
    if (!isDragMode || !draggedOptionId) return;

    if (draggedOptionId !== targetOptionId) {
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
    }

    setDraggedOptionId(null);
    setDragOverOptionId(null);
    setIsDragMode(false);
    longPressStartPos.current = null;
    longPressingOptionId.current = null;
  };

  // 드래그 모드 외부 클릭으로 종료
  const exitDragMode = () => {
    setDraggedOptionId(null);
    setDragOverOptionId(null);
    setIsDragMode(false);
    setLongPressOptionId(null);
  };

  // HTML5 drag and drop은 드래그 모드에서만 활성화
  const handleOptionDragStart = (e: React.DragEvent, optionId: string) => {
    if (!isDragMode || localDecision.resolved) {
      e.preventDefault();
      return;
    }
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
    setIsDragMode(false);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleOptionDragOver = (e: React.DragEvent, optionId: string) => {
    if (!isDragMode || localDecision.resolved || draggedOptionId === optionId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOptionId(optionId);
  };

  const handleOptionDragLeave = () => {
    setDragOverOptionId(null);
  };

  const handleOptionDrop = (e: React.DragEvent, targetOptionId: string) => {
    e.preventDefault();
    if (!isDragMode || localDecision.resolved || !draggedOptionId || draggedOptionId === targetOptionId) {
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
    setIsDragMode(false);
  };

  // Build breadcrumb path from root to current decision's parent
  const buildBreadcrumbPath = (): Array<{id: string, title: string}> => {
    const path: Array<{id: string, title: string}> = [];
    let currentId = localDecision.parentId;
    
    // Traverse up the parent chain
    while (currentId) {
      const parent = decisions.find(d => d.id === currentId);
      if (!parent) break;
      
      path.unshift({ id: parent.id, title: parent.title || '[Untitled]' });
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
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm">
          <button 
            onClick={() => handleNavigateAway(onBack)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border border-gray-200 ${
                localDecision.resolved 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <span className="font-medium text-stretchLimo">{localDecision.category}</span>
              <ChevronDown className="w-4 h-4 text-stretchLimo" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className="block w-full px-6 py-2 text-left hover:bg-gray-100 text-stretchLimo whitespace-nowrap"
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
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Title Input */}
        <div className="mb-6">
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
              placeholder="What's cluttering your mind?"
              disabled={localDecision.resolved}
              rows={1}
              className={`flex-1 text-xl font-medium text-stretchLimo bg-transparent border-none outline-none placeholder-gray-300 resize-none overflow-hidden ${
                localDecision.resolved ? 'line-through opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <button
              onClick={() => openLinkModal('decision')}
              disabled={localDecision.resolved}
              className={`p-2 rounded-lg transition-colors ${
                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
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
                  : showDecisionMemo
                    ? 'hover:bg-gray-100'
                    : 'bg-stretchLimo hover:bg-opacity-80'
              }`}
            >
              <Brain className="w-5 h-5" stroke={showDecisionMemo ? '#1B1B1B' : 'white'} fill={showDecisionMemo ? 'white' : '#1B1B1B'} />
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
                  className="block bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Thumbnail Image */}
                    {link.image && (
                      <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-200">
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
                          title="Edit preview"
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
                          title="Delete"
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

          {/* Decision Framing Questions (mode-specific) */}
          {showDecisionMemo && (
            <div className="mt-3 space-y-3">
              {/* Q1: What happened? - all modes */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-1">
                  What happened?
                </label>
                <textarea
                  value={localDecision.framing?.whatHappened || ''}
                  onChange={(e) => handleFramingChange('whatHappened', e.target.value)}
                  placeholder="What situation led to this decision..."
                  disabled={localDecision.resolved}
                  className={`w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                    localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  rows={2}
                />
              </div>

              {/* Q2: What am I trying to achieve? - all modes */}
              <div>
                <label className="block text-sm font-medium text-stretchLimo mb-1">
                  What am I trying to achieve?
                </label>
                <textarea
                  value={localDecision.framing?.goal || ''}
                  onChange={(e) => handleFramingChange('goal', e.target.value)}
                  placeholder="What's the purpose of this decision..."
                  disabled={localDecision.resolved}
                  className={`w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                    localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  rows={2}
                />
              </div>

              {/* Q3: Any fixed constraints? - no_clear_options only */}
              {(localDecision.mode || 'do_or_not') === 'no_clear_options' && (
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-1">
                    Any fixed constraints?
                  </label>
                  <textarea
                    value={localDecision.framing?.constraints || ''}
                    onChange={(e) => handleFramingChange('constraints', e.target.value)}
                    placeholder="External constraints you can't change..."
                    disabled={localDecision.resolved}
                    className={`w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                      localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    rows={2}
                  />
                </div>
              )}

              {/* Q4: Any deal-breakers? - no_clear_options only */}
              {(localDecision.mode || 'do_or_not') === 'no_clear_options' && (
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-1">
                    Any deal-breakers?
                  </label>
                  <textarea
                    value={localDecision.framing?.dealbreakers || ''}
                    onChange={(e) => handleFramingChange('dealbreakers', e.target.value)}
                    placeholder="What's non-negotiable for you..."
                    disabled={localDecision.resolved}
                    className={`w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                      localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    rows={2}
                  />
                </div>
              )}

              {/* Q5: Key factors? - choose_best and no_clear_options */}
              {((localDecision.mode || 'do_or_not') === 'choose_best' || (localDecision.mode || 'do_or_not') === 'no_clear_options') && (
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-1">
                    Key factors?
                  </label>
                  <textarea
                    value={localDecision.framing?.keyFactors || ''}
                    onChange={(e) => handleFramingChange('keyFactors', e.target.value)}
                    placeholder="Criteria you'll use to compare options..."
                    disabled={localDecision.resolved}
                    className={`w-full px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                      localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Decision Container Box */}
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-6 mb-6">
          {/* Options List */}
          <div className="space-y-3 mb-4">
          {/* 드래그 모드 배경 오버레이 */}
          {isDragMode && (
            <div 
              className="fixed inset-0 z-30"
              onClick={exitDragMode}
            />
          )}
          {/* 삭제 팝업 배경 오버레이 */}
          {longPressOptionId && !isDragMode && (
            <div 
              className="fixed inset-0 z-30"
              onClick={() => setLongPressOptionId(null)}
            />
          )}
          {localDecision.options.map((option) => {
            const isDragging = isDragMode && draggedOptionId === option.id;
            const isDragOver = isDragMode && dragOverOptionId === option.id;
            const showDeletePopup = longPressOptionId === option.id && !isDragMode;
            return (
            <div
              key={option.id}
              className="relative"
              style={{ zIndex: isDragging ? 40 : showDeletePopup ? 40 : 'auto' }}
            >
              <div
                draggable={isDragMode}
                onDragStart={(e) => handleOptionDragStart(e, option.id)}
                onDragEnd={handleOptionDragEnd}
                onDragOver={(e) => handleOptionDragOver(e, option.id)}
                onDragLeave={handleOptionDragLeave}
                onDrop={(e) => handleOptionDrop(e, option.id)}
                onPointerDown={(e) => handleOptionPointerDown(e, option.id)}
                onPointerMove={handleOptionPointerMove}
                onPointerUp={() => {
                  if (isDragMode && draggedOptionId && draggedOptionId !== option.id) {
                    handleOptionDragPointerUp(option.id);
                  } else {
                    handleOptionPointerUp();
                  }
                }}
                onPointerCancel={handleOptionPointerCancel}
                onPointerEnter={() => handleOptionDragMove({} as React.PointerEvent, option.id)}
                className={`rounded-lg p-4 group transition-all select-none ${
                  isDragging
                    ? 'opacity-50 scale-105 shadow-lg ring-2 ring-stretchLimo'
                    : isDragOver
                    ? 'bg-stretchLimo bg-opacity-5 border-2 border-stretchLimo border-dashed'
                    : isDragMode && !isDragging
                    ? 'animate-[wiggle_0.3s_ease-in-out_infinite] bg-white'
                    : option.isSelected 
                    ? 'bg-stretchLimo bg-opacity-10 border-2 border-stretchLimo' 
                    : 'bg-white'
                }`}
              >
                {/* Option Header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={localDecision.resolved}
                    className={`w-5 h-5 rounded-full border-2 border-stretchLimo flex-shrink-0 flex items-center justify-center ${
                      option.isSelected ? 'bg-stretchLimo' : ''
                    } ${localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-opacity-70'} transition-colors`}
                  >
                    {option.isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                  <textarea
                    ref={(el) => (optionRefs.current[option.id] = el)}
                    value={option.title}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    onFocus={() => handleOptionFocus(option.id, option.title)}
                    onBlur={() => handleOptionBlur(option.id, option.title)}
                    placeholder="Option"
                    rows={1}
                    disabled={localDecision.resolved || isDragMode}
                    className={`flex-1 text-base bg-transparent border-none outline-none placeholder-gray-300 resize-none overflow-hidden ${
                      option.isSelected ? 'text-stretchLimo font-medium' : 'text-stretchLimo'
                    } ${localDecision.resolved && !option.isSelected ? 'line-through opacity-50' : ''} ${
                      localDecision.resolved || isDragMode ? 'cursor-not-allowed' : ''
                    }`}
                  />
                  {!isDragMode && (
                    <>
                      <button
                        onClick={() => openLinkModal('option', option.id)}
                        disabled={localDecision.resolved}
                        className={`p-1 rounded transition-opacity ${
                          localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'
                        }`}
                      >
                        <LinkIcon className={`w-4 h-4 ${(option.links && option.links.length > 0) ? 'text-stretchLimo' : 'text-micron'}`} />
                      </button>
                      <button
                        onClick={() => toggleOptionMemo(option.id)}
                        disabled={localDecision.resolved}
                        className={`p-1 rounded transition-opacity ${
                          localDecision.resolved ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'
                        }`}
                      >
                        <FileText className={`w-4 h-4 ${option.memo ? 'text-stretchLimo' : 'text-micron'}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(option.id)}
                        disabled={localDecision.resolved}
                        className={`transition-opacity p-1 rounded ${
                          localDecision.resolved 
                            ? 'opacity-0 cursor-not-allowed' 
                            : 'opacity-0 group-hover:opacity-100 hover:bg-scarletSmile hover:bg-opacity-10'
                        }`}
                      >
                        <Trash2 className="w-4 h-4 text-scarletSmile" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Long press 삭제 팝업 */}
              {showDeletePopup && (
                <div className="absolute -top-1 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => {
                        handleDeleteOption(option.id);
                        setLongPressOptionId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-scarletSmile hover:bg-scarletSmile hover:bg-opacity-5 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                  {/* 말풍선 꼬리 */}
                  <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45" />
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
                      className="block bg-gray-100 rounded-lg overflow-hidden hover:bg-gray-200 transition-colors relative group/link"
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Thumbnail Image */}
                        {link.image && (
                          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-300">
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
                              title="Edit preview"
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
                              title="Delete"
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

              {/* Option Memo */}
              {showOptionMemos[option.id] && (
                <textarea
                  value={option.memo || ''}
                  onChange={(e) => handleOptionMemoChange(option.id, e.target.value)}
                  placeholder="Add notes about this option..."
                  disabled={localDecision.resolved}
                  className={`w-full mt-3 px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none ${
                    localDecision.resolved ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  rows={2}
                />
              )}
            </div>
            );
          })}

          {/* Add Option Button */}
          <button
            onClick={handleAddOption}
            disabled={localDecision.resolved}
            className={`w-full bg-white rounded-lg p-4 flex items-center gap-3 transition-colors text-micron ${
              localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-base">Add Option</span>
          </button>
        </div>

        {/* TRIM Button and Random Pick Button Container */}
        <div className="relative flex items-center justify-center mb-0 w-full">
          {!localDecision.resolved ? (
            <>
              {/* TRIM Button - Centered */}
              <button
                onClick={handleTrim}
                disabled={!localDecision.options.some(opt => opt.isSelected)}
                className={`rounded-lg py-3 px-16 text-base font-bold transition-colors ${
                  localDecision.options.some(opt => opt.isSelected)
                    ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                    : 'bg-gray-100 text-micron cursor-not-allowed border-2 border-gray-200'
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
                <div className="absolute -right-2 top-[50%] -translate-y-1/2">
                  <button
                    onClick={handleRandomPick}
                    onMouseEnter={() => setShowRandomPickTooltip(true)}
                    onMouseLeave={() => setShowRandomPickTooltip(false)}
                    className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors relative border-0"
                  >
                    <span className="w-6 h-6 text-2xl text-stretchLimo flex items-center justify-center">🎲</span>
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[5px] text-[#6B6B6B]">Random</span>
                      <span className="text-[5px] text-[#6B6B6B]">Pick</span>
                    </div>
                  </button>
                  
                  {/* Tooltip */}
                  {showRandomPickTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                      Stop thinking when impact differences are minimal
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
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
              Re-open
            </button>
          )}
        </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-lg divide-y divide-gray-200 -mt-2">
          {/* Importance */}
          <div className="relative">
            <button
              onClick={() => !localDecision.resolved && setShowImportanceDropdown(!showImportanceDropdown)}
              disabled={localDecision.resolved}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
              }`}
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
                          ? `${IMPORTANCE_LEVELS[level].minutes}min`
                          : IMPORTANCE_LEVELS[level].minutes < 1440
                          ? `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 60)}h`
                          : `${Math.floor(IMPORTANCE_LEVELS[level].minutes / 1440)}d`}
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
              localDecision.resolved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-micron" />
              <span className="text-base text-stretchLimo">Time Budget</span>
            </div>
            <div className="flex items-center gap-2">
              {localDecision.resolved && localDecision.resolvedAt ? (
                <span className="text-base font-medium text-micron">
                  {new Date(localDecision.resolvedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} completed
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
                  {!timeData.isOverdue && ' left'}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-micron" />
            </div>
          </button>
        </div>

        {/* Divider after Settings Section */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Sub-Decisions Section */}
        <div className="bg-white rounded-lg">
          <button
            onClick={() => setShowSubDecisions(!showSubDecisions)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-stretchLimo">Decision Chunking</h3>
              {showSubDecisions ? (
                <ChevronDown className="w-4 h-4 text-micron" />
              ) : (
                <ChevronRight className="w-4 h-4 text-micron" />
              )}
            </div>
            <span className="text-sm text-micron">
              {decisions.filter(d => d.parentId === localDecision.id).length}
            </span>
          </button>

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
                          ? 'opacity-50 bg-gray-100'
                          : isDragOver
                          ? 'bg-stretchLimo bg-opacity-10 border-2 border-stretchLimo border-dashed'
                          : 'bg-gray-50 hover:bg-gray-100'
                      } ${localDecision.resolved ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium text-stretchLimo truncate mb-1 ${
                          subDecision.resolved ? 'line-through' : ''
                        }`}>
                          {subDecision.title || '(제목 없음)'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs">
                          {subDecision.resolved ? (
                            <span className="font-bold text-black">
                              Resolved
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
                              <span className="text-micron">{IMPORTANCE_LEVELS[subDecision.importance].label}</span>
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
                className={`w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg transition-colors text-sm ${
                  localDecision.resolved
                    ? 'border-gray-200 text-micron opacity-50 cursor-not-allowed'
                    : 'border-gray-300 text-micron hover:border-stretchLimo hover:bg-gray-50 hover:text-stretchLimo'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Sub-Decision</span>
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
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-stretchLimo mb-3">
                Decision title is required
              </h3>
              <p className="text-base text-micron mb-6">
                Leave without saving?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelLeave}
                  className="flex-1 bg-white text-stretchLimo border-2 border-stretchLimo rounded-lg py-3 text-base font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveWithoutSaving}
                  className="flex-1 bg-scarletSmile text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Decision Mode Switch - Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex">
          {DECISION_MODES.map((modeOption) => {
            const currentMode = localDecision.mode || DEFAULT_DECISION_MODE;
            const isActive = currentMode === modeOption.value;
            return (
              <button
                key={modeOption.value}
                onClick={() => handleModeChange(modeOption.value)}
                className={`flex-1 py-6 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-stretchLimo'
                    : 'text-micron hover:text-stretchLimo hover:bg-gray-50'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-2 right-2 h-[3px] bg-stretchLimo rounded-b-full" />
                )}
                {modeOption.label}
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
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-stretchLimo mb-4">
                {editingLinkId ? 'Edit Link' : 'Add Link'}
              </h3>
              
              <div className="space-y-4 mb-6">
                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-stretchLimo mb-2">
                    URL <span className="text-scarletSmile">*</span>
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                    className="w-full px-3 py-2 text-sm text-stretchLimo bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo"
                  />
                </div>

                {/* Loading Indicator */}
                {isLoadingPreview && (
                  <div className="flex items-center gap-2 text-sm text-micron">
                    <div className="w-4 h-4 border-2 border-micron border-t-transparent rounded-full animate-spin" />
                    <span>Loading preview...</span>
                  </div>
                )}

                {/* Preview */}
                {!isLoadingPreview && (linkTitle || linkImage) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex gap-3">
                      {linkImage && (
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-200">
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
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="Custom title"
                    className="w-full px-3 py-2 text-sm text-stretchLimo bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 bg-white text-stretchLimo border-2 border-gray-200 rounded-lg py-3 text-base font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLink}
                  disabled={!linkUrl.trim()}
                  className={`flex-1 rounded-lg py-3 text-base font-bold transition-colors ${
                    linkUrl.trim()
                      ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                      : 'bg-gray-100 text-micron cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
