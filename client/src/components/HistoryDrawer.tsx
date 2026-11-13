import React from 'react';
import { Crown, Shield, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Player, VoteRecord } from '../../../shared/types';
interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    history: VoteRecord[];
    players: Player[];
}
export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
    isOpen,
    onClose,
    history,
    players,
}) => {
    if (!isOpen) return null;
    const getPlayerName = (id: string) =>
        players.find((p) => p.id === id)?.nickname ?? 'Jugador';
    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm">
            <div
                className="flex-1"
                onClick={onClose}
            />
            <div className="max-h-[82dvh] flex flex-col rounded-t-2xl bg-[#12151e] border-t border-slate-700 shadow-2xl">
                {/* Cabecera */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
                    <h3 className="text-sm font-bold text-amber-300 tracking-wide">
                        Historial de Propuestas y Votos
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {/* Lista de registros */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {history.length === 0 ? (
                        <p className="text-xs text-center text-slate-400 py-8">
                            Aún no se ha votado ningún equipo en esta partida.
                        </p>
                    ) : (
                        [...history].reverse().map((record, idx) => (
                            <div
                                key={⁠${record.questIndex}-${record.attemptNumber}-${idx}⁠}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">
                            Gesta {record.questIndex} · Intento #{record.attemptNumber}
                        </span>
                        <span
                            className={⁠text-[10px] font-bold px-2 py-0.5 rounded border ${record.approved ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/70 border-rose-500/50 text-rose-300'}⁠}
>
                        {record.approved ? 'APROBADO' : 'RECHAZADO'}
                    </span>
                </div>
                {/* Líder y Equipo */}
                <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                            Líder: <strong>{getPlayerName(record.leaderId)}</strong>
                        </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>
                            Equipo:{' '}
                            <strong>
                                {record.teamIds.map((id) => getPlayerName(id)).join(', ')}
                            </strong>
                        </span>
                    </div>
                </div>
                {/* Resultado de la gesta si fue aprobada */}
                {record.questOutcome && (
                    <div
                        className={⁠px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-between ${record.questOutcome.passed ? 'bg-sky-950/60 text-sky-300 border border-sky-500/40' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'}⁠}
>
                <span>
                    Resultado: {record.questOutcome.passed ? 'ÉXITO' : 'FRACASO'}
                </span>
                <span className="font-mono">
                    {record.questOutcome.successes} Éxitos / {record.questOutcome.fails} Fallos
                </span>
            </div>
)}
            {/* Desglose individual de votos públicos */}
            <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {players.map((p) => {
                    const vote = record.votes[p.id];
                    if (!vote) return null;
                    const isApprove = vote === 'APPROVE';
                    return (
                        <span
                            key={p.id}
                            className={⁠inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${isApprove ? 'bg-slate-100 text-slate-950 border-white' : 'bg-slate-950 text-slate-400 border-slate-700'}⁠}
>
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
</div >
))
)}
</div >
</div >
</div >
);
};