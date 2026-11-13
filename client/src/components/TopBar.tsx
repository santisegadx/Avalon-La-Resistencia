import React from 'react';
import { Eye, EyeOff, ScrollText, WifiOff } from 'lucide-react';
import { ROLE_METADATA } from '../utils/roleLabels';
import { PlayerVision } from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';
interface TopBarProps {
roomCode: string;
isConnected: boolean;
privateVision: PlayerVision | null;
isPeeking: boolean;
onPeekStart: () => void;
onPeekEnd: () => void;
onOpenHistory: () => void;
historyCount: number;
}
export const TopBar: React.FC<TopBarProps> = ({
roomCode,
isConnected,
privateVision,
isPeeking,
onPeekStart,
onPeekEnd,
onOpenHistory,
historyCount,
}) => {
const { tapLight } = useHaptics();
const roleInfo = privateVision ? ROLE_METADATA[privateVision.myRole] : null;
const handlePointerDown = (e: React.PointerEvent) => {
e.preventDefault();
tapLight();
onPeekStart();
};
return (
<header className="relative z-30 flex items-center justify-between h-12 px-3 bg-[#12151e] border-b border-slate-800/90 shrink-0">
{/* Botón Hold-to-Peek Anti-Miradas */}
<button
type="button"
onPointerDown={handlePointerDown}
onPointerUp={onPeekEnd}
onPointerLeave={onPeekEnd}
onPointerCancel={onPeekEnd}
onContextMenu={(e) => e.preventDefault()}
className={⁠flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors touch-none ${ isPeeking ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60' : 'bg-slate-900 text-slate-300 border border-slate-700/80 active:bg-slate-800' }⁠}
>
{isPeeking ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
<span>{isPeeking ? 'Viendo Rol' : 'Mantener Rol'}</span>
</button>
{/* Identificador de Sala */}
<div className="flex items-center gap-1.5">
{!isConnected && <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
<span className="text-[11px] uppercase tracking-widest text-slate-400 font-mono">
SALA: <strong className="text-amber-400/90">{roomCode}</strong>
</span>
</div>
{/* Botón Historial */}
<button
type="button"
onClick={() => {
tapLight();
onOpenHistory();
}}
className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-slate-200 border border-slate-700/80 active:bg-slate-800"
>
<ScrollText className="w-3.5 h-3.5 text-amber-400/80" />
<span>Hist</span>
{historyCount > 0 && (
<span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-amber-300 font-mono">
{historyCount}
</span>
)}
</button>
{/* Banner flotante neutro oscuro mientras se mantiene presionado el botón */}
{isPeeking && roleInfo && privateVision && (
<div className="absolute left-3 right-3 top-14 z-50 p-3 rounded-xl bg-[#0e1118]/95 backdrop-blur-md border border-amber-500/50 shadow-2xl pointer-events-none">
<div className="flex items-center justify-between mb-1">
<span className="text-sm font-bold text-amber-300 tracking-wide">
{roleInfo.name}
</span>
<span
className={⁠text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${ privateVision.myAlignment === 'GOOD' ? 'border-sky-500/50 text-sky-300 bg-sky-950/40' : 'border-rose-500/50 text-rose-300 bg-rose-950/40' }⁠}
>
{privateVision.myAlignment === 'GOOD' ? 'Bando del Bien' : 'Bando del Mal'}
</span>
</div>
<p className="text-xs text-slate-300 leading-snug">{roleInfo.shortDesc}</p>
{privateVision.ladyReveals.length > 0 && (
<div className="mt-2 pt-1.5 border-t border-slate-800 text-[11px] text-cyan-300">
Dama del Lago usada: {privateVision.ladyReveals.length} revelación(es) activa(s) en la mesa.
</div>
)}
</div>
)}
</header>
);
};