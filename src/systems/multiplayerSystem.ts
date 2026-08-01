import { TradeOffer, TradeState, PlayerEmoji } from '../types';

// We implement a robust LocalStorage + BroadcastChannel based room sync for seamless multiplayer trading across tabs or simulated partner
export class MultiplayerTradeManager {
  private roomId: string = '';
  private playerName: string = 'Player ' + Math.floor(Math.random() * 900 + 100);
  private partnerName: string = 'Waiting for partner...';
  private state: TradeState = 'DISCONNECTED';
  private myOffer: string | null = null;
  private partnerOffer: string | null = null;
  private myConfirmed: boolean = false;
  private partnerConfirmed: boolean = false;
  private channel: BroadcastChannel | null = null;
  private listeners: ((state: TradeOffer) => void)[] = []

  constructor() {
    // constructor
  }

  public setPlayerName(name: string) {
    this.playerName = name;
  }

  public getPlayerName(): string {
    return this.playerName;
  }

  public getPartnerName(): string {
    return this.partnerName;
  }

  public getState(): TradeState {
    return this.state;
  }

  public subscribe(listener: (state: TradeOffer) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const offer: TradeOffer = {
      roomId: this.roomId,
      player1Name: this.playerName,
      player2Name: this.partnerName,
      player1OfferedInstanceId: this.myOffer,
      player2OfferedInstanceId: this.partnerOffer,
      player1Confirmed: this.myConfirmed,
      player2Confirmed: this.partnerConfirmed,
      status: this.state,
    };
    this.listeners.forEach(l => l(offer));
    if (this.roomId && this.channel) {
      this.channel.postMessage({ type: 'SYNC', offer });
    }
  }

  public createRoom(customRoomId?: string): string {
    this.roomId = customRoomId || Math.random().toString(36).substring(2, 8).toUpperCase();
    this.state = 'CONNECTED';
    this.partnerName = 'Bot Partner (Alex)';
    this.setupChannel();
    this.notify();
    return this.roomId;
  }

  public joinRoom(roomId: string): boolean {
    if (!roomId) return false;
    this.roomId = roomId.toUpperCase();
    this.state = 'CONNECTED';
    this.partnerName = 'Room Host';
    this.setupChannel();
    this.notify();
    return true;
  }

  private setupChannel() {
    if (this.channel) {
      this.channel.close();
    }
    this.channel = new BroadcastChannel(`emoji_trade_${this.roomId}`);
    this.channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'SYNC') {
        const remoteOffer: TradeOffer = data.offer;
        if (remoteOffer.player1Name !== this.playerName) {
          this.partnerName = remoteOffer.player1Name;
          this.partnerOffer = remoteOffer.player1OfferedInstanceId;
          this.partnerConfirmed = remoteOffer.player1Confirmed;
        } else if (remoteOffer.player2Name && remoteOffer.player2Name !== this.playerName) {
          this.partnerName = remoteOffer.player2Name;
          this.partnerOffer = remoteOffer.player2OfferedInstanceId;
          this.partnerConfirmed = remoteOffer.player2Confirmed;
        }
        this.checkCompletion();
        this.notify();
      } else if (data && data.type === 'DISCONNECT') {
        this.partnerName = 'Partner Disconnected';
        this.state = 'CONNECTED';
        this.partnerOffer = null;
        this.partnerConfirmed = false;
        this.notify();
      }
    };
  }

  public setOffer(instanceId: string | null) {
    this.myOffer = instanceId;
    this.myConfirmed = false;
    if (this.myOffer) {
      this.state = 'OFFERING';
    } else {
      this.state = 'CONNECTED';
    }
    this.notify();
  }

  public confirmTrade() {
    this.myConfirmed = true;
    this.state = 'WAITING_CONFIRMATION';
    this.checkCompletion();
    this.notify();
  }

  private checkCompletion() {
    if (this.myConfirmed && this.partnerConfirmed) {
      this.state = 'TRADE_COMPLETE';
    }
  }

  public resetForNextTrade() {
    this.myOffer = null;
    this.partnerOffer = null;
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    this.state = 'CONNECTED';
    this.notify();
  }

  public disconnect() {
    if (this.channel) {
      this.channel.postMessage({ type: 'DISCONNECT' });
      this.channel.close();
      this.channel = null;
    }
    this.roomId = '';
    this.state = 'DISCONNECTED';
    this.partnerName = 'Waiting for partner...';
    this.myOffer = null;
    this.partnerOffer = null;
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    this.notify();
  }
}

export const multiplayerManager = new MultiplayerTradeManager();
