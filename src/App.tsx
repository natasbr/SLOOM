import React, { useState, useEffect } from 'react';
import { HostView } from './components/HostView';
import { CastView } from './components/CastView';
import { disconnectMultiplayer } from './network';
import { Skull } from 'lucide-react';

export default function App() {
    const [mode, setMode] = useState<'menu' | 'host' | 'cast'>('menu');

    useEffect(() => {
        // Cleanup network on unmount
        return () => disconnectMultiplayer();
    }, []);

    if (mode === 'host') return <HostView />;
    if (mode === 'cast') return <CastView />;

    return (
        <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background noise/style */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, #444 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }} />
            
            <div className="relative z-10 flex flex-col items-center max-w-md w-full">
                <Skull size={64} className="text-red-600 mb-6 animate-pulse" />
                <h1 className="text-4xl md:text-5xl font-bold text-center text-red-600 mb-2 tracking-tighter">
                    FAVELA DOOM
                </h1>
                <p className="text-zinc-400 text-center mb-12">CO-OP SURVIVAL</p>

                <div className="flex flex-col gap-4 w-full">
                    <button 
                        onClick={() => setMode('host')}
                        className="group relative w-full border-2 border-red-600 bg-black py-4 px-6 text-xl font-bold text-white hover:bg-red-600 transition-all uppercase"
                    >
                        <span className="relative z-10">Start Host Display</span>
                        <div className="absolute inset-0 bg-red-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200 z-0" />
                    </button>
                    
                    <button 
                        onClick={() => setMode('cast')}
                        className="group relative w-full border-2 border-zinc-600 bg-black py-4 px-6 text-xl font-bold text-zinc-300 hover:bg-zinc-800 hover:border-zinc-400 transition-all uppercase"
                    >
                        <span className="relative z-10">Join as Cast (Controller)</span>
                    </button>
                </div>

                <div className="mt-12 text-zinc-500 text-xs text-center max-w-xs">
                    One device should start the Host Display. 
                    Up to two other devices can join as Cast to control the players.
                </div>
            </div>
        </div>
    );
}
