import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Crown,
  LogOut,
  Play,
  QrCode,
  Shield,
  Skull,
  UserX,
  Users,
} from 'lucide-react';
import {
  ALIGNMENT_DISTRIBUTION,
  PublicRoomState,
  RoomConfig,
} from '../../../shared/types';
import { useGameStore } from '../store/useGameStore';
import { useHaptics } from '../hooks/useHaptics';

interface LobbyScreenProps {
  roomState: PublicRoomState;
  myPlayerId: string;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  myPlayerId,
}) => {
  const {
    updateConfig,
    kickPlayer,
    startGame,
    leaveRoomLocally,
    showToast,
  } = useGameStore();
  const { tapLight, tapMedium } = useHaptics();
  const [showQrModal, setShowQrModal] = useState(false);

  const { room, players } = roomState;
  const isHost = room.hostId === myPlayerId;
  const config = room.config;

  const configuredPlayers = Math.max(5, Math.min(10, config.maxPlayers));
  const dist = ALIGNMENT_DISTRIBUTION[configuredPlayers];

  const selectedGoodCount = 1 + (config.optionalRoles.perceval ? 1 : 0);
  const selectedEvilCount =
    1 +
    (config.optionalRoles.morgana ? 1 : 0) +
    (config.optionalRoles.mordred ? 1 : 0) +
    (config.optionalRoles.oberon ? 1 : 0);

  const isEvilOverflow = selectedEvilCount > dist.evil;
  const canStart =
    isHost && players.length === configuredPlayers && !isEvilOverflow;

  const shareUrl = window.location.origin + '/room/' + room.code;

  const handleCopyLink = async () => {
    tapLight();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Enlace de sala copiado al portapapeles.');
    } catch {
      showToast('Código de sala: ' + room.code);
    }
  };

  const handleMaxPlayersChange = (nextMax: number) => {
    if (!isHost || nextMax < players.length) return;
    tapLight();
    const nextDist = ALIGNMENT_DISTRIBUTION[nextMax];
    const nextOptionalRoles = { ...config.optionalRoles };

    let evilCount =
      1 +
      (nextOptionalRoles.morgana ? 1 : 0) +
      (nextOptionalRoles.mordred ? 1 : 0) +
      (nextOptionalRoles.oberon ? 1 : 0);

    for (const key of ['oberon', 'mordred', 'morgana'] as const) {
      if (evilCount <= nextDist.evil) break;
      if (nextOptionalRoles[key]) {
        nextOptionalRoles[key] = false;
        evilCount -= 1;
      }
    }

    void updateConfig({
      ...config,
      maxPlayers: nextMax,
      optionalRoles: nextOptionalRoles,
    });
  };

  const toggleOptionalRole = (key: keyof RoomConfig['optionalRoles']) => {
    if (!isHost) return;
    tapLight();
    const nextValue = !config.optionalRoles[key];
    void updateConfig({
      ...config,
      optionalRoles: {
        ...config.optionalRoles,
        [key]: nextValue,
      },
    });
  };

  const toggleRule = (key: keyof RoomConfig['rules']) => {
    if (!isHost) return;
    tapLight();
    void updateConfig({
      ...config,
      rules: {
        ...config.rules,
        [key]: !config.rules[key],
      },
    });
  };

  const percevalBtnClass =
    'p-2.5 rounded-xl border text-left transition-all ' +
    (config.optionalRoles.perceval
      ? 'bg-sky-950/60 border-sky-400 text-sky-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  const morganaBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.morgana
      ? 'bg-rose-950/60 border-rose-500 text-rose-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  const mordredBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.mordred
      ? 'bg-rose-950/60 border-rose-500 text-rose-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  const oberonBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.oberon
      ? 'bg-rose-950/60 border-rose-500 text-rose-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  const ladyRuleClass =
    'w-full p-2.5 rounded-xl border flex items-center justify-between text-left ' +
    (config.rules.ladyOfTheLake
      ? 'bg-cyan-950/50 border-cyan-400/70 text-cyan-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  const targetRuleClass =
    'w-full p-2.5 rounded-xl border flex items-center justify-between text-left ' +
    (config.rules.targetSelection
      ? 'bg-amber-950/40 border-amber-400/70 text-amber-100'
      : 'bg-slate-900 border-slate-800 text-slate-400');

  return (
    <div className="h-[100dvh] flex flex-col justify-between bg-[#0a0c10] max-w-md mx-auto">
      <header className="px-4 py-3 bg-[#12151e] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100">{room.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-amber-400 font-bold tracking-wider">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
            >
              <Copy className="w-3 h-3" /> Copiar Link
            </button>
            <button
              type="button"
              onClick={() => {
                tapLight();
                setShowQrModal(true);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300"
            >
              <QrCode className="w-3 h-3" /> QR
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            tapLight();
            leaveRoomLocally();
          }}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <section className="p-3 rounded-xl bg-[#12151e] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Jugadores ({players.length}/{configuredPlayers})
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              <span className="text-sky-400">{dist.good} Bien</span> /{' '}
              <span className="text-rose-400">{dist.evil} Mal</span>
            </span>
          </div>

          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">
                Cupo de la partida (5 a 10)
              </span>
              {!isHost && (
                <span className="text-[10px] text-slate-500">
                  Solo anfitrión
                </span>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[5, 6, 7, 8, 9, 10].map((count) => {
                const isSelected = configuredPlayers === count;
                const isTooLow = count < players.length;
                const countBtnClass =
                  'py-1.5 rounded-lg border text-xs font-mono font-bold transition-all disabled:opacity-40 ' +
                  (isSelected
                    ? 'bg-amber-500 border-amber-400 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-300');

                return (
                  <button
                    key={count}
                    type="button"
                    disabled={!isHost || isTooLow}
                    onClick={() => handleMaxPlayersChange(count)}
                    className={countBtnClass}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {players.map((p) => {
              const dotClass =
                'w-2 h-2 rounded-full shrink-0 ' +
                (p.isConnected ? 'bg-emerald-400' : 'bg-rose-500');

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={dotClass} />
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {p.nickname}
                    </span>
                    {p.id === room.hostId && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                  </div>

                  {isHost && p.id !== myPlayerId && (
                    <button
                      type="button"
                      onClick={() => {
                        tapLight();
                        void kickPlayer(p.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {players.length < configuredPlayers && (
            <p className="text-[11px] text-amber-400/90 mt-2">
              Faltan {configuredPlayers - players.length} jugador(es) más para completar los {configuredPlayers} configurados.
            </p>
          )}
        </section>

        <section className="p-3 rounded-xl bg-[#12151e] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              Roles de la Partida
            </span>
            <span className="text-[10px] text-slate-400">
              Merlín y Asesino obligatorios
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isHost}
              onClick={() => toggleOptionalRole('perceval')}
              className={percevalBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Perceval</span>
                <Shield className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Bien ({selectedGoodCount}/{dist.good})
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.morgana && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('morgana')}
              className={morganaBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Morgana</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Mal ({selectedEvilCount}/{dist.evil})
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.mordred && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('mordred')}
              className={mordredBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Mordred</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Oculto a Merlín
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.oberon && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('oberon')}
              className={oberonBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Oberón</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Ciego al Mal
              </span>
            </button>
          </div>
          {isEvilOverflow && (
            <p className="text-[11px] text-rose-400">
              Demasiados roles especiales del Mal para {configuredPlayers} jugadores (máx {dist.evil}).
            </p>
          )}
        </section>

        <section className="p-3 rounded-xl bg-[#12151e] border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-200 block">
            Reglas Opcionales
          </span>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => toggleRule('ladyOfTheLake')}
            className={ladyRuleClass}
          >
            <div>
              <div className="text-xs font-bold">La Dama del Lago</div>
              <div className="text-[10px] opacity-80">
                Investiga la alineación tras las gestas 2, 3 y 4.
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold">
              {config.rules.ladyOfTheLake ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => toggleRule('targetSelection')}
            className={targetRuleClass}
          >
            <div>
              <div className="text-xs font-bold">Elección del Objetivo</div>
              <div className="text-[10px] opacity-80">
                El Líder elige qué gesta pendiente realizar.
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold">
              {config.rules.targetSelection ? 'ON' : 'OFF'}
            </span>
          </button>
        </section>
      </div>

      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              tapMedium();
              void startGame();
            }}
            className="w-full min-h-[54px] rounded-xl font-bold text-sm bg-amber-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Partida ({players.length}/{configuredPlayers})
          </button>
        ) : (
          <div className="min-h-[54px] flex items-center justify-center text-xs text-slate-400">
            Esperando a que el anfitrión inicie la partida...
          </div>
        )}
      </footer>

      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 rounded-2xl bg-[#12151e] border border-slate-700 text-center space-y-4 max-w-xs w-full"
          >
            <h3 className="text-sm font-bold text-slate-100">
              Escanea para unirte a {room.name}
            </h3>
            <div className="p-4 bg-white rounded-xl inline-block">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>
            <div className="text-lg font-mono font-extrabold text-amber-400 tracking-widest">
              {room.code}
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};