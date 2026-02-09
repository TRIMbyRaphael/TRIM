import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Decision } from '../types/decision';
import { formatTimeRemaining } from '../utils/timeFormat';
import { t } from '../i18n';

interface DecisionChunkingProps {
  parentDecision: Decision;
  subDecisions: Decision[];
  onAddSubDecision: (parentId: string) => void;
  onNavigateToDecision: (decisionId: string) => void;
  isResolved?: boolean;
}

export default function DecisionChunking({
  parentDecision,
  subDecisions,
  onAddSubDecision,
  onNavigateToDecision,
  isResolved = false,
}: DecisionChunkingProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChunkingInfo, setShowChunkingInfo] = useState(false);
  const chunkingInfoRef = useRef<HTMLDivElement>(null);

  // 배경 클릭 시 popover 닫기
  useEffect(() => {
    if (!showChunkingInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chunkingInfoRef.current && !chunkingInfoRef.current.contains(e.target as Node)) {
        setShowChunkingInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChunkingInfo]);

  return (
    <div className="bg-white rounded-lg mt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1"
        >
          <h3 className="text-base font-medium text-stretchLimo">
            {t.decisionChunking}{' '}
            <span className="text-sm font-normal text-micron lowercase">{t.chunkingOptional}</span>
          </h3>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-micron" />
          ) : (
            <ChevronRight className="w-4 h-4 text-micron" />
          )}
        </button>
        <div className="flex items-center gap-2">
          {/* Info Popover */}
          <div className="relative" ref={chunkingInfoRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChunkingInfo(!showChunkingInfo);
              }}
              className="p-1 rounded-full hover:bg-stretchLimo/5 transition-colors"
            >
              <Info className="w-4 h-4 text-stretchLimo/60 hover:text-stretchLimo cursor-pointer" />
            </button>
            {showChunkingInfo && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-stretchLimo/20 shadow-lg max-w-xs rounded-lg p-4 z-50">
                <h4 className="text-base font-semibold text-black mb-2">
                  {t.chunkingInfoTitle}
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-stretchLimo leading-relaxed">
                    {t.chunkingInfoDesc1Before}{t.chunkingInfoDesc1Bold}{t.chunkingInfoDesc1After}
                  </p>
                  <p className="text-sm text-stretchLimo leading-relaxed">
                    {t.chunkingInfoDesc2}
                  </p>
                </div>
              </div>
            )}
          </div>
          <span className="text-sm text-micron">{subDecisions.length}</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Sub-Decision List */}
          {subDecisions.map((subDecision) => {
            const timeData = formatTimeRemaining(subDecision.deadline);
            return (
              <button
                key={subDecision.id}
                onClick={() => onNavigateToDecision(subDecision.id)}
                className="w-full flex items-center justify-between p-3 mb-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-stretchLimo truncate mb-1">
                    {subDecision.title || t.untitledCard}
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`${
                        subDecision.resolved
                          ? 'text-micron'
                          : timeData.isOverdue
                          ? 'text-scarletSmile'
                          : 'text-micron'
                      }`}
                    >
                      {subDecision.resolved ? t.resolvedText : timeData.text}
                    </span>
                    <span className="text-micron">·</span>
                    <span className="text-micron">
                      {t.importanceLevels[subDecision.importance]}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-micron flex-shrink-0 ml-2" />
              </button>
            );
          })}

          {/* Add Sub-Decision Button */}
          {!isResolved && (
            <button
              onClick={() => onAddSubDecision(parentDecision.id)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 hover:border-stretchLimo hover:bg-gray-50 rounded-lg transition-colors text-sm text-micron hover:text-stretchLimo"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addSubDecision}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
