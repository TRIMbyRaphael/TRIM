import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Decision, IMPORTANCE_LEVELS } from '../types/decision';
import { formatTimeRemaining } from '../utils/timeFormat';

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

  return (
    <div className="bg-white rounded-lg mt-6">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-stretchLimo">
            Decision Chunking{' '}
            <span className="text-sm font-normal text-micron lowercase">(optional)</span>
          </h3>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-micron" />
          ) : (
            <ChevronRight className="w-4 h-4 text-micron" />
          )}
        </div>
        <span className="text-sm text-micron">{subDecisions.length}</span>
      </button>

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
                    {subDecision.title || '(제목 없음)'}
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
                      {subDecision.resolved ? 'Resolved' : timeData.text}
                    </span>
                    <span className="text-micron">·</span>
                    <span className="text-micron">
                      {IMPORTANCE_LEVELS[subDecision.importance].label}
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
              <span>Add Sub-Decision</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
