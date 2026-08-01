export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface EmojiData {
  id: string;
  name: string;
  symbol: string;
  rarity: Rarity;
  baseCatchChance: number; // 0 to 1
  biome: 'Forest' | 'Volcano' | 'Crystal' | 'Sky' | 'All';
  description: string;
  color: string;
}

export interface PlayerEmoji {
  instanceId: string;
  emojiId: string;
  level: number;
  happiness: number; // 0 to 100
  hunger: number; // 0 to 100 (0 = starving, 100 = full)
  caughtAt: number;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  rarityMultiplier: number; // e.g. 3x for Epic/Legendary
  startTime: number;
  endTime: number;
  active: boolean;
  biomeBonus?: string;
  icon: string;
}

export type ScreenType = 'overworld' | 'farm' | 'trade' | 'events';

export interface FarmEmojiEntity {
  instanceId: string;
  emojiId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'IDLE' | 'WANDERING' | 'SEEKING_FOOD' | 'EATING' | 'HAPPY';
  stateTimer: number;
  speed: number;
  direction: 'left' | 'right';
  animOffset: number;
}

export interface MeatItem {
  id: string;
  x: number;
  y: number;
  createdAt: number;
}

export type TradeState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SELECTING'
  | 'OFFERING'
  | 'WAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'COMPLETING'
  | 'TRADE_COMPLETE'
  | 'DISCONNECTING';

export interface TradeOffer {
  roomId: string;
  player1Name: string;
  player2Name: string;
  player1OfferedInstanceId: string | null;
  player2OfferedInstanceId: string | null;
  player1Confirmed: boolean;
  player2Confirmed: boolean;
  status: TradeState;
}

export interface AudioSettings {
  bgmEnabled: boolean;
  bgmVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
}
