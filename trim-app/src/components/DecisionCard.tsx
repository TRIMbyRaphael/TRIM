import { Trash2, Link as LinkIcon, ChevronUp } from 'lucide-react';
import { Decision } from '../types/decision';
import { useCountdown } from '../hooks/useCountdown';
import { ReactNode, useState, useRef } from 'react';

interface DecisionCardProps {
  decision: Decision;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onUpdateDecision?: (decision: Decision) => void;
  onTrim?: (decisionId: string) => void;
  onReopen?: (decisionId: string) => void;
  level?: number;
  children?: ReactNode;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function DecisionCard({ decision, onClick, onDelete, onUpdateDecision, onTrim, onReopen, level = 0, children, hasChildren = false, isExpanded = true, onToggleExpand }: DecisionCardProps) {
  const timeData = useCountdown(decision.deadline);
  const title = decision.title || '(제목 없음)';
  
  const hasSelectedOption = decision.options.some(opt => opt.isSelected);
  const canTrim = hasSelectedOption && !decision.resolved;

  // Long press 삭제 관련 state
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletePopupShownAtRef = useRef<number | null>(null);

  // Level-based styling - 계층별 depth 표현
  const getBackgroundColor = () => {
    return '#FFFFFF'; // 모든 레벨 흰색 (cloudDancer 배경에서 떠 있는 느낌)
  };

  const getPadding = () => {
    const basePadding = 12 - (level * 2);
    return Math.max(basePadding, 6); // minimum 6px
  };

  const getBorderStyle = () => {
    if (level === 0) return '1px solid rgba(44, 44, 46, 0.20)'; // stretchLimo/20
    return '1px solid rgba(44, 44, 46, 0.15)'; // stretchLimo/15
  };

  const getShadowClass = () => {
    if (level === 0) return 'shadow-sm';
    if (level === 1) return 'shadow-md';
    return 'shadow-lg'; // Level 2+
  };

  const getIndentation = () => {
    // No indentation - children are contained within parent box
    return 0;
  };

  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleOptionSelect = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateDecision) return;

    const clickedOption = decision.options.find(opt => opt.id === optionId);
    
    // 이미 선택된 옵션을 다시 클릭하면 선택 취소
    const updatedOptions = decision.options.map(opt => ({
      ...opt,
      isSelected: clickedOption?.isSelected ? false : opt.id === optionId,
    }));

    onUpdateDecision({
      ...decision,
      options: updatedOptions,
    });
  };

  const handleTrim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTrim || !canTrim) return;
    onTrim(decision.id);
  };

  const handleReopen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReopen) return;
    onReopen(decision.id);
  };

  // Long press 핸들러
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDecisionPointerDown = (e: React.PointerEvent) => {
    // 버튼이나 링크 클릭 시 long press 무시
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    // 400ms 후 삭제 팝업 표시
    longPressTimerRef.current = setTimeout(() => {
      window.getSelection()?.removeAllRanges();
      setShowDeletePopup(true);
      deletePopupShownAtRef.current = Date.now();
      longPressTimerRef.current = null;
    }, 400);
  };

  const handleDecisionPointerUp = () => {
    // 타이머만 취소하고, 이미 표시된 팝업은 유지
    clearLongPressTimer();
  };

  const handleDecisionPointerCancel = () => {
    clearLongPressTimer();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(e);
    setShowDeletePopup(false);
    deletePopupShownAtRef.current = null;
  };

  return (
    <div 
      className="flex items-start gap-2 group"
      style={{ 
        marginLeft: `${getIndentation()}px`,
      }}
    >
      <div 
        className={`flex-1 rounded-lg ${getShadowClass()} relative cursor-pointer`}
        onClick={onClick}
        onPointerDown={handleDecisionPointerDown}
        onPointerUp={handleDecisionPointerUp}
        onPointerCancel={handleDecisionPointerCancel}
        style={{
          backgroundColor: getBackgroundColor(),
          padding: `${getPadding()}px`,
          paddingLeft: hasChildren ? '16px' : `${getPadding()}px`,
          border: getBorderStyle(),
        }}
      >
        {/* 삭제 팝업 배경 오버레이 */}
        {showDeletePopup && (
          <div 
            className="fixed inset-0 z-30"
            onClick={() => {
              setShowDeletePopup(false);
              deletePopupShownAtRef.current = null;
            }}
          />
        )}

        {/* Long press 삭제 팝업 */}
        {showDeletePopup && (
          <div 
            className="absolute -top-12 left-4 z-50 select-none"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-xl border border-stretchLimo200 overflow-hidden min-w-[140px]">
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-scarletSmile hover:bg-scarletSmile hover:bg-opacity-5 transition-colors text-sm font-medium select-none"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
            {/* 말풍선 꼬리 */}
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-white border-r border-b border-stretchLimo200 transform rotate-45" />
          </div>
        )}
        {/* "ㄴ" 모양 연결선 for child items */}
        {level > 0 && (
          <>
            {/* 세로선 */}
            <div
              className="absolute"
              style={{
                left: '-12px',
                top: '0',
                width: '2px',
                height: '14px',
                backgroundColor: 'rgba(44, 44, 46, 0.30)', // stretchLimo/30
              }}
            />
            {/* 가로선 */}
            <div
              className="absolute"
              style={{
                left: '-12px',
                top: '14px',
                width: '12px',
                height: '2px',
                backgroundColor: 'rgba(44, 44, 46, 0.30)', // stretchLimo/30
              }}
            />
          </>
        )}
        
        {/* Title and Time Row */}
        <div className="flex items-center gap-2 mb-1">
          {/* Title */}
          <div
            className="text-left"
            style={hasChildren ? { marginLeft: '-6px' } : undefined}
          >
            <h3 className={`text-base font-medium inline-block ${decision.resolved ? 'line-through text-micron' : 'text-black'}`}>
              {title}
              {/* ...more button (Collapsed state with children) - Inline with title, appears at end of last line */}
              {hasChildren && !isExpanded && onToggleExpand && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  className="text-xs text-stretchLimo hover:text-stretchLimo transition-colors cursor-pointer ml-1"
                >
                  ...more
                </span>
              )}
            </h3>
          </div>
          
          {/* Spacer */}
          {(!hasChildren || isExpanded) && <div className="flex-1" />}
          
          {/* Time - Real-time Countdown or Resolved Time - Only show if no children or expanded */}
          {(!hasChildren || isExpanded) && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              {decision.resolved && decision.resolvedAt ? (
                <span className="font-medium text-micron">
                  {new Date(decision.resolvedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} completed
                </span>
              ) : (
                <span 
                  className={`font-medium ${
                    timeData.isOverdue 
                      ? 'text-scarletSmile' 
                      : timeData.isUrgent 
                        ? 'text-scarletSmile animate-pulse' 
                        : 'text-stretchLimo'
                  }`}
                >
                  {/* 초를 제외한 부분 */}
                  {timeData.isOverdue && '-'}
                  {timeData.days > 0 && `${timeData.days}d `}
                  {(timeData.days > 0 || timeData.hours > 0) && `${timeData.hours}h `}
                  {(timeData.days > 0 || timeData.hours > 0 || timeData.minutes > 0) && `${timeData.minutes}m `}
                  {/* 초는 작은 폰트 */}
                  <span className="text-xs">{timeData.seconds}s</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Options List */}
        {(!hasChildren || isExpanded) && decision.options.length > 0 && (
          <div className="space-y-2 mb-2">
            {decision.options.map((option) => (
              <div key={option.id} className="space-y-2">
                {/* Option Header */}
                <button
                  onClick={(e) => handleOptionSelect(option.id, e)}
                  disabled={decision.resolved}
                  className={`w-full flex items-start justify-start gap-2 text-sm rounded p-1 transition-colors text-left ${
                    decision.resolved ? 'cursor-not-allowed' : 'hover:bg-stretchLimo50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-micron flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    option.isSelected ? 'bg-micron' : ''
                  }`}>
                    {option.isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={`break-words ${decision.resolved && !option.isSelected ? 'line-through text-micron' : decision.resolved ? 'text-black font-medium' : 'text-black'}`}>
                    {option.title || '(옵션)'}
                  </span>
                </button>

                {/* Link Previews */}
                {option.links && option.links.length > 0 && (
                  <div className="ml-6 space-y-1.5">
                    {option.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block bg-stretchLimo50 rounded-md overflow-hidden hover:bg-stretchLimo100 transition-colors"
                      >
                        <div className="flex items-start gap-2 p-2">
                          {/* Thumbnail */}
                          {link.image && (
                            <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-stretchLimo200">
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
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {!link.image && <LinkIcon className="w-3 h-3 text-micron flex-shrink-0" />}
                              <span className="text-xs font-semibold text-stretchLimo truncate">
                                {link.title || link.url}
                              </span>
                            </div>
                            <p className="text-[10px] text-micron truncate">
                              {link.siteName || getDomain(link.url)}
                            </p>
                            {link.description && (
                              <p className="text-[10px] text-micron line-clamp-1 mt-0.5">
                                {link.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TRIM Button / Re-open Button */}
        {(!hasChildren || isExpanded) && decision.options.length > 0 && (
          <div className="flex items-center justify-center">
            {decision.resolved ? (
              <button
                onClick={handleReopen}
                className="w-[200px] py-2 rounded-lg text-sm font-bold transition-colors bg-stretchLimo text-white hover:bg-opacity-90"
              >
                Re-open
              </button>
            ) : (
              <button
                onClick={handleTrim}
                disabled={!canTrim}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                  canTrim
                    ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                    : 'bg-stretchLimo100 text-stretchLimo300 cursor-not-allowed border-2 border-stretchLimo200'
                }`}
              >
                <img 
                  src={canTrim 
                    ? '/src/assets/logo-button-active.svg' 
                    : '/src/assets/logo-button-inactive.svg'
                  }
                  alt="TRIM"
                  className="h-4 mx-auto"
                />
              </button>
            )}
          </div>
        )}

        {/* Collapse Button - Only for expanded state with children */}
        {hasChildren && isExpanded && onToggleExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 mt-2 hover:opacity-70 transition-opacity group/collapse"
          >
            <div className="flex-1 h-px bg-stretchLimo200" />
            <ChevronUp className="w-4 h-4 text-stretchLimo group-hover/collapse:text-stretchLimo transition-colors" />
            <div className="flex-1 h-px bg-stretchLimo200" />
          </button>
        )}

        {/* Children (Sub-decisions) */}
        {children && (
          <div 
            className="mt-2 space-y-2"
            style={{
              marginLeft: '12px',
            }}
            onClick={(e) => e.stopPropagation()} // Sub-decision 클릭 시 parent로 이벤트 전파 방지
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
