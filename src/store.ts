import { create } from 'zustand';
import { AntType, PlayerState } from './types';

interface AppState {
  view: 'menu' | 'host' | 'cast';
  setView: (view: 'menu' | 'host' | 'cast') => void;

  // Host state
  pin1: string | null;
  pin2: string | null;
  player1Connected: boolean;
  player2Connected: boolean;
  setPins: (p1: string, p2: string) => void;
  setPlayerConnected: (playerNum: 1 | 2, connected: boolean) => void;

  // Cast state
  castPlayerNum: 1 | 2 | null;
  setCastPlayerNum: (num: 1 | 2 | null) => void;
  selectedAnt: AntType;
  setSelectedAnt: (ant: AntType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'menu',
  setView: (view) => set({ view }),

  pin1: null,
  pin2: null,
  player1Connected: false,
  player2Connected: false,
  setPins: (p1, p2) => set({ pin1: p1, pin2: p2 }),
  setPlayerConnected: (playerNum, connected) => set((state) => ({
    player1Connected: playerNum === 1 ? connected : state.player1Connected,
    player2Connected: playerNum === 2 ? connected : state.player2Connected,
  })),

  castPlayerNum: null,
  setCastPlayerNum: (num) => set({ castPlayerNum: num }),
  selectedAnt: 'red',
  setSelectedAnt: (ant) => set({ selectedAnt: ant }),
}));
