import { Trash2 } from 'lucide-react';
import { Decision } from '../types/decision';
import { useCountdown } from '../hooks/useCountdown';

interface DecisionCardProps {
  decision: Decision;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onUpdateDecision?: (decision: Decision) => void;
  onTrim?: (decisionId: string) => void;
}

export default function DecisionCard({ decision, onClick, onDelete, onUpdateDecision, onTrim }: DecisionCardProps) {
  const timeData = useCountdown(decision.deadline);
  const title = decision.title || '(제목 없음)';
  
  const hasSelectedOption = decision.options.some(opt => opt.isSelected);
  const canTrim = hasSelectedOption && !decision.resolved;

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

  return (
    <div className="relative group">
      <div className="w-full bg-white rounded-lg p-4 shadow-sm">
        {/* Title - Clickable */}
        <button
          onClick={onClick}
          className="w-full text-left mb-2 hover:opacity-70 transition-opacity"
        >
          <h3 className="text-base font-medium text-stretchLimo">
            {title}
          </h3>
        </button>

        {/* Time - Real-time Countdown */}
        <div className="flex items-center gap-1 mb-3 text-sm">
          <span 
            className={`font-medium ${
              timeData.isOverdue 
                ? 'text-scarletSmile' 
                : timeData.isUrgent 
                  ? 'text-scarletSmile animate-pulse' 
                  : 'text-micron'
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
        </div>

        {/* Options List */}
        {decision.options.length > 0 && (
          <div className="space-y-2 mb-3">
            {decision.options.map((option) => (
              <button
                key={option.id}
                onClick={(e) => handleOptionSelect(option.id, e)}
                className="w-full flex items-center gap-2 text-sm text-stretchLimo hover:bg-gray-50 rounded p-1 transition-colors"
              >
                <div className={`w-4 h-4 rounded-full border-2 border-stretchLimo flex-shrink-0 flex items-center justify-center ${
                  option.isSelected ? 'bg-stretchLimo' : ''
                }`}>
                  {option.isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="truncate">{option.title || '(옵션)'}</span>
              </button>
            ))}
          </div>
        )}

        {/* TRIM Button */}
        {!decision.resolved && decision.options.length > 0 && (
          <button
            onClick={handleTrim}
            disabled={!canTrim}
            className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
              canTrim
                ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                : 'bg-gray-100 text-micron cursor-not-allowed border-2 border-gray-200'
            }`}
          >
            TRIM
          </button>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 p-2 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-scarletSmile hover:bg-opacity-10 z-10"
      >
        <Trash2 className="w-4 h-4 text-scarletSmile" />
      </button>
    </div>
  );
}
