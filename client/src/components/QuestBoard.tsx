import React from 'react';
import { Skull } from 'lucide-react';
import { QuestSlot } from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';
interface QuestBoardProps {
quests: QuestSlot[];
currentQuestNumber: number;
rejectionTrack: number;
canSelectTargetQuest: boolean;
onSelectTargetQuest: (questIndex: number) => void;
}
export const QuestBoard: React.FC<QuestBoardProps> = ({
quests,
currentQuestNumber,
rejectionTrack,
canSelectTargetQuest,
onSelectTargetQuest,
}) => {
const { tapLight } = useHaptics();
return (
<section className="px-3 py-2 bg-[#0e1118] border-b border-slate-800/80 shrink-0">
{/* 5 Gestas */}
<div className="grid grid-cols-5 gap-2 mb-2">
{quests.map((quest) => {
const isCurrent = quest.index === currentQuestNumber && quest.status === 'ACTIVE';
const isSuccess = quest.status === 'SUCCESS';
const isFail = quest.status === 'FAIL';
const isSelectable =
canSelectTargetQuest && (quest.status === 'PENDING' || quest.status === 'ACTIVE');
let circleClasses =
'bg-slate-900/90 border-slate-700 text-slate-300';
if (isSuccess) {
circleClasses =
'bg-sky-950/80 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.2)]';
} else if (isFail) {
circleClasses =
'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.2)]';
} else if (isCurrent) {
circleClasses =
'bg-amber-950/50 border-amber-400 text-amber-200 ring-1 ring-amber-400/50';
}
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
className={⁠relative flex flex-col items-center justify-center py-1.5 rounded-xl border transition-all ${circleClasses} ${ isSelectable ? 'cursor-pointer active:scale-95' : 'cursor-default' }⁠}
>
<span className="text-[10px] font-mono uppercase tracking-wider opacity-75">
G{quest.index}
{quest.requiresTwoFails ? '*' : ''}
</span>
<span className="text-base font-extrabold leading-tight">
{quest.teamSize}
</span>
{quest.requiresTwoFails && (
<span className="text-[9px] leading-none text-amber-300/90 font-medium">
2 fallos
</span>
)}
{quest.results && (
<span className="text-[9px] font-mono mt-0.5 opacity-80">
{quest.results.successes}✓ {quest.results.fails}✕
</span>
)}
</button>
);
})}
</div>
{/* Contador de Rechazos (1 a 5) */}
<div className="flex items-center justify-between px-1">
<span className="text-[11px] font-medium text-slate-400">
Rechazos seguidos:
</span>
<div className="flex items-center gap-1.5">
{[1, 2, 3, 4, 5].map((step) => {
const filled = rejectionTrack >= step;
const isFifth = step === 5;
return (
<div
key={step}
className={⁠w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${ filled ? isFifth ? 'bg-rose-600 border-rose-400 text-white' : 'bg-amber-500/80 border-amber-300 text-slate-950' : isFifth ? 'bg-slate-900 border-rose-900/70 text-rose-500/70' : 'bg-slate-900 border-slate-700 text-slate-500' }⁠}
>
{isFifth ? <Skull className="w-3 h-3" /> : step}
</div>
);
})}
</div>
</div>
</section>
);
};