import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useGameStore } from './store/useGameStore';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';

export const App: React.FC = () => {
  const { initSocket, roomState, myPlayerId, toastMessage, clearToast } =
    useGameStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <div className="relative h-[100dvh] w-full bg-camelot-chamber text-[#f3ebd8] overflow-hidden">
      {/* Toast flotante global con estética de edicto medieval */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={clearToast}
            className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto px-4 py-2.5 rounded-xl bg-[#191422]/95 backdrop-blur-md border border-amber-400/60 text-xs font-medium text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex items-center justify-center gap-2 text-center cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!roomState || !myPlayerId ? (
        <HomeScreen />
      ) : roomState.room.status === 'LOBBY' ? (
        <LobbyScreen roomState={roomState} myPlayerId={myPlayerId} />
      ) : (
        <GameScreen roomState={roomState} myPlayerId={myPlayerId} />
      )}
    </div>
  );
};

export default App;
