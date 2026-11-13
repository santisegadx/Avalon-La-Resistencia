import React from 'react';

export const AvalonCrest: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="crestGold" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#d49b35" />
        <stop offset="100%" stopColor="#8c5f14" />
      </linearGradient>
      <linearGradient id="crestInner" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#261f33" />
        <stop offset="100%" stopColor="#110e18" />
      </linearGradient>
    </defs>
    <path
      d="M32 4L54 12V29.5C54 44.5 43.5 55.2 32 60C20.5 55.2 10 44.5 10 29.5V12L32 4Z"
      fill="url(#crestInner)"
      stroke="url(#crestGold)"
      strokeWidth="2.4"
    />
    <path
      d="M32 8.8L49 15V29.2C49 41.2 40.9 50 32 54.4C23.1 50 15 41.2 15 29.2V15L32 8.8Z"
      stroke="url(#crestGold)"
      strokeOpacity="0.32"
      strokeWidth="1"
    />
    {/* Hoja de Excalibur */}
    <path
      d="M32 12V46M24.5 24.5H39.5M28 46H36"
      stroke="url(#crestGold)"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    {/* Corona Real */}
    <path
      d="M21 30.5L24.5 21.5L32 26.5L39.5 21.5L43 30.5H21Z"
      fill="url(#crestGold)"
      fillOpacity="0.22"
      stroke="url(#crestGold)"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const MedievalDivider: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div className={`flex items-center justify-center gap-2.5 ${className}`} aria-hidden="true">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/45 to-amber-400/75" />
    <span className="w-2 h-2 rotate-45 border border-amber-400/80 bg-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.45)]" />
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/45 to-amber-400/75" />
  </div>
);

export const CornerFiligree: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
    <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-amber-400/45 rounded-tl-[2px]" />
    <span className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-amber-400/45 rounded-tr-[2px]" />
    <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-amber-400/45 rounded-bl-[2px]" />
    <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-amber-400/45 rounded-br-[2px]" />
  </div>
);

export const ChaliceEmblem: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M15 9H33V16C33 21.5 29 25.5 24 26.5C19 25.5 15 21.5 15 16V9Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M15 12H10.5C10.5 17 13 19.5 16 20M33 12H37.5C37.5 17 35 19.5 32 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M24 26.5V36M17 39H31M19.5 36H28.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M24 4V6.5M18 5.5L19.5 7.5M30 5.5L28.5 7.5"
      stroke="#fbbf24"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const BrokenBladeEmblem: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M24 7L28 19L21 23L27 28L24 34"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 34H32M24 34V41M20 41H28"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M12 13L36 35M36 13L12 35"
      stroke="currentColor"
      strokeOpacity="0.35"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);
