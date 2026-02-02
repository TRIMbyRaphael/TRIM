import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Plus, ChevronDown, ChevronRight, Info, Clock, FileText, Trash2, Link as LinkIcon, ExternalLink, Edit } from 'lucide-react';
import { Decision, IMPORTANCE_LEVELS, ImportanceLevel, Link } from '../types/decision';
import TimeBudgetModal from './TimeBudgetModal';
import { fetchOpenGraphData } from '../utils/linkPreview';
import { useCountdown } from '../hooks/useCountdown';

interface DecisionDetailProps {
  decision: Decision;
  onBack: () => void;
  onUpdate: (decision: Decision) => void;
  onDelete: () => void;
}

export default function DecisionDetail({ decision, onBack, onUpdate, onDelete }: DecisionDetailProps) {
  const [localDecision, setLocalDecision] = useState<Decision>(decision);
  const timeData = useCountdown(localDecision.deadline); // Real-time countdown
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showImportanceDropdown, setShowImportanceDropdown] = useState(false);
  const [showTimeBudgetModal, setShowTimeBudgetModal] = useState(false);
  const [showDecisionFraming, setShowDecisionFraming] = useState(false);
  const [showDecisionMemo, setShowDecisionMemo] = useState(false);
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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const initialDecision = useRef<Decision>(decision);

  // Auto-focus on title input when component mounts
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Auto-focus on newly added option
  useEffect(() => {
    if (newOptionId && optionRefs.current[newOptionId]) {
      optionRefs.current[newOptionId]?.focus();
      setNewOptionId(null);
    }
  }, [newOptionId, localDecision.options]);

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
    setNewOptionId(newOption.id);
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
    onUpdate(trimmedDecision);
    onBack();
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
    
    // 메모, framing, 설정 변경 체크
    if (localDecision.memo !== initial.memo) return true;
    if (localDecision.category !== initial.category) return true;
    if (localDecision.importance !== initial.importance) return true;
    if (localDecision.timeBudget !== initial.timeBudget) return true;
    
    if (JSON.stringify(localDecision.framing) !== JSON.stringify(initial.framing)) {
      return true;
    }
    
    return false;
  };

  const handleBackClick = () => {
    const titleEmpty = localDecision.title.trim() === '';
    
    if (titleEmpty && hasChanges()) {
      // 제목 비어있고 변경사항 있음 → 경고 팝업
      setShowLeaveWarning(true);
    } else if (titleEmpty && !hasChanges()) {
      // 제목 비어있고 변경사항 없음 → 삭제하고 나가기
      onDelete();
      onBack();
    } else {
      // 제목 있음 → 저장하고 나가기
      const filteredDecision = {
        ...localDecision,
        options: localDecision.options.filter(opt => opt.title.trim() !== ''),
      };
      onUpdate(filteredDecision);
      onBack();
    }
  };

  const handleLeaveWithoutSaving = () => {
    setShowLeaveWarning(false);
    onDelete();
    onBack();
  };

  const handleCancelLeave = () => {
    setShowLeaveWarning(false);
    titleInputRef.current?.focus();
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

  // Real-time countdown display (removed getTimeRemaining, using timeData from hook)

  return (
    <div className="min-h-screen bg-cloudDancer">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
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
              ref={titleInputRef}
              type="text"
              value={localDecision.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="What's cluttering your mind?"
              className="flex-1 text-xl font-medium text-stretchLimo bg-transparent border-none outline-none placeholder-gray-300"
            />
            <button
              onClick={() => openLinkModal('decision')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LinkIcon className={`w-5 h-5 ${(localDecision.links && localDecision.links.length > 0) ? 'text-stretchLimo' : 'text-micron'}`} />
            </button>
            <button
              onClick={() => setShowDecisionMemo(!showDecisionMemo)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className={`w-5 h-5 ${localDecision.memo ? 'text-stretchLimo' : 'text-micron'}`} />
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
                  </div>
                </a>
              ))}
            </div>
          )}

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
            <div
              key={option.id}
              className={`rounded-lg p-4 group transition-colors ${
                option.isSelected 
                  ? 'bg-stretchLimo bg-opacity-10 border-2 border-stretchLimo' 
                  : 'bg-white'
              }`}
            >
              {/* Option Header */}
              <div className="flex items-center gap-3">
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
                  ref={(el) => (optionRefs.current[option.id] = el)}
                  type="text"
                  value={option.title}
                  onChange={(e) => handleOptionChange(option.id, e.target.value)}
                  onFocus={() => handleOptionFocus(option.id, option.title)}
                  onBlur={() => handleOptionBlur(option.id, option.title)}
                  placeholder="Option"
                  className={`flex-1 text-base bg-transparent border-none outline-none placeholder-gray-300 ${
                    option.isSelected ? 'text-stretchLimo font-medium' : 'text-stretchLimo'
                  }`}
                />
                <button
                  onClick={() => openLinkModal('option', option.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-opacity"
                >
                  <LinkIcon className={`w-4 h-4 ${(option.links && option.links.length > 0) ? 'text-stretchLimo' : 'text-micron'}`} />
                </button>
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
                  className="w-full mt-3 px-3 py-2 text-sm text-stretchLimo bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-stretchLimo resize-none"
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
              : 'bg-gray-100 text-micron cursor-not-allowed border-2 border-gray-200'
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
              : 'bg-gray-100 text-micron cursor-not-allowed border-2 border-gray-200'
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
            onClick={() => setShowTimeBudgetModal(true)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-micron" />
              <span className="text-base text-stretchLimo">Time Budget</span>
            </div>
            <div className="flex items-center gap-2">
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
                {!timeData.isOverdue && ' 남음'}
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
