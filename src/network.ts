import Peer, { DataConnection } from 'peerjs';

export class NetworkManager {
  peer: Peer | null = null;
  conn: DataConnection | null = null;
  
  onDataCallback: (data: any, peerId?: string) => void = () => {};
  onConnectCallback: (peerId: string) => void = () => {};
  onDisconnectCallback: (peerId: string) => void = () => {};

  generateRandomId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Create a client peer
  createClient() {
    const clientId = this.generateRandomId() + '-cast';
    this.peer = new Peer(clientId);
    this.peer.on('error', (err) => {
      console.error('Client Peer error:', err);
    });
  }

  // Connect client to host
  connectToHost(hostId: string) {
    if (!this.peer) return;
    this.conn = this.peer.connect(hostId);
    this.conn.on('open', () => {
      this.setupConnection();
      this.onConnectCallback(hostId);
    });
    this.conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
    this.conn.on('close', () => {
      this.onDisconnectCallback(hostId);
    });
  }

  // Host setup
  createHost(hostId: string) {
    this.peer = new Peer(hostId);
    this.peer.on('open', (id) => {
      console.log('Host created with ID:', id);
    });
    this.peer.on('connection', (connection) => {
      // In a real scenario we'd handle multiple connections, 
      // but if we are making two separate Host managers (one for each PIN),
      // we can just save it to `conn`.
      this.conn = connection;
      this.setupConnection();
      this.onConnectCallback(connection.peer);
    });
    this.peer.on('error', (err) => {
      console.error('Host Peer error:', err);
    });
    this.peer.on('disconnected', () => {
      console.log('Host disconnected');
    });
  }

  setupConnection() {
    if (!this.conn) return;
    this.conn.on('data', (data) => {
      this.handleNetworkMessage(data);
    });
    this.conn.on('close', () => {
      if (this.conn) {
        this.onDisconnectCallback(this.conn.peer);
      }
    });
    this.conn.on('error', (err) => {
      console.error('Conn error', err);
    });
  }

  handleNetworkMessage(data: any) {
    // A central switch statement that routes incoming data based on data.type.
    switch (data.type) {
      case 'move':
      case 'action':
      case 'change_ant':
        this.onDataCallback(data, this.conn?.peer);
        break;
      default:
        console.warn('Unknown network message type:', data.type);
    }
  }

  sendData(type: string, payload: any = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ type, payload });
    }
  }

  disconnectMultiplayer() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
