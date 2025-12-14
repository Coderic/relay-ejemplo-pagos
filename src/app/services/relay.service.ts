import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RelayMessage {
  tipo: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class RelayService {
  private socket: Socket | null = null;
  private readonly RELAY_URL = this.getRelayUrl();
  
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();
  
  private identifiedSubject = new BehaviorSubject<boolean>(false);
  public identified$ = this.identifiedSubject.asObservable();
  
  private messageSubject = new BehaviorSubject<RelayMessage | null>(null);
  public messages$ = this.messageSubject.asObservable();
  
  private sessionId: string;
  
  private getRelayUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:5000';
    }
    if (window.location.hostname === 'localhost' && window.location.port === '8000') {
      return 'http://localhost:5000';
    }
    // Si estamos en coderic.org, usar wss://demo.relay.coderic.net
    if (window.location.hostname === 'coderic.org' || window.location.hostname === 'www.coderic.org') {
      return 'wss://demo.relay.coderic.net';
    }
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  
  constructor() {
    this.sessionId = this.getSessionId();
  }
  
  private getSessionId(): string {
    let id = localStorage.getItem('pagosSession');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('pagosSession', id);
    }
    return id;
  }
  
  getSessionIdValue(): string {
    return this.sessionId;
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.RELAY_URL}/relay`, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[Relay] Conectado:', this.socket?.id);
        this.connectedSubject.next(true);
        
        this.socket?.emit('identificar', this.sessionId, (ok: boolean) => {
          this.identifiedSubject.next(ok);
          console.log('[Relay] Identificado:', this.sessionId);
        });
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Relay] Desconectado:', reason);
        this.connectedSubject.next(false);
        this.identifiedSubject.next(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Relay] Error:', error.message);
        reject(error);
      });

      this.socket.on('relay', (data: RelayMessage) => {
        this.messageSubject.next(data);
      });

      this.socket.on('notificar', (data: RelayMessage) => {
        this.messageSubject.next({ ...data, _channel: 'notificar' });
      });
    });
  }

  enviar(data: RelayMessage, destino: 'yo' | 'ustedes' | 'nosotros' = 'nosotros'): void {
    this.socket?.emit('relay', { ...data, destino });
  }

  enviarATodos(data: RelayMessage): void {
    this.enviar(data, 'nosotros');
  }

  enviarAOtros(data: RelayMessage): void {
    this.enviar(data, 'ustedes');
  }

  enviarAMi(data: RelayMessage): void {
    this.enviar(data, 'yo');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connectedSubject.next(false);
  }
  
  isConnected(): boolean {
    return this.connectedSubject.value;
  }
}

