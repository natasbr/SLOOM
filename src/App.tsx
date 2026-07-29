/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

// --- Types & Interfaces ---
type Role = 'menu' | 'host' | 'cast';
type PlayerId = 'p1' | 'p2';

interface Vector2 { x: number; y: number; }
interface VoxelBlock { id: string; pos: Vector2; vel: Vector2; color: string; rotation: number; angularVel: number; }
interface Enemy { id: string; type: number; pos: Vector2; health: number; maxHealth: number; state: 'idle'|'walk'|'pain'|'dead'; timer: number; dir: Vector2; }
interface PlayerState { pos: Vector2; dir: Vector2; plane: Vector2; health: number; score: number; isShooting: boolean; connected: boolean; emote: string | null; }
interface GameState {
    players: Record<PlayerId, PlayerState>;
    enemies: Enemy[];
    bagBlocks: VoxelBlock[];
    particles: Array<{pos: Vector2, vel: Vector2, life: number, maxLife: number, color: string, size: number}>;
    wave: number;
    gameTime: number;
}

interface NetworkMessage { type: string; payload: any; }

// --- Constants & Config ---
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,2,2,0,0,1,0,2,2,2,2,0,2,0,1],
    [1,0,2,0,0,0,0,0,0,0,0,2,0,2,0,1],
    [1,0,2,0,1,1,1,1,0,1,0,2,0,2,0,1],
    [1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,0,1,0,1,1,1,1,2,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,1,1,1,1,1,1,1,1,1,2,2,1],
    [1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,2,2,2,0,2,2,2,2,2,2,2,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Web Audio API Samba Doom Sound Engine
const playSambaDoomAudio = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        let beat = 0;
        const tempo = 135;
        const stepTime = 60 / (tempo * 4);

        const playKick = (time: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
            gain.gain.setValueAtTime(0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            osc.start(time);
            osc.stop(time + 0.3);
        };

        const playSurdo = (time: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, time);
            osc.frequency.exponentialRampToValueAtTime(35, time + 0.4);
            gain.gain.setValueAtTime(1.0, time);
            gain.gain.linearRampToValueAtTime(0, time + 0.4);
            osc.start(time);
            osc.stop(time + 0.4);
        };

        const playDistortedBass = (time: number, note: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const distortion = ctx.createWaveShaper();
            const curve = new Float32Array(400);
            for (let i = 0; i < 400; ++i) {
                const x = i * 2 / 400 - 1;
                curve[i] = (3 + 30) * x * 20 * (Math.PI / 180) / (Math.PI + 30 * Math.abs(x));
            }
            distortion.curve = curve;
            distortion.oversample = '4x';

            osc.connect(distortion);
            distortion.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.value = note;
            gain.gain.setValueAtTime(0.25, time);
            gain.gain.linearRampToValueAtTime(0, time + 0.2);
            
            osc.start(time);
            osc.stop(time + 0.2);
        };

        const schedule = () => {
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            for (let i = 0; i < 16; i++) {
                const t = now + (i * stepTime);
                if (i % 8 === 0 || i % 8 === 6 || i % 8 === 10) playKick(t);
                if (i % 8 === 4 || i % 8 === 12) playSurdo(t);
                if (i % 2 === 0) {
                    const notes = [55, 55, 65.41, 73.42, 55, 82.41, 73.42, 65.41];
                    playDistortedBass(t, notes[(i/2) % notes.length]);
                }
            }
            beat += 16;
            setTimeout(schedule, (stepTime * 16 * 1000) - 100);
        };
        schedule();
    } catch (e) {
        console.log("Audio waiting for user interaction", e);
    }
};

// --- Strict PeerJS Networking Architecture ---
let peer: Peer | null = null;
let conn1: DataConnection | null = null;
let conn2: DataConnection | null = null;

let gameActionDispatcher: ((action: NetworkMessage, playerId?: PlayerId) => void) | null = null;

const networkManager = {
    generateRandomId: () => Math.floor(1000 + Math.random() * 9000).toString(),

    createHost: (onCode: (code: string) => void, onConnect: (p: PlayerId) => void) => {
        try {
            const id = networkManager.generateRandomId();
            peer = new Peer(id);

            peer.on('open', (id) => onCode(id));
            peer.on('connection', (connection) => {
                if (!conn1) {
                    conn1 = connection;
                    networkManager.setupConnection(conn1, 'p1', onConnect);
                    conn1.send({ type: 'assign_player', payload: { playerId: 'p1' } });
                } else if (!conn2) {
                    conn2 = connection;
                    networkManager.setupConnection(conn2, 'p2', onConnect);
                    conn2.send({ type: 'assign_player', payload: { playerId: 'p2' } });
                } else {
                    connection.close();
                }
            });
            peer.on('error', (err) => console.error('Host error:', err));
        } catch (e) {
            console.error("Host init error:", e);
            onCode("ERR!");
        }
    },

    createClient: (hostId: string, onConnected: () => void, onError: () => void) => {
        try {
            const myId = 'cast_' + networkManager.generateRandomId();
            peer = new Peer(myId);
            peer.on('open', () => networkManager.connectToHost(hostId, onConnected, onError));
            peer.on('error', () => onError());
        } catch (e) {
            onError();
        }
    },

    connectToHost: (hostId: string, onConnected: () => void, onError: () => void) => {
        if (!peer) return;
        conn1 = peer.connect(hostId);
        conn1.on('open', () => networkManager.setupConnection(conn1!, 'p1', onConnected));
        conn1.on('error', onError);
    },

    setupConnection: (connection: DataConnection, assignedId: PlayerId, onReady: (id: PlayerId) => void) => {
        connection.on('data', (data: any) => {
            networkManager.handleNetworkMessage(data, assignedId);
        });
        connection.on('close', () => {
            if (gameActionDispatcher) gameActionDispatcher({ type: 'player_disconnect', payload: {} }, assignedId);
        });
        onReady(assignedId);
    },

    sendData: (type: string, payload: any = {}) => {
        if (conn1 && conn1.open) conn1.send({ type, payload });
    },

    handleNetworkMessage: (data: NetworkMessage, sourceId: PlayerId) => {
        if (gameActionDispatcher) gameActionDispatcher(data, sourceId);
    },

    disconnectMultiplayer: () => {
        if (conn1) { conn1.close(); conn1 = null; }
        if (conn2) { conn2.close(); conn2 = null; }
        if (peer) { peer.destroy(); peer = null; }
    }
};

// --- Host View Component ---
const HostView: React.FC = () => {
    const [code, setCode] = useState<string>('----');
    const [connectedPlayers, setConnectedPlayers] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioStarted = useRef(false);

    const engine = useRef<GameState>({
        players: {
            p1: { pos: { x: 2.5, y: 2.5 }, dir: { x: -1, y: 0 }, plane: { x: 0, y: 0.66 }, health: 100, score: 0, isShooting: false, connected: false, emote: null },
            p2: { pos: { x: 3.5, y: 2.5 }, dir: { x: -1, y: 0 }, plane: { x: 0, y: 0.66 }, health: 100, score: 0, isShooting: false, connected: false, emote: null },
        },
        enemies: [
            { id: 'e1', type: 0, pos: { x: 7.5, y: 5.5 }, health: 30, maxHealth: 30, state: 'idle', timer: 0, dir: {x:1, y:0} },
            { id: 'e2', type: 1, pos: { x: 8.5, y: 8.5 }, health: 50, maxHealth: 50, state: 'idle', timer: 0, dir: {x:0, y:1} },
            { id: 'e3', type: 2, pos: { x: 2.5, y: 10.5 }, health: 40, maxHealth: 40, state: 'idle', timer: 0, dir: {x:-1, y:0} },
            { id: 'e4', type: 3, pos: { x: 12.5, y: 2.5 }, health: 60, maxHealth: 60, state: 'idle', timer: 0, dir: {x:0, y:-1} },
        ],
        bagBlocks: [],
        particles: [],
        wave: 1,
        gameTime: 0
    });

    const inputs = useRef<Record<PlayerId, { fwd: number, strafe: number, rot: number, shoot: boolean }>>({
        p1: { fwd: 0, strafe: 0, rot: 0, shoot: false },
        p2: { fwd: 0, strafe: 0, rot: 0, shoot: false }
    });

    useEffect(() => {
        networkManager.createHost(
            (c) => setCode(c),
            (pId) => {
                setConnectedPlayers(prev => Math.min(2, prev + 1));
                engine.current.players[pId].connected = true;
                if (!audioStarted.current) {
                    playSambaDoomAudio();
                    audioStarted.current = true;
                }
            }
        );

        gameActionDispatcher = (msg: NetworkMessage, pId?: PlayerId) => {
            if (!pId) return;
            const actualPId = pId;
            const i = inputs.current[actualPId];
            if (!i) return;

            switch (msg.type) {
                case 'move_fwd': i.fwd = msg.payload.active ? 1 : 0; break;
                case 'move_bwd': i.fwd = msg.payload.active ? -1 : 0; break;
                case 'rot_left': i.rot = msg.payload.active ? 1 : 0; break;
                case 'rot_right': i.rot = msg.payload.active ? -1 : 0; break;
                case 'strafe_left': i.strafe = msg.payload.active ? -1 : 0; break;
                case 'strafe_right': i.strafe = msg.payload.active ? 1 : 0; break;
                case 'shoot': i.shoot = msg.payload.active; break;
                case 'emote': 
                    engine.current.players[actualPId].emote = msg.payload.emote;
                    setTimeout(() => { engine.current.players[actualPId].emote = null; }, 2000);
                    break;
                case 'player_disconnect':
                    engine.current.players[actualPId].connected = false;
                    setConnectedPlayers(prev => Math.max(0, prev - 1));
                    break;
            }
        };

        return () => {
            networkManager.disconnectMultiplayer();
            gameActionDispatcher = null;
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let lastTime = performance.now();
        let animationFrameId: number;
        let syncTimer = 0;

        const rand = (min: number, max: number) => Math.random() * (max - min) + min;

        const updatePhysics = (dt: number) => {
            const state = engine.current;
            state.gameTime += dt;
            const moveSpeed = 4.5 * dt;
            const rotSpeed = 3.2 * dt;

            (['p1', 'p2'] as PlayerId[]).forEach(pId => {
                const p = state.players[pId];
                if (!p.connected) return;
                const i = inputs.current[pId];

                if (i.rot !== 0) {
                    const oldDirX = p.dir.x;
                    p.dir.x = p.dir.x * Math.cos(i.rot * rotSpeed) - p.dir.y * Math.sin(i.rot * rotSpeed);
                    p.dir.y = oldDirX * Math.sin(i.rot * rotSpeed) + p.dir.y * Math.cos(i.rot * rotSpeed);
                    const oldPlaneX = p.plane.x;
                    p.plane.x = p.plane.x * Math.cos(i.rot * rotSpeed) - p.plane.y * Math.sin(i.rot * rotSpeed);
                    p.plane.y = oldPlaneX * Math.sin(i.rot * rotSpeed) + p.plane.y * Math.cos(i.rot * rotSpeed);
                }

                let newX = p.pos.x + p.dir.x * i.fwd * moveSpeed;
                let newY = p.pos.y + p.dir.y * i.fwd * moveSpeed;

                if (i.strafe !== 0) {
                    newX += p.plane.x * i.strafe * moveSpeed;
                    newY += p.plane.y * i.strafe * moveSpeed;
                }

                if (MAP[Math.floor(p.pos.y)][Math.floor(newX)] === 0) p.pos.x = newX;
                if (MAP[Math.floor(newY)][Math.floor(p.pos.x)] === 0) p.pos.y = newY;

                if (i.shoot && !p.isShooting) {
                    p.isShooting = true;
                    let hit = false;
                    for (let step = 0.5; step < 8; step += 0.4) {
                        const cx = p.pos.x + p.dir.x * step;
                        const cy = p.pos.y + p.dir.y * step;
                        if (MAP[Math.floor(cy)] && MAP[Math.floor(cy)][Math.floor(cx)] > 0) break;

                        for (let e of state.enemies) {
                            if (e.health > 0) {
                                const dx = e.pos.x - cx;
                                const dy = e.pos.y - cy;
                                if (Math.sqrt(dx*dx + dy*dy) < 0.6) {
                                    e.health -= 15;
                                    e.state = 'pain';
                                    e.timer = 0.3;
                                    hit = true;

                                    for (let k = 0; k < 18; k++) {
                                        state.particles.push({
                                            pos: { x: e.pos.x, y: e.pos.y },
                                            vel: { x: rand(-4, 4), y: rand(-4, 4) },
                                            life: 1.2, maxLife: 1.2,
                                            color: Math.random() > 0.3 ? '#ef4444' : '#991b1b',
                                            size: rand(3, 7)
                                        });
                                    }

                                    if (e.health <= 0) {
                                        e.state = 'dead';
                                        p.score += 250;
                                        for (let g = 0; g < 5; g++) {
                                            state.bagBlocks.push({
                                                id: Math.random().toString(),
                                                pos: { x: rand(80, 320), y: -30 - g * 15 },
                                                vel: { x: rand(-120, 120), y: rand(50, 150) },
                                                color: g % 2 === 0 ? '#fbbf24' : '#f59e0b',
                                                rotation: rand(0, Math.PI * 2),
                                                angularVel: rand(-8, 8)
                                            });
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        if (hit) break;
                    }
                    setTimeout(() => { p.isShooting = false; }, 250);
                }
            });

            // Update enemies AI
            state.enemies.forEach(e => {
                if (e.health <= 0) return;
                if (e.timer > 0) {
                    e.timer -= dt;
                } else {
                    e.state = 'walk';
                    if (Math.random() < 0.03) {
                        e.dir = { x: rand(-1, 1), y: rand(-1, 1) };
                        const mag = Math.sqrt(e.dir.x*e.dir.x + e.dir.y*e.dir.y);
                        if (mag > 0) { e.dir.x /= mag; e.dir.y /= mag; }
                    }
                    const nx = e.pos.x + e.dir.x * dt * 2.0;
                    const ny = e.pos.y + e.dir.y * dt * 2.0;
                    if (MAP[Math.floor(ny)] && MAP[Math.floor(ny)][Math.floor(nx)] === 0) {
                        e.pos.x = nx; e.pos.y = ny;
                    }
                }
            });

            // Bag physics
            const gravity = 900;
            const bagMaxW = 400;
            const bagFloorH = 280;
            state.bagBlocks.forEach(b => {
                b.vel.y += gravity * dt;
                b.pos.x += b.vel.x * dt;
                b.pos.y += b.vel.y * dt;
                b.rotation += b.angularVel * dt;

                if (b.pos.y > bagFloorH - 15) {
                    b.pos.y = bagFloorH - 15;
                    b.vel.y *= -0.3;
                    b.vel.x *= 0.7;
                    b.angularVel *= 0.5;
                }
                if (b.pos.x < 15) { b.pos.x = 15; b.vel.x *= -0.5; }
                if (b.pos.x > bagMaxW - 15) { b.pos.x = bagMaxW - 15; b.vel.x *= -0.5; }
            });

            state.particles.forEach(pt => {
                pt.pos.x += pt.vel.x * dt;
                pt.pos.y += pt.vel.y * dt;
                pt.vel.y += 200 * dt;
                pt.life -= dt;
            });
            state.particles = state.particles.filter(pt => pt.life > 0);

            // Broadcast state sync to connected clients
            syncTimer += dt;
            if (syncTimer > 0.04) { // ~25fps sync
                syncTimer = 0;
                if (conn1 && conn1.open) {
                    conn1.send({ type: 'state_sync', payload: { state, assignedId: 'p1' } });
                }
                if (conn2 && conn2.open) {
                    conn2.send({ type: 'state_sync', payload: { state, assignedId: 'p2' } });
                }
            }
        };

        const renderPOV = (pId: PlayerId, xOffset: number, width: number, height: number) => {
            const p = engine.current.players[pId];
            if (!p.connected) {
                ctx.fillStyle = '#111827';
                ctx.fillRect(xOffset, 0, width, height);
                ctx.fillStyle = '#9ca3af';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(`WAITING FOR ${pId.toUpperCase()}...`, xOffset + width / 2 - 110, height / 2);
                return;
            }

            ctx.fillStyle = '#1f2937';
            ctx.fillRect(xOffset, 0, width, height / 2);
            ctx.fillStyle = '#111827';
            ctx.fillRect(xOffset, height / 2, width, height / 2);

            const zBuffer: number[] = new Array(width).fill(0);

            for (let x = 0; x < width; x++) {
                const cameraX = 2 * x / width - 1;
                const rayDirX = p.dir.x + p.plane.x * cameraX;
                const rayDirY = p.dir.y + p.plane.y * cameraX;

                let mapX = Math.floor(p.pos.x);
                let mapY = Math.floor(p.pos.y);
                let sideDistX, sideDistY;
                const deltaDistX = Math.abs(1 / rayDirX);
                const deltaDistY = Math.abs(1 / rayDirY);
                let perpWallDist;
                let stepX, stepY;
                let hit = 0;
                let side = 0;

                if (rayDirX < 0) { stepX = -1; sideDistX = (p.pos.x - mapX) * deltaDistX; }
                else { stepX = 1; sideDistX = (mapX + 1.0 - p.pos.x) * deltaDistX; }
                if (rayDirY < 0) { stepY = -1; sideDistY = (p.pos.y - mapY) * deltaDistY; }
                else { stepY = 1; sideDistY = (mapY + 1.0 - p.pos.y) * deltaDistY; }

                while (hit === 0) {
                    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
                    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
                    if (MAP[mapY] && MAP[mapY][mapX] > 0) hit = MAP[mapY][mapX];
                }

                if (side === 0) perpWallDist = (mapX - p.pos.x + (1 - stepX) / 2) / rayDirX;
                else perpWallDist = (mapY - p.pos.y + (1 - stepY) / 2) / rayDirY;

                zBuffer[x] = perpWallDist;

                const lineHeight = Math.floor(height / (perpWallDist || 0.0001));
                const drawStart = -lineHeight / 2 + height / 2;

                let color = hit === 1 ? '#374151' : '#4b5563';
                if (side === 1) color = '#1f2937';

                ctx.fillStyle = color;
                ctx.fillRect(xOffset + x, Math.max(0, drawStart), 1, Math.min(height, lineHeight));
            }

            const sprites: { x: number, y: number, dist: number, type: 'enemy'|'player', state: string, id: string, typeIdx: number }[] = [];

            engine.current.enemies.forEach(e => {
                if (e.health > 0) {
                    sprites.push({
                        x: e.pos.x, y: e.pos.y,
                        dist: Math.pow(p.pos.x - e.pos.x, 2) + Math.pow(p.pos.y - e.pos.y, 2),
                        type: 'enemy', state: e.state, id: e.id, typeIdx: e.type
                    });
                }
            });

            const otherP = pId === 'p1' ? 'p2' : 'p1';
            if (engine.current.players[otherP].connected) {
                const op = engine.current.players[otherP];
                sprites.push({
                    x: op.pos.x, y: op.pos.y,
                    dist: Math.pow(p.pos.x - op.pos.x, 2) + Math.pow(p.pos.y - op.pos.y, 2),
                    type: 'player', state: 'idle', id: otherP, typeIdx: 0
                });
            }

            sprites.sort((a, b) => b.dist - a.dist);

            sprites.forEach(sprite => {
                const spriteX = sprite.x - p.pos.x;
                const spriteY = sprite.y - p.pos.y;

                const invDet = 1.0 / (p.plane.x * p.dir.y - p.dir.x * p.plane.y);
                const transformX = invDet * (p.dir.y * spriteX - p.dir.x * spriteY);
                const transformY = invDet * (-p.plane.y * spriteX + p.plane.x * spriteY);

                if (transformY > 0) {
                    const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));
                    const spriteHeight = Math.abs(Math.floor(height / transformY));
                    const spriteWidth = spriteHeight;
                    const drawStartY = -spriteHeight / 2 + height / 2;
                    const drawStartX = -spriteWidth / 2 + spriteScreenX;

                    for (let stripe = Math.max(0, drawStartX); stripe < Math.min(width, drawStartX + spriteWidth); stripe++) {
                        if (transformY < zBuffer[stripe]) {
                            const sx = xOffset + stripe;
                            const sy = Math.max(0, drawStartY);
                            if (sprite.type === 'enemy') {
                                ctx.fillStyle = sprite.state === 'pain' ? '#ef4444' : '#6b7280';
                            } else {
                                ctx.fillStyle = sprite.id === 'p1' ? '#3b82f6' : '#10b981';
                            }
                            ctx.fillRect(sx, sy, 1, Math.min(height, spriteHeight));
                        }
                    }
                }
            });

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(xOffset + 10, 10, 180, 60);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(`${pId.toUpperCase()} SCORE: ${p.score}`, xOffset + 20, 32);
            ctx.fillStyle = '#ef4444';
            ctx.fillText(`HEALTH: ${p.health}%`, xOffset + 20, 54);

            if (p.emote) {
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 24px monospace';
                ctx.fillText(`"${p.emote}"`, xOffset + width / 2 - 40, 80);
            }

            if (p.isShooting) {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(xOffset + width / 2 - 25, height - 90, 50, 50);
            }
            ctx.fillStyle = '#374151';
            ctx.fillRect(xOffset + width / 2 - 15, height - 60, 30, 60);
        };

        const renderMinimap = (xOffset: number, yOffset: number) => {
            const scale = 7;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(xOffset, yOffset, MAP[0].length * scale, MAP.length * scale);

            for (let y = 0; y < MAP.length; y++) {
                for (let x = 0; x < MAP[0].length; x++) {
                    if (MAP[y][x] > 0) {
                        ctx.fillStyle = '#4b5563';
                        ctx.fillRect(xOffset + x * scale, yOffset + y * scale, scale, scale);
                    }
                }
            }

            (['p1', 'p2'] as PlayerId[]).forEach(pId => {
                const p = engine.current.players[pId];
                if (p.connected) {
                    ctx.fillStyle = pId === 'p1' ? '#3b82f6' : '#10b981';
                    ctx.beginPath();
                    ctx.arc(xOffset + p.pos.x * scale, yOffset + p.pos.y * scale, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        };

        const renderBag = (xOffset: number, yOffset: number, width: number, height: number) => {
            ctx.fillStyle = '#111827';
            ctx.fillRect(xOffset, yOffset, width, height);

            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 16px monospace';
            ctx.fillText('FAVELA LOOT BAG (COLLECTED GOLD)', xOffset + 15, yOffset + 25);

            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 4;
            ctx.strokeRect(xOffset + 15, yOffset + 40, width - 30, height - 55);

            engine.current.bagBlocks.forEach(b => {
                ctx.save();
                ctx.translate(xOffset + b.pos.x, yOffset + b.pos.y);
                ctx.rotate(b.rotation);
                ctx.fillStyle = b.color;
                ctx.fillRect(-8, -8, 16, 16);
                ctx.strokeStyle = '#78350f';
                ctx.strokeRect(-8, -8, 16, 16);
                ctx.restore();
            });

            engine.current.particles.forEach(pt => {
                ctx.fillStyle = pt.color;
                ctx.fillRect(xOffset + pt.pos.x * 25, yOffset + 100 + pt.pos.y * 10, pt.size, pt.size);
            });
        };

        const loop = (time: number) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            updatePhysics(Math.min(dt, 0.1));

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const halfW = canvas.width / 2;
            const viewH = canvas.height * 0.7;

            renderPOV('p1', 0, halfW - 2, viewH);
            renderPOV('p2', halfW + 2, halfW - 2, viewH);

            ctx.fillStyle = '#111827';
            ctx.fillRect(halfW - 2, 0, 4, viewH);

            ctx.fillStyle = '#030712';
            ctx.fillRect(0, viewH, canvas.width, canvas.height - viewH);

            renderMinimap(20, viewH + 15);
            renderBag(halfW, viewH, halfW, canvas.height - viewH);

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white font-mono p-4">
            <div className="flex justify-between items-center w-full max-w-5xl mb-3 bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div>
                    <h1 className="text-2xl font-black text-purple-400">FAVELA DOOM — HOST DISPLAY</h1>
                    <p className="text-xs text-gray-400">Share connection code with Cast controllers</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center bg-black px-4 py-2 rounded-lg border border-purple-900">
                        <span className="text-xs text-gray-400 block">ROOM PIN</span>
                        <span className="text-3xl font-bold text-yellow-400 tracking-widest">{code}</span>
                    </div>
                    <div className="text-sm">
                        Players: <span className={connectedPlayers > 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{connectedPlayers}/2</span>
                    </div>
                </div>
            </div>

            <canvas 
                ref={canvasRef} 
                width={960} 
                height={640} 
                className="rounded-xl shadow-2xl border-2 border-gray-800 w-full max-w-5xl bg-black"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
};

// --- Cast View Component (Controller + Player POV) ---
const CastView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [pin, setPin] = useState('');
    const [status, setStatus] = useState<'idle'|'connecting'|'connected'>('idle');
    const [assignedPlayer, setAssignedPlayer] = useState<PlayerId>('p1');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const latestState = useRef<GameState | null>(null);

    const handleConnect = () => {
        if (pin.length !== 4) return;
        setStatus('connecting');
        networkManager.createClient(
            pin,
            () => {
                setStatus('connected');
                gameActionDispatcher = (msg) => {
                    if (msg.type === 'assign_player') {
                        setAssignedPlayer(msg.payload.playerId);
                    } else if (msg.type === 'state_sync') {
                        latestState.current = msg.payload.state;
                        setAssignedPlayer(msg.payload.assignedId);
                    }
                };
            },
            () => setStatus('idle')
        );
    };

    // Render individual player POV on Cast mobile screen
    useEffect(() => {
        if (status !== 'connected') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;

        const renderLoop = () => {
            const state = latestState.current;
            const width = canvas.width;
            const height = canvas.height;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            if (!state) {
                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 16px monospace';
                ctx.fillText('CONNECTING TO FAVELA SIMULATION...', 20, height / 2);
                animId = requestAnimationFrame(renderLoop);
                return;
            }

            const p = state.players[assignedPlayer];
            if (!p) {
                animId = requestAnimationFrame(renderLoop);
                return;
            }

            // Draw ceiling & floor
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, width, height / 2);
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, height / 2, width, height / 2);

            const zBuffer: number[] = new Array(width).fill(0);

            // Raycaster walls
            for (let x = 0; x < width; x++) {
                const cameraX = 2 * x / width - 1;
                const rayDirX = p.dir.x + p.plane.x * cameraX;
                const rayDirY = p.dir.y + p.plane.y * cameraX;

                let mapX = Math.floor(p.pos.x);
                let mapY = Math.floor(p.pos.y);
                let sideDistX, sideDistY;
                const deltaDistX = Math.abs(1 / rayDirX);
                const deltaDistY = Math.abs(1 / rayDirY);
                let perpWallDist;
                let stepX, stepY;
                let hit = 0;
                let side = 0;

                if (rayDirX < 0) { stepX = -1; sideDistX = (p.pos.x - mapX) * deltaDistX; }
                else { stepX = 1; sideDistX = (mapX + 1.0 - p.pos.x) * deltaDistX; }
                if (rayDirY < 0) { stepY = -1; sideDistY = (p.pos.y - mapY) * deltaDistY; }
                else { stepY = 1; sideDistY = (mapY + 1.0 - p.pos.y) * deltaDistY; }

                while (hit === 0) {
                    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
                    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
                    if (MAP[mapY] && MAP[mapY][mapX] > 0) hit = MAP[mapY][mapX];
                }

                if (side === 0) perpWallDist = (mapX - p.pos.x + (1 - stepX) / 2) / rayDirX;
                else perpWallDist = (mapY - p.pos.y + (1 - stepY) / 2) / rayDirY;

                zBuffer[x] = perpWallDist;

                const lineHeight = Math.floor(height / (perpWallDist || 0.0001));
                const drawStart = -lineHeight / 2 + height / 2;

                let color = hit === 1 ? '#374151' : '#4b5563';
                if (side === 1) color = '#1f2937';

                ctx.fillStyle = color;
                ctx.fillRect(x, Math.max(0, drawStart), 1, Math.min(height, lineHeight));
            }

            // Enemies / other player sprites
            const sprites: { x: number, y: number, dist: number, type: 'enemy'|'player', state: string }[] = [];
            state.enemies.forEach(e => {
                if (e.health > 0) {
                    sprites.push({
                        x: e.pos.x, y: e.pos.y,
                        dist: Math.pow(p.pos.x - e.pos.x, 2) + Math.pow(p.pos.y - e.pos.y, 2),
                        type: 'enemy', state: e.state
                    });
                }
            });

            sprites.sort((a, b) => b.dist - a.dist);

            sprites.forEach(sprite => {
                const spriteX = sprite.x - p.pos.x;
                const spriteY = sprite.y - p.pos.y;

                const invDet = 1.0 / (p.plane.x * p.dir.y - p.dir.x * p.plane.y);
                const transformX = invDet * (p.dir.y * spriteX - p.dir.x * spriteY);
                const transformY = invDet * (-p.plane.y * spriteX + p.plane.x * spriteY);

                if (transformY > 0) {
                    const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));
                    const spriteHeight = Math.abs(Math.floor(height / transformY));
                    const spriteWidth = spriteHeight;
                    const drawStartY = -spriteHeight / 2 + height / 2;
                    const drawStartX = -spriteWidth / 2 + spriteScreenX;

                    for (let stripe = Math.max(0, drawStartX); stripe < Math.min(width, drawStartX + spriteWidth); stripe++) {
                        if (transformY < zBuffer[stripe]) {
                            ctx.fillStyle = sprite.state === 'pain' ? '#ef4444' : '#6b7280';
                            ctx.fillRect(stripe, Math.max(0, drawStartY), 1, Math.min(height, spriteHeight));
                        }
                    }
                }
            });

            // HUD on Cast viewport
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(10, 10, 160, 50);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`ROLE: ${assignedPlayer.toUpperCase()}`, 18, 28);
            ctx.fillStyle = '#ef4444';
            ctx.fillText(`HP: ${p.health}% | SCORE: ${p.score}`, 18, 48);

            if (p.isShooting) {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(width / 2 - 20, height - 70, 40, 40);
            }
            ctx.fillStyle = '#374151';
            ctx.fillRect(width / 2 - 12, height - 45, 24, 45);

            animId = requestAnimationFrame(renderLoop);
        };

        animId = requestAnimationFrame(renderLoop);
        return () => cancelAnimationFrame(animId);
    }, [status, assignedPlayer]);

    const sendAction = (type: string, active: boolean) => (e: React.SyntheticEvent) => {
        e.preventDefault();
        networkManager.sendData(type, { active });
    };

    const sendEmote = (emote: string) => {
        networkManager.sendData('emote', { emote });
    };

    if (status !== 'connected') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4 font-mono">
                <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full border border-gray-800">
                    <h2 className="text-2xl font-bold mb-2 text-green-400">CAST CONTROLLER</h2>
                    <p className="text-xs text-gray-400 mb-6">Enter Host's 4-digit PIN to join the Favela</p>
                    <input 
                        type="text" 
                        maxLength={4} 
                        placeholder="----" 
                        className="w-full text-center text-4xl p-4 mb-6 bg-black border-2 border-gray-700 rounded-xl text-yellow-400 font-bold focus:outline-none focus:border-green-500 tracking-widest"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    <button 
                        onClick={handleConnect}
                        disabled={pin.length !== 4 || status === 'connecting'}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg"
                    >
                        {status === 'connecting' ? 'CONNECTING...' : 'JOIN GAME'}
                    </button>
                    <button onClick={onBack} className="mt-4 text-gray-500 hover:text-white text-sm underline">← Back to Menu</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-between h-screen bg-gray-950 text-white font-mono select-none touch-none overflow-hidden p-2">
            {/* Player's personal POV screen on mobile */}
            <div className="relative w-full h-56 bg-black rounded-xl overflow-hidden border-2 border-purple-800 shadow-xl flex-shrink-0">
                <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={220} 
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-yellow-400">
                    {assignedPlayer.toUpperCase()} POV
                </div>
            </div>

            {/* Quick Emotes */}
            <div className="flex justify-center gap-1.5 my-1">
                {['MANDOU BEM!', 'SALVE!', 'FAVELA VENCEU!', 'CORRE!'].map(em => (
                    <button 
                        key={em} 
                        onClick={() => sendEmote(em)}
                        className="bg-purple-900/60 hover:bg-purple-800 text-[10px] px-2.5 py-1.5 rounded-lg border border-purple-700 active:scale-95 transition-transform font-bold"
                    >
                        {em}
                    </button>
                ))}
            </div>

            {/* Redesigned Arcade Gamepad Controller */}
            <div className="flex justify-between items-center px-4 pb-4 mt-auto">
                {/* Advanced D-Pad / Movement */}
                <div className="relative w-44 h-44 bg-gray-900 rounded-full border-4 border-gray-800 shadow-2xl flex-shrink-0">
                    <button 
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-16 bg-gray-800 rounded-lg active:bg-purple-600 flex items-center justify-center text-xl font-bold shadow"
                        onPointerDown={sendAction('move_fwd', true)} onPointerUp={sendAction('move_fwd', false)} onPointerOut={sendAction('move_fwd', false)}
                    >▲</button>
                    <button 
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-14 h-16 bg-gray-800 rounded-lg active:bg-purple-600 flex items-center justify-center text-xl font-bold shadow"
                        onPointerDown={sendAction('move_bwd', true)} onPointerUp={sendAction('move_bwd', false)} onPointerOut={sendAction('move_bwd', false)}
                    >▼</button>
                    <button 
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-16 h-14 bg-gray-800 rounded-lg active:bg-purple-600 flex items-center justify-center text-xl font-bold shadow"
                        onPointerDown={sendAction('rot_left', true)} onPointerUp={sendAction('rot_left', false)} onPointerOut={sendAction('rot_left', false)}
                    >◀</button>
                    <button 
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-16 h-14 bg-gray-800 rounded-lg active:bg-purple-600 flex items-center justify-center text-xl font-bold shadow"
                        onPointerDown={sendAction('rot_right', true)} onPointerUp={sendAction('rot_right', false)} onPointerOut={sendAction('rot_right', false)}
                    >▶</button>
                </div>

                {/* Strafe & Action Fire */}
                <div className="flex items-center gap-3">
                    <button 
                        className="w-16 h-16 bg-blue-700 rounded-2xl active:bg-blue-500 shadow-lg active:translate-y-1 flex items-center justify-center text-xl font-bold"
                        onPointerDown={sendAction('strafe_left', true)} onPointerUp={sendAction('strafe_left', false)}
                    >↺</button>
                    
                    <button 
                        className="w-28 h-28 bg-gradient-to-t from-red-700 to-red-500 rounded-full active:from-red-600 active:to-red-400 shadow-[0_8px_0_#991b1b] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center font-black text-2xl tracking-wider border-4 border-red-900"
                        onPointerDown={sendAction('shoot', true)} onPointerUp={sendAction('shoot', false)}
                    >FIRE</button>

                    <button 
                        className="w-16 h-16 bg-blue-700 rounded-2xl active:bg-blue-500 shadow-lg active:translate-y-1 flex items-center justify-center text-xl font-bold"
                        onPointerDown={sendAction('strafe_right', true)} onPointerUp={sendAction('strafe_right', false)}
                    >↻</button>
                </div>
            </div>
        </div>
    );
};

// --- Root App Component ---
export default function App() {
    const [role, setRole] = useState<Role>('menu');

    return (
        <div className="min-h-screen bg-gray-950 font-sans text-white">
            {role === 'menu' && (
                <div className="flex flex-col items-center justify-center min-h-screen p-6">
                    <div className="text-center max-w-xl">
                        <h1 className="text-6xl font-black mb-4 tracking-wider bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 text-transparent bg-clip-text">
                            FAVELA DOOM
                        </h1>
                        <p className="text-gray-400 mb-10 text-lg">
                            Co-op Dungeon Crawler set in the Favela. Host on your main screen and connect with mobile Cast controllers!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <button 
                                onClick={() => setRole('host')}
                                className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-5 px-10 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 text-xl border border-purple-500"
                            >
                                HOST DISPLAY
                            </button>
                            <button 
                                onClick={() => setRole('cast')}
                                className="bg-green-700 hover:bg-green-600 text-white font-bold py-5 px-10 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 text-xl border border-green-500"
                            >
                                CAST CONTROLLER
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {role === 'host' && <HostView />}
            {role === 'cast' && <CastView onBack={() => setRole('menu')} />}
        </div>
    );
}
