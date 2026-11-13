import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, PlusCircle, Swords } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useHaptics } from '../hooks/useHaptics';
import {
  AvalonCrest,
  CornerFiligree,
  MedievalDivider,
} from '../components/MedievalOrnaments';

export const HomeScreen: React.FC = () => {
  const { createRoom, joinRoom, isConnected, isReconnecting } = useGameStore();
  const { tapMedium, tapLight } = useHaptics();

  const [mode, setMode] = useState<'JOIN' | 'CREATE'>('JOIN');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/room\/([A-Za-z0-9]{4,6})$/i);
    if (match) {
      setMode('JOIN');
      setRoomCode(match[1].toUpperCase());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    tapMedium();
    setSubmitting(true);

    if (mode === 'CREATE') {
      await createRoom(nickname, roomName);
    } else {
      await joinRoom(roomCode, nickname);
    }
    setSubmitting(false);
  };

  if (isReconnecting) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <AvalonCrest className="relative w-16 h-16 animate-pulse" />
        </div>
        <h2 className="font-display text-base font-bold tracking-wider text-amber-300 uppercase">
          Camelot te aguarda
        </h2>
        <p className="text-xs text-[#b8ab92] mt-1">
          Restaurando tu asiento en la Tabla Redonda...
        </p>
      </div>
    );
  }

  const joinTabClass =
    'py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ' +
    (mode === 'JOIN'
      ? 'btn-royal-gold shadow-sm'
      : 'text-[#9d917b] hover:text-[#f3ebd8]');

  const createTabClass =
    'py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ' +
    (mode === 'CREATE'
      ? 'btn-royal-gold shadow-sm'
      : 'text-[#9d917b] hover:text-[#f3ebd8]');

  const statusDotClass =
    'w-2 h-2 rounded-full ' +
    (isConnected
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]'
      : 'bg-rose-500 animate-pulse');

  return (
    <div className="h-[100dvh] flex flex-col justify-between px-5 py-6 max-w-md mx-auto">
      {/* Cabecera Heráldica */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="pt-3 text-center"
      >
        <div className="relative inline-flex items-center justify-center mb-3">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl scale-125" />
          <AvalonCrest className="relative w-16 h-16 drop-shadow-[0_6px_16px_rgba(212,166,74,0.35)]" />
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-400/80 mb-1">
          La Resistencia
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-[#fff3d1] via-[#ecc36c] to-[#b57c21] drop-shadow-sm">
          ÁVALON
        </h1>
        <MedievalDivider className="max-w-[200px] mx-auto my-2.5" />
        <p className="text-xs text-[#afa28a] flex items-center justify-center gap-1.5">
          <Swords className="w-3.5 h-3.5 text-amber-400/75" />
          Deducción social en Camelot · 5 a 10 jugadores
        </p>
      </motion.div>

      {/* Panel de Ingreso o Fundación de Mesa */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        className="relative p-5 rounded-2xl camelot-card"
      >
        <CornerFiligree />

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0b0910] border border-amber-500/20 mb-4">
          <button
            type="button"
            onClick={() => {
              tapLight();
              setMode('JOIN');
            }}
            className={joinTabClass}
          >
            Unirse a Mesa
          </button>
          <button
            type="button"
            onClick={() => {
              tapLight();
              setMode('CREATE');
            }}
            className={createTabClass}
          >
            Fundar Mesa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/85 mb-1.5">
              Nombre del Caballero
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={16}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-[#0b0910] border border-amber-500/25 text-sm text-[#f3ebd8] placeholder-[#685e4d] focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_1px_rgba(251,191,36,0.35)] transition-all"
            />
          </div>

          {mode === 'JOIN' ? (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/85 mb-1.5">
                Sello de la Sala
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0b0910] border border-amber-500/25 text-base font-mono font-bold uppercase tracking-[0.28em] text-amber-300 placeholder-[#685e4d] focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_1px_rgba(251,191,36,0.35)] transition-all"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/85 mb-1.5">
                Nombre de la Mesa
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={28}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0b0910] border border-amber-500/25 text-sm text-[#f3ebd8] placeholder-[#685e4d] focus:outline-none focus:border-amber-400 focus:shadow-[0_0_0_1px_rgba(251,191,36,0.35)] transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isConnected || submitting}
            className="w-full min-h-[52px] mt-2 rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
          >
            {mode === 'CREATE' ? (
              <>
                <PlusCircle className="w-4 h-4" />
                {submitting ? 'Erigiendo Mesa...' : 'Crear Nueva Mesa'}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {submitting ? 'Cruzando las Puertas...' : 'Entrar a la Mesa'}
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Estado de conexión al reino */}
      <footer className="pb-1 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14111a]/80 border border-amber-500/15 text-[11px] text-[#9d917b]">
          <span className={statusDotClass} />
          {isConnected ? 'Puertas de Camelot abiertas' : 'Buscando señal del reino...'}
        </span>
      </footer>
    </div>
  );
};
