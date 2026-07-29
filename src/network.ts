import Peer, { DataConnection } from 'peerjs';

// Strict networking rules global variables
export let peer: Peer | null = null;
export let conn: DataConnection | null = null; // Used by Cast

// Host specific variables for multiple players
export let peer2: Peer | null = null; // For the second pin
export let hostConns: { id: number; conn: DataConnection }[] = [];

export const generateRandomId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const createHost = (
    onOpen: (pin1: string, pin2: string) => void,
    onData: (playerId: number, data: any) => void,
    onConn: (playerId: number) => void,
    onClose: (playerId: number) => void
) => {
    const pin1 = generateRandomId();
    const pin2 = generateRandomId();

    peer = new Peer(pin1);
    peer2 = new Peer(pin2);

    let p1Open = false;
    let p2Open = false;

    const checkOpen = () => {
        if (p1Open && p2Open) onOpen(pin1, pin2);
    };

    peer.on('open', () => { p1Open = true; checkOpen(); });
    peer2.on('open', () => { p2Open = true; checkOpen(); });

    peer.on('connection', (c) => setupHostConnection(c, 1, onData, onConn, onClose));
    peer2.on('connection', (c) => setupHostConnection(c, 2, onData, onConn, onClose));
};

const setupHostConnection = (
    c: DataConnection,
    playerId: number,
    onData: (playerId: number, data: any) => void,
    onConn: (playerId: number) => void,
    onClose: (playerId: number) => void
) => {
    c.on('open', () => {
        hostConns.push({ id: playerId, conn: c });
        onConn(playerId);
    });
    c.on('data', (data) => {
        handleNetworkMessage(playerId, data, onData);
    });
    c.on('close', () => {
        hostConns = hostConns.filter(hc => hc.id !== playerId);
        onClose(playerId);
    });
    c.on('error', (err) => {
        console.error('Host connection error:', err);
    });
};

export const createClient = (onOpen: () => void) => {
    peer = new Peer(generateRandomId());
    peer.on('open', () => {
        onOpen();
    });
    peer.on('error', (err) => {
        console.error('Client peer error:', err);
    });
};

export const connectToHost = (
    hostId: string,
    onData: (data: any) => void,
    onConnected: () => void,
    onClose: () => void
) => {
    if (!peer) return;
    conn = peer.connect(hostId);
    setupConnection(onData, onConnected, onClose);
};

export const setupConnection = (
    onData: (data: any) => void, 
    onConnected: () => void,
    onClose: () => void
) => {
    if (!conn) return;
    conn.on('open', () => {
        onConnected();
    });
    conn.on('data', (data) => {
        handleCastNetworkMessage(data, onData);
    });
    conn.on('close', () => {
        conn = null;
        onClose();
    });
    conn.on('error', (err) => {
        console.error('Cast connection error:', err);
    });
};

export const sendData = (type: string, payload: any = {}) => {
    if (conn && conn.open) {
        conn.send({ type, payload });
    }
};

export const hostBroadcast = (type: string, payload: any = {}) => {
    hostConns.forEach(c => {
        if (c.conn.open) c.conn.send({ type, payload });
    });
};

export const hostSendToPlayer = (playerId: number, type: string, payload: any = {}) => {
    const c = hostConns.find(hc => hc.id === playerId);
    if (c && c.conn.open) {
        c.conn.send({ type, payload });
    }
};

const handleNetworkMessage = (playerId: number, data: any, callback: (playerId: number, data: any) => void) => {
    // Separation of concerns: route incoming data
    if (data && typeof data === 'object' && data.type) {
        callback(playerId, data);
    }
};

const handleCastNetworkMessage = (data: any, callback: (data: any) => void) => {
    if (data && typeof data === 'object' && data.type) {
        callback(data);
    }
};

export const disconnectMultiplayer = () => {
    if (conn) {
        conn.close();
        conn = null;
    }
    hostConns.forEach(c => c.conn.close());
    hostConns = [];
    if (peer) {
        peer.destroy();
        peer = null;
    }
    if (peer2) {
        peer2.destroy();
        peer2 = null;
    }
};
