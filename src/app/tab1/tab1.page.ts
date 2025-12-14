import { Component, OnInit, OnDestroy } from '@angular/core';
import { RelayService, RelayMessage } from '../services/relay.service';
import { Subscription } from 'rxjs';

interface Transaccion {
  id: string;
  destino: string;
  monto: number;
  concepto: string;
  estado: 'pendiente' | 'procesando' | 'completada' | 'rechazada';
  timestamp: number;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  connected = false;
  saldo = 500000; // Saldo inicial simulado
  monto = 0;
  destino = '';
  concepto = '';
  transacciones: Transaccion[] = [];
  
  private subscriptions = new Subscription();

  constructor(private relay: RelayService) {}

  ngOnInit() {
    this.relay.connect().then(() => {
      this.connected = true;
    }).catch(err => {
      console.error('Error conectando:', err);
    });

    this.subscriptions.add(
      this.relay.connected$.subscribe(connected => {
        this.connected = connected;
      })
    );

    this.subscriptions.add(
      this.relay.messages$.subscribe(msg => {
        if (msg) {
          this.manejarMensaje(msg);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  manejarMensaje(msg: RelayMessage) {
    switch (msg.tipo) {
      case 'pago_recibido':
        if (msg['destino'] === this.relay.getSessionIdValue()) {
          this.saldo += msg['monto'] || 0;
          this.agregarTransaccion({
            id: msg['id'] || Date.now().toString(),
            destino: msg['origen'] || 'Usuario',
            monto: msg['monto'] || 0,
            concepto: msg['concepto'] || 'Pago recibido',
            estado: 'completada',
            timestamp: Date.now()
          });
        }
        break;
      case 'pago_completado':
        if (msg['origen'] === this.relay.getSessionIdValue()) {
          this.saldo -= msg['monto'] || 0;
          const transaccion = this.transacciones.find(t => t.id === msg['id']);
          if (transaccion) {
            transaccion.estado = 'completada';
          }
        }
        break;
      case 'pago_rechazado':
        const transaccionRechazada = this.transacciones.find(t => t.id === msg['id']);
        if (transaccionRechazada) {
          transaccionRechazada.estado = 'rechazada';
        }
        break;
    }
  }

  enviarPago() {
    if (!this.monto || this.monto <= 0) {
      alert('Ingresa un monto válido');
      return;
    }
    if (!this.destino) {
      alert('Ingresa el número de teléfono o ID del destinatario');
      return;
    }
    if (this.monto > this.saldo) {
      alert('Saldo insuficiente');
      return;
    }

    const transaccionId = 'txn_' + Date.now();
    const transaccion: Transaccion = {
      id: transaccionId,
      destino: this.destino,
      monto: this.monto,
      concepto: this.concepto || 'Transferencia',
      estado: 'procesando',
      timestamp: Date.now()
    };

    this.transacciones.unshift(transaccion);

    // Enviar pago a través de Relay
    this.relay.enviarATodos({
      tipo: 'pago_enviado',
      id: transaccionId,
      origen: this.relay.getSessionIdValue(),
      destino: this.destino,
      monto: this.monto,
      concepto: this.concepto || 'Transferencia',
      timestamp: Date.now()
    });

    // Limpiar formulario
    this.monto = 0;
    this.destino = '';
    this.concepto = '';
  }

  agregarTransaccion(transaccion: Transaccion) {
    this.transacciones.unshift(transaccion);
    if (this.transacciones.length > 20) {
      this.transacciones = this.transacciones.slice(0, 20);
    }
  }

  formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  }

  formatearFecha(timestamp: number): string {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diff = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diff / 60000);
    
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    return fecha.toLocaleDateString('es-CO');
  }
}
