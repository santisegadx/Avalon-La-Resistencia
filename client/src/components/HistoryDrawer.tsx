import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, ScrollText, Shield, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Player, VoteRecord } from '../../../shared/types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: VoteRecord[];
  players: Player[];
}

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  players,
}) => {
  const getPlayerName = (id: string) =>
    players.find((p) => p.id === id)?.nickname ?? 'Caballero';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm"
        >
          <div className="flex-1" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="max-h-[82dvh] flex flex-col rounded-t-2xl camelot-card border-b-0"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/25 shrink-0">
              <h3 className="font-display text-sm font-bold text-amber-200 tracking-wide flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-400" />
                Crónica de Camelot
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#1d1827] text-[#d8ccb2] border border-amber-500/25 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-center text-[#9d917b] py-10 italic">
                  El pergamino aún aguarda la primera votación del consejo.
                </p>
              ) : (
                [...history].reverse().map((record, idx) => {
                  const badgeClass =
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ' +
                    (record.approved
                      ? 'bg-emerald-950/75 border-emerald-400/50 text-emerald-200'
                      : 'bg-rose-950/75 border-rose-400/50 text-rose-200');

                  const outcomeClass =
                    'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between ' +
                    (record.questOutcome?.passed
                      ? 'bg-sky-950/65 text-sky-200 border border-sky-400/45'
                      : 'bg-rose-950/65 text-rose-200 border border-rose-400/45');

                  const romanQuest =
                    ROMAN_NUMERALS[record.questIndex] ?? String(record.questIndex);

                  return (
                    <div
                      key={record.questIndex + '-' + record.attemptNumber + '-' + idx}
                      className="p-3 rounded-xl bg-[#0f0c16]/95 border border-amber-500/20 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-bold text-amber-100">
                          Gesta {romanQuest} · Intento #{record.attemptNumber}
                        </span>
                        <span className={badgeClass}>
                          {record.approved ? 'APROBADO' : 'RECHAZADO'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#d8ccb2] space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Líder: <strong className="text-[#f3ebd8]">{getPlayerName(record.leaderId)}</strong>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            Comitiva:{' '}
                            <strong className="text-[#f3ebd8]">
                              {record.teamIds.map((id) => getPlayerName(id)).join(', ')}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {record.questOutcome && (
                        <div className={outcomeClass}>
                          <span className="font-display font-bold">
                            Resultado: {record.questOutcome.passed ? 'ÉXITO' : 'FRACASO'}
                          </span>
                          <span className="font-mono">
                            {record.questOutcome.successes} Éxitos / {record.questOutcome.fails} Fallos
                          </span>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-amber-500/15 flex flex-wrap gap-1.5">
                        {players.map((p) => {
                          const vote = record.votes[p.id];
                          if (!vote) return null;
                          const isApprove = vote === 'APPROVE';
                          const votePillClass =
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ' +
                            (isApprove
                              ? 'bg-[#efe4cc] text-[#1a1103] border-amber-300/70'
                              : 'bg-[#191119] text-[#b89fa5] border-rose-500/30');

                          return (
                            <span key={p.id} className={votePillClass}>
                              {isApprove ? (
                                <ThumbsUp className="w-2.5 h-2.5" />
                              ) : (
                                <ThumbsDown className="w-2.5 h-2.5" />
                              )}
                              {p.nickname}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
