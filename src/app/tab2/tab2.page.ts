import { Component, OnInit, OnDestroy } from '@angular/core';
import { RelayService, RelayMessage } from '../services/relay.service';
import { Subscription } from 'rxjs';

interface PagoRecibido {
  id: string;
  origen: string;
  monto: number;
  concepto: string;
  timestamp: number;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  connected = false;
  montoSolicitado = 0;
  concepto = '';
  qrCode = '';
  pagosRecibidos: PagoRecibido[] = [];
  mostrarQR = false;
  
  private subscriptions = new Subscription();

  constructor(private relay: RelayService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.relay.connected$.subscribe(connected => {
        this.connected = connected;
        if (connected) {
          this.actualizarQR();
        }
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
      case 'pago_enviado':
        if (msg['destino'] === this.relay.getSessionIdValue() || 
            msg['destino'] === 'QR_' + this.relay.getSessionIdValue()) {
          const pago: PagoRecibido = {
            id: msg['id'] || Date.now().toString(),
            origen: msg['origen'] || 'Usuario',
            monto: msg['monto'] || 0,
            concepto: msg['concepto'] || 'Pago',
            timestamp: Date.now(),
            estado: 'pendiente'
          };
          this.pagosRecibidos.unshift(pago);
        }
        break;
    }
  }

  actualizarQR() {
    // Generar código QR con el ID de sesión
    this.qrCode = this.relay.getSessionIdValue();
  }

  solicitarPago() {
    if (!this.montoSolicitado || this.montoSolicitado <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    // Enviar solicitud de pago
    this.relay.enviarATodos({
      tipo: 'solicitud_pago',
      destino: this.relay.getSessionIdValue(),
      monto: this.montoSolicitado,
      concepto: this.concepto || 'Solicitud de pago',
      timestamp: Date.now()
    });

    this.montoSolicitado = 0;
    this.concepto = '';
  }

  aceptarPago(pago: PagoRecibido) {
    pago.estado = 'aceptado';
    
    // Confirmar pago recibido
    this.relay.enviarATodos({
      tipo: 'pago_recibido',
      id: pago.id,
      origen: pago.origen,
      destino: this.relay.getSessionIdValue(),
      monto: pago.monto,
      concepto: pago.concepto,
      timestamp: Date.now()
    });
  }

  rechazarPago(pago: PagoRecibido) {
    pago.estado = 'rechazado';
    
    // Notificar rechazo
    this.relay.enviarATodos({
      tipo: 'pago_rechazado',
      id: pago.id,
      origen: pago.origen,
      destino: this.relay.getSessionIdValue(),
      timestamp: Date.now()
    });
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
