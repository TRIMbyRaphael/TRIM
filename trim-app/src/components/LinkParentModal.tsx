import { useState, type ReactNode } from 'react';
import { X, Check } from 'lucide-react';
import { Decision } from '../types/decision';
import { t } from '../i18n';

interface LinkParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDecisionId: string;
  currentParentId: string | null;
  decisions: Decision[];
  onSelectParent: (parentId: string | null) => void;
}

// 특정 사안의 모든 하위 사안 ID를 재귀적으로 수집 (순환 참조 방지)
function getDescendantIds(decisionId: string, decisions: Decision[]): Set<string> {
  const ids = new Set<string>();
  const collect = (parentId: string) => {
    decisions
      .filter(d => d.parentId === parentId)
      .forEach(d => {
        ids.add(d.id);
        collect(d.id);
      });
  };
  collect(decisionId);
  return ids;
}

export default function LinkParentModal({
  isOpen,
  onClose,
  currentDecisionId,
  currentParentId,
  decisions,
  onSelectParent,
}: LinkParentModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(currentParentId);

  if (!isOpen) return null;

  const currentParent = currentParentId
    ? decisions.find(d => d.id === currentParentId)
    : null;

  // 순환 참조 방지: 자기 자신 + 자신의 모든 하위 사안 제외
  const descendantIds = getDescendantIds(currentDecisionId, decisions);

  // 필터링: 자기 자신 제외, resolved 제외, 자신의 하위 사안 제외
  const availableDecisions = decisions.filter(
    d => d.id !== currentDecisionId && !d.resolved && !descendantIds.has(d.id)
  );

  // 트리 구조 구축: 루트 사안 (parentId 없음 또는 parentId가 필터링된 목록에 없는 경우)
  const availableIdSet = new Set(availableDecisions.map(d => d.id));

  const rootDecisions = availableDecisions
    .filter(d => !d.parentId || !availableIdSet.has(d.parentId))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleConfirm = () => {
    onSelectParent(selectedParentId);
    onClose();
  };

  const handleRemoveLink = () => {
    setSelectedParentId(null);
    onSelectParent(null);
    onClose();
  };

  // Case 1에서 "Or change to:" 목록은 현재 부모도 제외
  const filterCurrentParent = (items: Decision[]) =>
    currentParentId ? items.filter(d => d.id !== currentParentId) : items;

  const changeRoots = filterCurrentParent(rootDecisions);

  // 재귀 렌더링: 사안 + 하위 사안을 대시보드와 동일한 트리 구조로
  const renderDecisionItem = (decision: Decision, level: number = 0): ReactNode => {
    const children = availableDecisions
      .filter(d => d.parentId === decision.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Case 1일 때 현재 부모는 제외
    const isHiddenByCurrentParent = currentParentId === decision.id;
    if (isHiddenByCurrentParent) {
      // 현재 부모 자체는 숨기되, 그 자식들은 보여줌 (부모가 제외되므로 루트로 승격)
      return children.map(child => renderDecisionItem(child, level));
    }

    const isSelected = selectedParentId === decision.id;

    return (
      <div key={decision.id}>
        <div
          onClick={() => setSelectedParentId(decision.id)}
          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors relative ${
            isSelected ? 'bg-stretchLimo100' : 'hover:bg-stretchLimo50'
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
        >
          {/* "ㄴ" 연결선 for child items */}
          {level > 0 && (
            <>
              {/* 세로선 */}
              <div
                className="absolute"
                style={{
                  left: `${level * 20}px`,
                  top: '0',
                  width: '2px',
                  height: '14px',
                  backgroundColor: 'rgba(26, 26, 26, 0.30)',
                }}
              />
              {/* 가로선 */}
              <div
                className="absolute"
                style={{
                  left: `${level * 20}px`,
                  top: '14px',
                  width: '10px',
                  height: '2px',
                  backgroundColor: 'rgba(26, 26, 26, 0.30)',
                }}
              />
            </>
          )}

          {/* 라디오 버튼 */}
          <div
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              isSelected
                ? 'border-stretchLimo bg-stretchLimo'
                : 'border-stretchLimo300'
            }`}
          >
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </div>

          {/* 제목 */}
          <span className="text-sm text-black truncate flex-1">
            {decision.title || t.untitledCard}
          </span>
        </div>

        {/* 하위 사안 재귀 렌더링 */}
        {children.length > 0 && (
          <div>
            {children.map(child => renderDecisionItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const hasChangeOptions = changeRoots.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-cardBg rounded-2xl shadow-xl w-[90%] max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-stretchLimo/10">
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors bg-stretchLimo text-white hover:bg-opacity-90"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="flex-1 text-lg font-semibold text-black text-center">{t.linkToParent}</h2>
          <button
            onClick={handleConfirm}
            disabled={selectedParentId === currentParentId}
            className={`p-2 rounded-lg transition-colors ${
              selectedParentId !== currentParentId
                ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                : 'bg-stretchLimo100 text-stretchLimo300 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pt-1.5 pb-4">
          {/* Case 1: 현재 부모가 있는 경우 */}
          {currentParent && (
            <>
              <div className="mb-1">
                <span className="text-xs font-medium text-micron uppercase tracking-wide">
                  {t.currentParent}
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-stretchLimo50 rounded-lg mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">
                    {currentParent.title || t.untitledCard}
                  </p>
                </div>
                <button
                  onClick={handleRemoveLink}
                  className="p-1 hover:bg-stretchLimo100 rounded-full transition-colors flex-shrink-0"
                  title={t.removeLink}
                >
                  <X className="w-4 h-4 text-micron" />
                </button>
              </div>

              {/* 구분선 */}
              {hasChangeOptions && (
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex-1 h-px bg-stretchLimo/10" />
                  <span className="text-xs text-micron">{t.changeParent}</span>
                  <div className="flex-1 h-px bg-stretchLimo/10" />
                </div>
              )}
            </>
          )}

          {/* 트리 구조 목록 */}
          {(currentParent ? hasChangeOptions : rootDecisions.length > 0) ? (
            <div>
              {(currentParent ? changeRoots : rootDecisions).map((d, idx, arr) => (
                <div key={d.id}>
                  {renderDecisionItem(d, 0)}
                  {/* 루트 묶음 사이 구분선 */}
                  {idx < arr.length - 1 && (
                    <div className="my-1.5 mx-2 h-px" style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            !currentParent && (
              <p className="text-sm text-micron text-center py-6">
                {t.noAvailableDecisions}
              </p>
            )
          )}
        </div>

        
      </div>
    </div>
  );
}
