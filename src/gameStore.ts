import { create } from 'zustand';
import { AntType, PlayerState } from './types';

interface Particle {
  id: string;
  position: [number, number, number];
  carriedBy: 1 | 2 | null; // which player carries it
}

export interface GameState {
  players: {
    1: PlayerState | null;
    2: PlayerState | null;
  };
  particles: Record<string, Particle>;
  anthillScore: number;
  
  // Actions
  initPlayer: (playerNum: 1 | 2) => void;
  updatePlayerMovement: (playerNum: 1 | 2, action: string, active: boolean) => void;
  updatePlayerAntType: (playerNum: 1 | 2, antType: AntType) => void;
  doPlayerAction: (playerNum: 1 | 2, action: 'bite' | 'drop' | 'dash') => void;
  gameTick: (delta: number) => void;
}

const generateInitialParticles = () => {
  const particles: Record<string, Particle> = {};
  for(let i = 0; i < 20; i++) {
    const id = `particle_${i}`;
    particles[id] = {
      id,
      position: [(Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30],
      carriedBy: null,
    };
  }
  return particles;
};

// Simple input state tracking
const playerInputs = {
  1: { up: false, down: false, left: false, right: false },
  2: { up: false, down: false, left: false, right: false }
};

export const useGameStore = create<GameState>((set, get) => ({
  players: {
    1: null,
    2: null,
  },
  particles: generateInitialParticles(),
  anthillScore: 0,

  initPlayer: (playerNum) => set((state) => ({
    players: {
      ...state.players,
      [playerNum]: {
        id: `p${playerNum}`,
        antType: 'red',
        position: playerNum === 1 ? [-2, 0, 0] : [2, 0, 0],
        rotation: 0,
        isDashing: false,
        carryingParticle: false,
        score: 0,
      }
    }
  })),

  updatePlayerMovement: (playerNum, action, active) => {
    if (action in playerInputs[playerNum]) {
      playerInputs[playerNum][action as keyof typeof playerInputs[1]] = active;
    }
  },

  updatePlayerAntType: (playerNum, antType) => set((state) => {
    const player = state.players[playerNum];
    if (!player) return state;
    return {
      players: {
        ...state.players,
        [playerNum]: { ...player, antType }
      }
    };
  }),

  doPlayerAction: (playerNum, action) => set((state) => {
    const player = state.players[playerNum];
    if (!player) return state;

    if (action === 'bite' && !player.carryingParticle) {
      // Find a nearby particle
      const p = Object.values(state.particles).find(
        (p) => !p.carriedBy && Math.hypot(p.position[0] - player.position[0], p.position[2] - player.position[2]) < 2
      );
      if (p) {
        return {
          players: { ...state.players, [playerNum]: { ...player, carryingParticle: true } },
          particles: { ...state.particles, [p.id]: { ...p, carriedBy: playerNum } }
        };
      }
    } else if (action === 'drop' && player.carryingParticle) {
      // Check distance to anthill (0,0)
      const distToHill = Math.hypot(player.position[0], player.position[2]);
      
      const particleToDrop = Object.values(state.particles).find(p => p.carriedBy === playerNum);
      
      if (distToHill < 4) {
        // Score!
        if (particleToDrop) {
          const newParticles = { ...state.particles };
          // Randomize a new particle somewhere else
          newParticles[particleToDrop.id] = {
            id: particleToDrop.id,
            position: [(Math.random() - 0.5) * 40, 0.5, (Math.random() - 0.5) * 40],
            carriedBy: null
          };
          return {
            players: { ...state.players, [playerNum]: { ...player, carryingParticle: false, score: player.score + 1 } },
            particles: newParticles,
            anthillScore: state.anthillScore + 1
          };
        }
      } else {
        // Just drop it on the ground
        if (particleToDrop) {
          return {
            players: { ...state.players, [playerNum]: { ...player, carryingParticle: false } },
            particles: { ...state.particles, [particleToDrop.id]: { ...particleToDrop, carriedBy: null, position: [player.position[0], 0.5, player.position[2]] } }
          };
        }
      }
    } else if (action === 'dash') {
      // Just set dashing flag for visuals, movement is handled in tick
      return {
        players: { ...state.players, [playerNum]: { ...player, isDashing: true } }
      };
    }
    return state;
  }),

  gameTick: (delta) => set((state) => {
    let changed = false;
    const newPlayers = { ...state.players };
    
    // Update player positions based on inputs
    [1, 2].forEach((pNumStr) => {
      const pNum = Number(pNumStr) as 1 | 2;
      const player = newPlayers[pNum];
      if (player) {
        const inputs = playerInputs[pNum];
        let dx = 0;
        let dz = 0;
        if (inputs.left) dx -= 1;
        if (inputs.right) dx += 1;
        if (inputs.up) dz -= 1;
        if (inputs.down) dz += 1;
        
        if (dx !== 0 || dz !== 0) {
          const speed = player.isDashing ? 12 : 6;
          // Normalize vector
          const length = Math.hypot(dx, dz);
          dx = (dx / length) * speed * delta;
          dz = (dz / length) * speed * delta;
          
          player.position = [player.position[0] + dx, player.position[1], player.position[2] + dz];
          player.rotation = Math.atan2(dx, dz);
          changed = true;
        }

        if (player.isDashing) {
           player.isDashing = false; // Reset dash immediately, maybe implement proper dash logic later
        }
      }
    });

    if (changed) {
      return { players: newPlayers };
    }
    return state;
  })
}));
