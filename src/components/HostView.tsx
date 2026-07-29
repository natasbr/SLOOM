import React from 'react';
import { useAppStore } from '../store';
import Scene from './game/Scene';
import { useGameStore } from '../gameStore';
import { Users } from 'lucide-react';

export default function HostView() {
  const { pin1, pin2, player1Connected, player2Connected } = useAppStore();
  const anthillScore = useGameStore((state) => state.anthillScore);

  return (
    <div className="w-full h-screen bg-neutral-900 overflow-hidden relative font-mono">
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex gap-4">
          <div className={`p-4 rounded-xl border-2 backdrop-blur-md ${player1Connected ? 'bg-green-900/40 border-green-500' : 'bg-black/40 border-neutral-700'}`}>
            <h2 className="text-sm text-neutral-400 font-bold mb-1">PLAYER 1 PIN</h2>
            <div className={`text-4xl font-black tracking-widest ${player1Connected ? 'text-green-400' : 'text-white'}`}>
              {player1Connected ? 'PLAYING' : pin1}
            </div>
          </div>
          
          <div className={`p-4 rounded-xl border-2 backdrop-blur-md ${player2Connected ? 'bg-indigo-900/40 border-indigo-500' : 'bg-black/40 border-neutral-700'}`}>
            <h2 className="text-sm text-neutral-400 font-bold mb-1">PLAYER 2 PIN</h2>
            <div className={`text-4xl font-black tracking-widest ${player2Connected ? 'text-indigo-400' : 'text-white'}`}>
              {player2Connected ? 'PLAYING' : pin2}
            </div>
          </div>
        </div>

        <div className="bg-amber-900/40 border-2 border-amber-500 p-4 rounded-xl backdrop-blur-md flex items-center gap-4">
          <div>
            <h2 className="text-sm text-amber-500 font-bold">ANTHILL SCORE</h2>
            <div className="text-4xl font-black text-amber-400 text-right">{anthillScore}</div>
          </div>
          <Users size={32} className="text-amber-500" />
        </div>
      </div>

      {/* 3D Scene */}
      <Scene />
    </div>
  );
}
