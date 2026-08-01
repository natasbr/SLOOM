import React, { useState, useEffect } from 'react';
import { ScreenType, GameEvent, PlayerEmoji, EmojiData } from './types';
import { INITIAL_EVENTS, getActiveEvent } from './systems/eventSystem';
import { audioSystem } from './systems/audioSystem';
import { Navbar } from './components/Navbar';
import { OverworldScreen } from './components/OverworldScreen';
import { FarmScreen } from './components/FarmScreen';
import { TradeScreen } from './components/TradeScreen';
import { EventsScreen } from './components/EventsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('overworld');
  const [events, setEvents] = useState<GameEvent[]>(INITIAL_EVENTS);
  const [inventory, setInventory] = useState<PlayerEmoji[]>([
    {
      instanceId: 'starter_1',
      emojiId: 'dog',
      level: 1,
      happiness: 80,
      hunger: 90,
      caughtAt: Date.now(),
    },
    {
      instanceId: 'starter_2',
      emojiId: 'cat',
      level: 1,
      happiness: 85,
      hunger: 85,
      caughtAt: Date.now(),
    },
  ]);
  const [audioSettings, setAudioSettings] = useState({
    bgmEnabled: true,
    sfxEnabled: true,
  });

  const activeEvent = getActiveEvent(events);

  // Start BGM on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioSystem.startBgm('overworld');
      window.removeEventListener('click', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  const handleToggleAudio = () => {
    const newSettings = {
      bgmEnabled: !audioSettings.bgmEnabled,
      sfxEnabled: !audioSettings.sfxEnabled,
    };
    setAudioSettings(newSettings);
    audioSystem.updateSettings({
      ...audioSystem.getSettings(),
      bgmEnabled: newSettings.bgmEnabled,
      sfxEnabled: newSettings.sfxEnabled,
    });
  };

  const handleCaptureEmoji = (emoji: EmojiData) => {
    const newInstance: PlayerEmoji = {
      instanceId: Math.random().toString(36).substring(2, 9),
      emojiId: emoji.id,
      level: 1,
      happiness: 90,
      hunger: 90,
      caughtAt: Date.now(),
    };
    setInventory((prev) => [newInstance, ...prev]);
  };

  const handleToggleEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? { ...ev, active: !ev.active, startTime: Date.now(), endTime: Date.now() + 1000 * 60 * 15 }
          : { ...ev, active: false } // only one active event at a time for simplicity
      )
    );
  };

  const handleCompleteTrade = (offeredInstanceId: string, receivedEmojiId: string) => {
    // Remove offered item and add received item
    setInventory((prev) => {
      const filtered = prev.filter((item) => item.instanceId !== offeredInstanceId);
      const newReceivedItem: PlayerEmoji = {
        instanceId: Math.random().toString(36).substring(2, 9),
        emojiId: receivedEmojiId,
        level: 1,
        happiness: 90,
        hunger: 90,
        caughtAt: Date.now(),
      };
      return [newReceivedItem, ...filtered];
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 text-gray-800 font-sans pb-12">
      <Navbar
        currentScreen={currentScreen}
        setScreen={setCurrentScreen}
        activeEvent={activeEvent}
        audioSettings={audioSettings}
        onToggleAudio={handleToggleAudio}
        inventoryCount={inventory.length}
      />

      <main className="pt-4">
        {currentScreen === 'overworld' && (
          <OverworldScreen
            activeEvent={activeEvent}
            onCaptureEmoji={handleCaptureEmoji}
            inventory={inventory}
          />
        )}

        {currentScreen === 'farm' && (
          <FarmScreen inventory={inventory} activeEvent={activeEvent} />
        )}

        {currentScreen === 'trade' && (
          <TradeScreen inventory={inventory} onCompleteTrade={handleCompleteTrade} />
        )}

        {currentScreen === 'events' && (
          <EventsScreen events={events} onToggleEvent={handleToggleEvent} />
        )}
      </main>
    </div>
  );
}
