import { GameEvent, Rarity } from '../types';

export const INITIAL_EVENTS: GameEvent[] = [
  {
    id: 'starry_night',
    name: 'Starry Meteor Shower',
    description: 'Celestial energy surges across the skies! Legendary and Epic emojis appear 5x more frequently.',
    rarityMultiplier: 5,
    startTime: Date.now() - 60000, // active now
    endTime: Date.now() + 1000 * 60 * 15, // 15 mins from now
    active: true,
    biomeBonus: 'Sky',
    icon: '✨',
  },
  {
    id: 'volcano_fury',
    name: 'Volcanic Awakening',
    description: 'Magma chambers heat up! Fire and Dragon emojis are supercharged.',
    rarityMultiplier: 3,
    startTime: Date.now() + 1000 * 60 * 30,
    endTime: Date.now() + 1000 * 60 * 45,
    active: false,
    biomeBonus: 'Volcano',
    icon: '🌋',
  },
  {
    id: 'forest_bloom',
    name: 'Spring Blossom Festival',
    description: 'Forest wildlife is extremely active and cheerful.',
    rarityMultiplier: 2.5,
    startTime: Date.now() + 1000 * 60 * 60,
    endTime: Date.now() + 1000 * 60 * 90,
    active: false,
    biomeBonus: 'Forest',
    icon: '🌸',
  },
];

export function getActiveEvent(events: GameEvent[]): GameEvent | null {
  const now = Date.now();
  return events.find((e) => e.active && now >= e.startTime && now <= e.endTime) || null;
}

export function calculateAdjustedChance(baseChance: number, rarity: Rarity, activeEvent: GameEvent | null): number {
  if (!activeEvent) return baseChance;
  // Apply multiplier to Rare, Epic, Legendary
  if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Legendary') {
    return Math.min(0.95, baseChance * activeEvent.rarityMultiplier);
  }
  return baseChance;
}
