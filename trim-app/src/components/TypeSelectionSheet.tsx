import { useEffect } from 'react';
import { DecisionMode } from '../types/decision';
import { t } from '../i18n';

interface TypeSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onTypeSelect: (type: DecisionMode) => void;
}

interface TypeOption {
  type: DecisionMode;
  label: string;
  description: string;
}

export default function TypeSelectionSheet({ isOpen, onClose, onTypeSelect }: TypeSelectionSheetProps) {
  // 시트가 열려 있을 때 배경 스크롤 차단
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const root = document.getElementById('root');
      if (root?.firstElementChild) {
        (root.firstElementChild as HTMLElement).style.overflow = 'hidden';
      }
      return () => {
        document.body.style.overflow = '';
        if (root?.firstElementChild) {
          (root.firstElementChild as HTMLElement).style.overflow = '';
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const typeOptions: TypeOption[] = [
    {
      type: 'do_or_not',
      label: t.decisionModes.do_or_not,
      description: t.typeDescDoOrNot,
    },
    {
      type: 'choose_best',
      label: t.decisionModes.choose_best,
      description: t.typeDescChooseBest,
    },
    {
      type: 'no_clear_options',
      label: t.decisionModes.no_clear_options,
      description: t.typeDescNoClear,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="bg-cardBg rounded-t-2xl shadow-lg border-t border-stretchLimo/10">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-stretchLimo200 rounded-full" />
          </div>

          <div className="max-w-2xl mx-auto px-6 pb-1 md:pb-8 pt-2">
            <h2 className="text-lg font-bold text-stretchLimo mb-5">
              {t.chooseDecisionType}
            </h2>

            <div className="space-y-3">
              {/* 첫 두 옵션: Do or Not, A or B or C */}
              {typeOptions.slice(0, 2).map((option) => (
                <button
                  key={option.type}
                  onClick={() => onTypeSelect(option.type)}
                  className="w-full text-left bg-cloudDancer rounded-xl p-4 border border-stretchLimo/10 hover:bg-stretchLimo50 hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <div className="font-semibold text-stretchLimo text-lg leading-tight">
                    {option.label}
                  </div>
                  <div className="text-xs text-micron mt-1">
                    {option.description}
                  </div>
                </button>
              ))}

              {/* ── or ── 구분선 */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-stretchLimo/15" />
                <span className="text-xs text-micron/70 font-medium shrink-0">
                  {t.typeSelectionOr}
                </span>
                <div className="flex-1 h-px bg-stretchLimo/15" />
              </div>

              {/* 세 번째 옵션: 선택지 불분명 */}
              {typeOptions.slice(2).map((option) => (
                <button
                  key={option.type}
                  onClick={() => onTypeSelect(option.type)}
                  className="w-full text-left bg-cloudDancer rounded-xl p-4 border border-stretchLimo/10 hover:bg-stretchLimo50 hover:shadow-md active:scale-[0.98] transition-all"
                >
                  <div className="font-semibold text-stretchLimo text-lg leading-tight">
                    {option.label}
                  </div>
                  <div className="text-xs text-micron mt-1">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Safe area padding for iOS */}
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  );
}
