export type AntType = 'red' | 'black' | 'fire' | 'leafcutter' | 'bullet' | 'ghost';

export interface AntConfig {
  type: AntType;
  color: string;
  size: number;
  speed: number;
}

export const ANT_TYPES: Record<AntType, AntConfig> = {
  red: { type: 'red', color: '#ff3333', size: 1, speed: 5 },
  black: { type: 'black', color: '#222222', size: 1.2, speed: 4 },
  fire: { type: 'fire', color: '#ffaa00', size: 0.8, speed: 6 },
  leafcutter: { type: 'leafcutter', color: '#8b4513', size: 1.5, speed: 3 },
  bullet: { type: 'bullet', color: '#111111', size: 1.3, speed: 5 },
  ghost: { type: 'ghost', color: '#ddddff', size: 0.9, speed: 7 },
};

export interface NetworkMessage {
  type: string;
  payload: any;
}

export interface PlayerState {
  id: string; // The pin/peer id
  antType: AntType;
  position: [number, number, number];
  rotation: number;
  isDashing: boolean;
  carryingParticle: boolean;
  score: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  particles: Record<string, { position: [number, number, number], carriedBy: string | null }>;
}
