import { useState } from 'react';
import { X } from 'lucide-react';
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

  // 필터링: 자기 자신 제외
  const availableDecisions = decisions.filter(d => d.id !== currentDecisionId);

  const currentParent = currentParentId
    ? decisions.find(d => d.id === currentParentId)
    : null;

  const handleConfirm = () => {
    onSelectParent(selectedParentId);
    onClose();
  };

  const handleRemoveLink = () => {
    setSelectedParentId(null);
    onSelectParent(null);
    onClose();
  };

  // Case 1에서 "Or change to:" 목록은 현재 부모 제외
  const changeOptions = currentParentId
    ? availableDecisions.filter(d => d.id !== currentParentId)
    : availableDecisions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-cardBg rounded-2xl shadow-xl w-[90%] max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stretchLimo/10">
          <h2 className="text-lg font-semibold text-black">{t.linkToParent}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stretchLimo100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stretchLimo" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
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
              {changeOptions.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-stretchLimo/10" />
                    <span className="text-xs text-micron">{t.changeParent}</span>
                    <div className="flex-1 h-px bg-stretchLimo/10" />
                  </div>
                </>
              )}
            </>
          )}

          {/* Case 2: 부모가 없는 경우 - 또는 Case 1의 변경 목록 */}
          {changeOptions.length > 0 ? (
            <div className="space-y-1">
              {changeOptions.map(d => (
                <label
                  key={d.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedParentId === d.id
                      ? 'bg-stretchLimo100'
                      : 'hover:bg-stretchLimo50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedParentId === d.id
                        ? 'border-stretchLimo bg-stretchLimo'
                        : 'border-stretchLimo300'
                    }`}
                  >
                    {selectedParentId === d.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm text-black truncate">
                    {d.title || t.untitledCard}
                  </span>
                  {d.resolved && (
                    <span className="text-[10px] text-micron bg-stretchLimo100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {t.resolvedText}
                    </span>
                  )}
                </label>
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stretchLimo/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-stretchLimo/20 text-stretchLimo hover:bg-stretchLimo50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedParentId === currentParentId}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              selectedParentId !== currentParentId
                ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                : 'bg-stretchLimo100 text-stretchLimo300 cursor-not-allowed'
            }`}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
