import { Component, OnInit, OnDestroy } from '@angular/core';
import { RelayService, RelayMessage } from '../services/relay.service';
import { Subscription } from 'rxjs';

interface Transaccion {
  id: string;
  tipo: 'enviado' | 'recibido';
  contacto: string;
  monto: number;
  concepto: string;
  estado: string;
  timestamp: number;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  connected = false;
  transacciones: Transaccion[] = [];
  filtro: 'todas' | 'enviadas' | 'recibidas' = 'todas';
  
  private subscriptions = new Subscription();

  constructor(private relay: RelayService) {}

  ngOnInit() {
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
      case 'pago_completado':
      case 'pago_recibido':
        this.agregarTransaccion(msg);
        break;
    }
  }

  agregarTransaccion(msg: RelayMessage) {
    const esEnviado = msg['origen'] === this.relay.getSessionIdValue();
    const transaccion: Transaccion = {
      id: msg['id'] || Date.now().toString(),
      tipo: esEnviado ? 'enviado' : 'recibido',
      contacto: esEnviado ? (msg['destino'] || 'Usuario') : (msg['origen'] || 'Usuario'),
      monto: msg['monto'] || 0,
      concepto: msg['concepto'] || 'Transacción',
      estado: 'completada',
      timestamp: msg['timestamp'] || Date.now()
    };
    
    this.transacciones.unshift(transaccion);
    if (this.transacciones.length > 50) {
      this.transacciones = this.transacciones.slice(0, 50);
    }
  }

  getTransaccionesFiltradas(): Transaccion[] {
    if (this.filtro === 'todas') {
      return this.transacciones;
    }
    const tipoFiltro = this.filtro === 'enviadas' ? 'enviado' : 'recibido';
    return this.transacciones.filter(t => t.tipo === tipoFiltro);
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
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
