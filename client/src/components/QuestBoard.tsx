import React from 'react';
import { Check, Flame, Skull, X } from 'lucide-react';
import { QuestSlot } from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';

interface QuestBoardProps {
  quests: QuestSlot[];
  currentQuestNumber: number;
  rejectionTrack: number;
  canSelectTargetQuest: boolean;
  onSelectTargetQuest: (questIndex: number) => void;
}

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export const QuestBoard: React.FC<QuestBoardProps> = ({
  quests,
  currentQuestNumber,
  rejectionTrack,
  canSelectTargetQuest,
  onSelectTargetQuest,
}) => {
  const { tapLight } = useHaptics();
  const pendingOrActiveCount = quests.filter(
    (q) => q.status === 'PENDING' || q.status === 'ACTIVE'
  ).length;

  return (
    <section className="px-3 py-2 bg-[#100d17]/90 border-b border-amber-500/20 shrink-0">
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {quests.map((quest) => {
          const isCurrent = quest.index === currentQuestNumber && quest.status === 'ACTIVE';
          const isSuccess = quest.status === 'SUCCESS';
          const isFail = quest.status === 'FAIL';
          const isFifthLocked = quest.index === 5 && pendingOrActiveCount > 3;
          const isSelectable =
            canSelectTargetQuest &&
            (quest.status === 'PENDING' || quest.status === 'ACTIVE') &&
            !isFifthLocked;

          let medallionClasses =
            'bg-gradient-to-b from-[#1a1624] to-[#110e18] border-amber-500/20 text-[#b8ab92]';
          if (isSuccess) {
            medallionClasses =
              'bg-gradient-to-b from-sky-900/90 to-[#0c1e33] border-sky-400/80 text-sky-100 shadow-azurering';
          } else if (isFail) {
            medallionClasses =
              'bg-gradient-to-b from-rose-950/95 to-[#230b12] border-rose-500/85 text-rose-100 shadow-crimsonring';
          } else if (isCurrent) {
            medallionClasses =
              'bg-gradient-to-b from-amber-950/80 to-[#1f160b] border-amber-400 text-amber-100 shadow-goldring ring-1 ring-amber-400/50';
          } else if (isSelectable) {
            medallionClasses =
              'bg-gradient-to-b from-[#211b2c] to-[#13101a] border-amber-400/45 border-dashed text-amber-200';
          }

          const btnClasses =
            'relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all ' +
            medallionClasses +
            ' ' +
            (isSelectable ? 'cursor-pointer active:scale-95' : 'cursor-default');

          return (
            <button
              key={quest.index}
              type="button"
              disabled={!isSelectable}
              onClick={() => {
                if (isSelectable) {
                  tapLight();
                  onSelectTargetQuest(quest.index);
                }
              }}
              className={btnClasses}
            >
              <span className="font-display text-[9px] font-bold uppercase tracking-widest opacity-80">
                Gesta {ROMAN_NUMERALS[quest.index] ?? quest.index}
              </span>
              <span className="font-display text-base font-extrabold leading-tight mt-0.5">
                {quest.teamSize}
              </span>
              {quest.requiresTwoFails && !quest.results && (
                <span className="text-[8.5px] leading-none text-amber-300 font-semibold mt-0.5">
                  2 fallos
                </span>
              )}
              {quest.results && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono mt-0.5 opacity-90">
                  <span className="inline-flex items-center text-sky-300">
                    {quest.results.successes}
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className="inline-flex items-center text-rose-300">
                    {quest.results.fails}
                    <X className="w-2.5 h-2.5" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Medidor de Discordia / Rechazos */}
      <div className="flex items-center justify-between px-1 pt-0.5">
        <span className="text-[11px] font-medium text-[#b3a68d] flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-amber-500/80" />
          Discordia (rechazos):
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => {
            const filled = rejectionTrack >= step;
            const isFifth = step === 5;
            const stepClasses =
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border transition-all ' +
              (filled
                ? isFifth
                  ? 'bg-rose-700 border-rose-300 text-white shadow-[0_0_10px_rgba(244,63,94,0.65)]'
                  : 'btn-royal-gold'
                : isFifth
                ? 'bg-[#17111a] border-rose-500/35 text-rose-400/75'
                : 'bg-[#15121d] border-amber-500/20 text-[#786c57]');

            return (
              <div key={step} className={stepClasses}>
                {isFifth ? <Skull className="w-3 h-3" /> : step}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
