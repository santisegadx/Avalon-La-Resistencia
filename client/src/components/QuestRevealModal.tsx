import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface QuestRevealModalProps {
  cards: Array<'SUCCESS' | 'FAIL'>;
  questNumber: number;
  requiresTwoFails: boolean;
  isHost: boolean;
  onCompleteReveal: () => void;
}

export const QuestRevealModal: React.FC<QuestRevealModalProps> = ({
  cards,
  questNumber,
  requiresTwoFails,
  isHost,
  onCompleteReveal,
}) => {
  const { revealSuccess, revealFail, tapMedium } = useHaptics();

  const orderedCards = useMemo(() => {
    const successes = cards.filter((c) => c === 'SUCCESS');
    const fails = cards.filter((c) => c === 'FAIL');
    return [...successes, ...fails];
  }, [cards]);

  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);
    const timers: number[] = [];

    orderedCards.forEach((card, index) => {
      const timer = window.setTimeout(() => {
        setRevealedCount(index + 1);
        if (card === 'SUCCESS') {
          revealSuccess();
        } else {
          revealFail();
        }
      }, (index + 1) * 1200);
      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [orderedCards, revealSuccess, revealFail]);

  const allRevealed = revealedCount >= orderedCards.length;
  const failCount = orderedCards.filter((c) => c === 'FAIL').length;
  const questFailed = requiresTwoFails ? failCount >= 2 : failCount >= 1;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-sm p-5 rounded-2xl bg-[#12151e] border border-slate-700 shadow-2xl text-center">
        <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
          Resultado de Gesta {questNumber}
        </span>
        <h2 className="text-lg font-extrabold text-slate-100 mt-1 mb-4">
          {allRevealed
            ? questFailed
              ? '¡La Gesta ha Fracasado!'
              : '¡La Gesta ha Triunfado!'
            : 'Revelando cartas del equipo...'}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3 my-4">
          {orderedCards.map((card, idx) => {
            const isFlipped = idx < revealedCount;
            const isSuccess = card === 'SUCCESS';
            const cardClasses =
              'w-20 h-28 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg ' +
              (!isFlipped
                ? 'bg-slate-900 border-slate-700 text-slate-600'
                : isSuccess
                ? 'bg-sky-950/90 border-sky-400 text-sky-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200');

            return (
              <motion.div
                key={idx}
                initial={{ rotateY: 180, scale: 0.9 }}
                animate={{
                  rotateY: isFlipped ? 0 : 180,
                  scale: isFlipped ? 1 : 0.94,
                }}
                transition={{ duration: 0.45 }}
                className={cardClasses}
              >
                {!isFlipped ? (
                  <span className="text-2xl font-serif text-amber-500/40">?</span>
                ) : isSuccess ? (
                  <>
                    <ShieldCheck className="w-8 h-8 text-sky-400 mb-1" />
                    <span className="text-[11px] font-extrabold tracking-wide">
                      ÉXITO
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-8 h-8 text-rose-400 mb-1" />
                    <span className="text-[11px] font-extrabold tracking-wide">
                      FRACASO
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 min-h-[48px] flex items-center justify-center">
          {allRevealed ? (
            <button
              type="button"
              onClick={() => {
                tapMedium();
                onCompleteReveal();
              }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 active:scale-[0.98]"
            >
              {isHost ? 'Continuar Partida' : 'Continuar'}
            </button>
          ) : (
            <span className="text-xs text-slate-400 animate-pulse">
              Volteando cartas una por una...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};