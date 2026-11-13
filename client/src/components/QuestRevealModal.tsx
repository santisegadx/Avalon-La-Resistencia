import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '../hooks/useHaptics';
import {
  AvalonCrest,
  BrokenBladeEmblem,
  ChaliceEmblem,
  CornerFiligree,
  MedievalDivider,
} from './MedievalOrnaments';

interface QuestRevealModalProps {
  cards: Array<'SUCCESS' | 'FAIL'>;
  questNumber: number;
  requiresTwoFails: boolean;
  isHost: boolean;
  onCompleteReveal: () => void;
}

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export const QuestRevealModal: React.FC<QuestRevealModalProps> = ({
  cards,
  questNumber,
  requiresTwoFails,
  isHost,
  onCompleteReveal,
}) => {
  const { revealSuccess, revealFail, tapMedium } = useHaptics();
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);
    const timers: number[] = [];

    cards.forEach((card, index) => {
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
  }, [cards, revealSuccess, revealFail]);

  const allRevealed = revealedCount >= cards.length;
  const failCount = cards.filter((c) => c === 'FAIL').length;
  const questFailed = requiresTwoFails ? failCount >= 2 : failCount >= 1;
  const romanQuest = ROMAN_NUMERALS[questNumber] ?? String(questNumber);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-sm p-5 rounded-2xl camelot-card text-center">
        <CornerFiligree />

        <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-amber-400">
          Crónica de Gesta {romanQuest}
        </span>
        <h2
          className={
            'font-display text-lg font-extrabold mt-1 mb-2 ' +
            (allRevealed
              ? questFailed
                ? 'text-rose-300'
                : 'text-sky-200'
              : 'text-[#f3ebd8]')
          }
        >
          {allRevealed
            ? questFailed
              ? '¡Traición en la Gesta!'
              : '¡La Gesta ha Triunfado!'
            : 'Desvelando las Cartas...'}
        </h2>
        <MedievalDivider className="mb-4" />

        <div className="flex flex-wrap items-center justify-center gap-3 my-4">
          {cards.map((card, idx) => {
            const isFlipped = idx < revealedCount;
            const isSuccess = card === 'SUCCESS';

            return (
              <div key={idx} className="w-20 h-28 perspective-1000">
                <motion.div
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full h-full preserve-3d"
                >
                  {/* Reverso de la carta (Escudo sellado) */}
                  <div className="absolute inset-0 backface-hidden rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-[#1f192b] to-[#110d18] flex flex-col items-center justify-center shadow-lg">
                    <AvalonCrest className="w-10 h-10 opacity-80" />
                    <span className="font-display text-[8px] tracking-[0.22em] text-amber-400/70 mt-1 uppercase">
                      Ávalon
                    </span>
                  </div>

                  {/* Anverso de la carta (Éxito o Fracaso) */}
                  <div
                    className={
                      'absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 flex flex-col items-center justify-center shadow-xl ' +
                      (isSuccess
                        ? 'bg-gradient-to-b from-sky-950 to-[#0b1b2e] border-sky-400 text-sky-200 shadow-azurering'
                        : 'bg-gradient-to-b from-rose-950 to-[#240a11] border-rose-500 text-rose-200 shadow-crimsonring')
                    }
                  >
                    {isSuccess ? (
                      <>
                        <ChaliceEmblem className="w-9 h-9 text-sky-300 mb-1" />
                        <span className="font-display text-[11px] font-extrabold tracking-wider">
                          ÉXITO
                        </span>
                      </>
                    ) : (
                      <>
                        <BrokenBladeEmblem className="w-9 h-9 text-rose-400 mb-1" />
                        <span className="font-display text-[11px] font-extrabold tracking-wider">
                          FRACASO
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
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
              className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold active:scale-[0.985] transition-transform"
            >
              {isHost ? 'Continuar Partida' : 'Continuar'}
            </button>
          ) : (
            <span className="text-xs text-[#afa28a] animate-pulse italic">
              Rompiendo los sellos uno a uno...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
