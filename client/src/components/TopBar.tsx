import React from 'react';
import { Eye, EyeOff, ScrollText, Shield, Skull, WifiOff } from 'lucide-react';
import { ROLE_METADATA } from '../utils/roleLabels';
import { PlayerVision } from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';
import { CornerFiligree, MedievalDivider } from './MedievalOrnaments';

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

  const peekButtonClasses =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all touch-none border ' +
    (isPeeking
      ? 'bg-amber-500/20 text-amber-200 border-amber-400/75 shadow-[0_0_14px_rgba(245,158,11,0.28)]'
      : 'bg-[#1a1523] text-[#e4d8bd] border-amber-500/25 active:bg-[#241d31]');

  const alignmentBadgeClasses = privateVision
    ? 'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ' +
      (privateVision.myAlignment === 'GOOD'
        ? 'border-sky-400/60 text-sky-200 bg-sky-950/60'
        : 'border-rose-400/60 text-rose-200 bg-rose-950/60')
    : '';

  return (
    <header className="relative z-30 flex items-center justify-between h-12 px-3 camelot-bar border-b border-amber-500/25 shrink-0">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={onPeekEnd}
        onPointerLeave={onPeekEnd}
        onPointerCancel={onPeekEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={peekButtonClasses}
      >
        {isPeeking ? (
          <Eye className="w-3.5 h-3.5 text-amber-300" />
        ) : (
          <EyeOff className="w-3.5 h-3.5 text-amber-400/70" />
        )}
        <span>{isPeeking ? 'Viendo Rol' : 'Mantener Rol'}</span>
      </button>

      <div className="flex items-center gap-1.5">
        {!isConnected && <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#9d917b] font-mono">
          MESA <strong className="text-amber-300 font-bold">{roomCode}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          tapLight();
          onOpenHistory();
        }}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1523] text-[#e4d8bd] border border-amber-500/25 active:scale-95 transition-transform"
      >
        <ScrollText className="w-3.5 h-3.5 text-amber-400/85" />
        <span>Crónica</span>
        {historyCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono font-bold">
            {historyCount}
          </span>
        )}
      </button>

      {isPeeking && roleInfo && privateVision && (
        <div className="absolute left-3 right-3 top-14 z-50 p-3.5 rounded-2xl bg-[#130f1b]/95 backdrop-blur-md border border-amber-400/65 shadow-[0_18px_40px_rgba(0,0,0,0.8)] pointer-events-none">
          <CornerFiligree />
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm font-bold text-amber-200 tracking-wide">
              {roleInfo.name}
            </span>
            <span className={alignmentBadgeClasses}>
              {privateVision.myAlignment === 'GOOD' ? (
                <Shield className="w-3 h-3 text-sky-300" />
              ) : (
                <Skull className="w-3 h-3 text-rose-300" />
              )}
              {privateVision.myAlignment === 'GOOD' ? 'Bando del Bien' : 'Bando del Mal'}
            </span>
          </div>
          <MedievalDivider className="my-2" />
          <p className="text-xs text-[#dfd5bf] leading-snug">{roleInfo.shortDesc}</p>
        </div>
      )}
    </header>
  );
};
