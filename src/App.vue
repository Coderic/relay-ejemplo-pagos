<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePasarela } from './composables/usePasarela';

// Generar usuario con número de teléfono simulado
const getUser = () => {
  let user = localStorage.getItem('pagoUser');
  if (!user) {
    user = JSON.stringify({
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      telefono: '3' + Math.floor(100000000 + Math.random() * 900000000),
      nombre: 'Usuario ' + Math.floor(Math.random() * 1000),
      saldo: 500000 + Math.floor(Math.random() * 500000)
    });
    localStorage.setItem('pagoUser', user);
  }
  return JSON.parse(user);
};

const usuario = ref(getUser());
const { connected, connect, enviarATodos, onMensaje } = usePasarela(usuario.value.id);

// Estado
const vista = ref('home'); // home, enviar, recibir, historial
const destinatario = ref('');
const monto = ref('');
const mensaje = ref('');
const transacciones = ref([]);
const usuariosOnline = ref(new Map());
const solicitudesPago = ref([]);
const logs = ref([]);

// Formatear moneda
const formatMoney = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
};

// Guardar usuario
const guardarUsuario = () => {
  localStorage.setItem('pagoUser', JSON.stringify(usuario.value));
};

// Agregar log
const addLog = (msg) => {
  logs.value = [{ time: new Date().toLocaleTimeString('es'), msg }, ...logs.value].slice(0, 15);
};

// Enviar dinero
const enviarDinero = () => {
  const montoNum = parseInt(monto.value);
  if (!destinatario.value || !montoNum || montoNum <= 0) {
    addLog('⚠️ Completa todos los campos');
    return;
  }
  if (montoNum > usuario.value.saldo) {
    addLog('❌ Saldo insuficiente');
    return;
  }

  const transaccion = {
    id: 'tx_' + Date.now(),
    tipo: 'envio',
    de: usuario.value,
    para: destinatario.value,
    monto: montoNum,
    mensaje: mensaje.value,
    fecha: new Date().toISOString(),
    estado: 'completado'
  };

  // Restar del saldo
  usuario.value.saldo -= montoNum;
  guardarUsuario();

  // Agregar a historial
  transacciones.value = [transaccion, ...transacciones.value];

  // Notificar a todos (el destinatario recibirá)
  enviarATodos({
    tipo: 'transferencia',
    transaccion
  });

  addLog(`✅ Enviaste ${formatMoney(montoNum)} a ${destinatario.value}`);
  
  // Limpiar y volver
  destinatario.value = '';
  monto.value = '';
  mensaje.value = '';
  vista.value = 'home';
};

// Solicitar pago
const solicitarPago = () => {
  const montoNum = parseInt(monto.value);
  if (!destinatario.value || !montoNum) return;

  const solicitud = {
    id: 'sol_' + Date.now(),
    de: usuario.value,
    para: destinatario.value,
    monto: montoNum,
    mensaje: mensaje.value,
    fecha: new Date().toISOString()
  };

  enviarATodos({
    tipo: 'solicitud_pago',
    solicitud
  });

  addLog(`📤 Solicitaste ${formatMoney(montoNum)} a ${destinatario.value}`);
  
  destinatario.value = '';
  monto.value = '';
  mensaje.value = '';
  vista.value = 'home';
};

// Pagar solicitud
const pagarSolicitud = (solicitud) => {
  if (solicitud.monto > usuario.value.saldo) {
    addLog('❌ Saldo insuficiente');
    return;
  }

  usuario.value.saldo -= solicitud.monto;
  guardarUsuario();

  const transaccion = {
    id: 'tx_' + Date.now(),
    tipo: 'envio',
    de: usuario.value,
    para: solicitud.de.telefono,
    monto: solicitud.monto,
    mensaje: `Pago de solicitud: ${solicitud.mensaje}`,
    fecha: new Date().toISOString(),
    estado: 'completado'
  };

  transacciones.value = [transaccion, ...transacciones.value];

  enviarATodos({
    tipo: 'transferencia',
    transaccion,
    solicitudId: solicitud.id
  });

  // Remover solicitud
  solicitudesPago.value = solicitudesPago.value.filter(s => s.id !== solicitud.id);
  addLog(`✅ Pagaste ${formatMoney(solicitud.monto)} a ${solicitud.de.nombre}`);
};

// Rechazar solicitud
const rechazarSolicitud = (solicitud) => {
  solicitudesPago.value = solicitudesPago.value.filter(s => s.id !== solicitud.id);
  addLog(`❌ Rechazaste solicitud de ${solicitud.de.nombre}`);
};

// Agregar monto rápido
const agregarMonto = (valor) => {
  const actual = parseInt(monto.value) || 0;
  monto.value = (actual + valor).toString();
};

onMounted(async () => {
  await connect();
  
  // Anunciar presencia
  enviarATodos({
    tipo: 'usuario_online',
    usuario: usuario.value
  });

  // Escuchar mensajes
  onMensaje((data) => {
    switch (data.tipo) {
      case 'usuario_online':
        if (data.usuario.id !== usuario.value.id) {
          usuariosOnline.value.set(data.usuario.id, data.usuario);
          // Responder con nuestra presencia
          enviarATodos({
            tipo: 'usuario_presencia',
            usuario: usuario.value
          });
        }
        break;

      case 'usuario_presencia':
        if (data.usuario.id !== usuario.value.id) {
          usuariosOnline.value.set(data.usuario.id, data.usuario);
        }
        break;

      case 'usuario_offline':
        usuariosOnline.value.delete(data.usuarioId);
        break;

      case 'transferencia':
        // Si somos el destinatario
        if (data.transaccion.para === usuario.value.telefono) {
          usuario.value.saldo += data.transaccion.monto;
          guardarUsuario();
          
          transacciones.value = [{
            ...data.transaccion,
            tipo: 'recibido'
          }, ...transacciones.value];
          
          addLog(`💰 Recibiste ${formatMoney(data.transaccion.monto)} de ${data.transaccion.de.nombre}`);
        }
        break;

      case 'solicitud_pago':
        // Si somos el destinatario de la solicitud
        if (data.solicitud.para === usuario.value.telefono) {
          solicitudesPago.value = [data.solicitud, ...solicitudesPago.value];
          addLog(`📥 ${data.solicitud.de.nombre} te solicita ${formatMoney(data.solicitud.monto)}`);
        }
        break;
    }
  });

  addLog('🟢 Conectado al sistema de pagos');
});

// Anunciar desconexión
window.addEventListener('beforeunload', () => {
  enviarATodos({
    tipo: 'usuario_offline',
    usuarioId: usuario.value.id
  });
});
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header>
      <div class="user-info">
        <div class="avatar">{{ usuario.nombre.charAt(0) }}</div>
        <div class="details">
          <span class="name">{{ usuario.nombre }}</span>
          <span class="phone">{{ usuario.telefono }}</span>
        </div>
      </div>
      <div :class="['status', { online: connected }]">
        <span class="dot"></span>
      </div>
    </header>

    <!-- Balance -->
    <div class="balance-card">
      <span class="label">Tu saldo disponible</span>
      <span class="amount">{{ formatMoney(usuario.saldo) }}</span>
      <div class="actions">
        <button @click="vista = 'enviar'" class="action-btn">
          <span class="icon">↑</span>
          <span>Enviar</span>
        </button>
        <button @click="vista = 'recibir'" class="action-btn">
          <span class="icon">↓</span>
          <span>Solicitar</span>
        </button>
        <button @click="vista = 'historial'" class="action-btn">
          <span class="icon">☰</span>
          <span>Historial</span>
        </button>
      </div>
    </div>

    <!-- Solicitudes pendientes -->
    <div v-if="solicitudesPago.length > 0" class="solicitudes">
      <h3>📥 Solicitudes de pago</h3>
      <div v-for="sol in solicitudesPago" :key="sol.id" class="solicitud-item">
        <div class="sol-info">
          <span class="sol-nombre">{{ sol.de.nombre }}</span>
          <span class="sol-msg">{{ sol.mensaje || 'Sin mensaje' }}</span>
        </div>
        <span class="sol-monto">{{ formatMoney(sol.monto) }}</span>
        <div class="sol-actions">
          <button @click="pagarSolicitud(sol)" class="btn-pagar">Pagar</button>
          <button @click="rechazarSolicitud(sol)" class="btn-rechazar">✕</button>
        </div>
      </div>
    </div>

    <!-- Vista: Enviar -->
    <div v-if="vista === 'enviar'" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <button @click="vista = 'home'" class="back-btn">←</button>
          <h2>Enviar dinero</h2>
        </div>
        
        <div class="form-group">
          <label>Número de celular</label>
          <input 
            v-model="destinatario" 
            type="tel" 
            placeholder="Ej: 3001234567"
            maxlength="10"
          />
        </div>

        <div class="form-group">
          <label>Monto</label>
          <div class="monto-input">
            <span class="currency">$</span>
            <input 
              v-model="monto" 
              type="number" 
              placeholder="0"
            />
          </div>
          <div class="quick-amounts">
            <button @click="agregarMonto(10000)">+$10K</button>
            <button @click="agregarMonto(20000)">+$20K</button>
            <button @click="agregarMonto(50000)">+$50K</button>
            <button @click="agregarMonto(100000)">+$100K</button>
          </div>
        </div>

        <div class="form-group">
          <label>Mensaje (opcional)</label>
          <input 
            v-model="mensaje" 
            type="text" 
            placeholder="¿Para qué es?"
          />
        </div>

        <button 
          @click="enviarDinero" 
          class="btn-primary"
          :disabled="!destinatario || !monto"
        >
          Enviar {{ monto ? formatMoney(parseInt(monto)) : '' }}
        </button>
      </div>
    </div>

    <!-- Vista: Solicitar -->
    <div v-if="vista === 'recibir'" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <button @click="vista = 'home'" class="back-btn">←</button>
          <h2>Solicitar dinero</h2>
        </div>
        
        <div class="form-group">
          <label>Número de celular</label>
          <input 
            v-model="destinatario" 
            type="tel" 
            placeholder="¿A quién le solicitas?"
            maxlength="10"
          />
        </div>

        <div class="form-group">
          <label>Monto</label>
          <div class="monto-input">
            <span class="currency">$</span>
            <input 
              v-model="monto" 
              type="number" 
              placeholder="0"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Motivo</label>
          <input 
            v-model="mensaje" 
            type="text" 
            placeholder="¿Por qué lo necesitas?"
          />
        </div>

        <button 
          @click="solicitarPago" 
          class="btn-secondary"
          :disabled="!destinatario || !monto"
        >
          Solicitar {{ monto ? formatMoney(parseInt(monto)) : '' }}
        </button>
      </div>
    </div>

    <!-- Vista: Historial -->
    <div v-if="vista === 'historial'" class="modal">
      <div class="modal-content historial">
        <div class="modal-header">
          <button @click="vista = 'home'" class="back-btn">←</button>
          <h2>Historial</h2>
        </div>
        
        <div v-if="transacciones.length === 0" class="empty">
          <span class="icon">📭</span>
          <p>No hay transacciones aún</p>
        </div>

        <div v-else class="transacciones-list">
          <div 
            v-for="tx in transacciones" 
            :key="tx.id" 
            :class="['tx-item', tx.tipo]"
          >
            <div class="tx-icon">
              {{ tx.tipo === 'envio' ? '↑' : '↓' }}
            </div>
            <div class="tx-info">
              <span class="tx-desc">
                {{ tx.tipo === 'envio' ? `Enviaste a ${tx.para}` : `Recibiste de ${tx.de.nombre}` }}
              </span>
              <span class="tx-date">{{ new Date(tx.fecha).toLocaleString('es') }}</span>
            </div>
            <span :class="['tx-monto', tx.tipo]">
              {{ tx.tipo === 'envio' ? '-' : '+' }}{{ formatMoney(tx.monto) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Usuarios online -->
    <div v-if="usuariosOnline.size > 0" class="online-users">
      <h3>🟢 Usuarios conectados</h3>
      <div class="users-list">
        <div 
          v-for="[id, user] in usuariosOnline" 
          :key="id" 
          class="user-chip"
          @click="destinatario = user.telefono; vista = 'enviar'"
        >
          <span class="chip-avatar">{{ user.nombre.charAt(0) }}</span>
          <span>{{ user.nombre }}</span>
        </div>
      </div>
    </div>

    <!-- Actividad -->
    <div class="activity">
      <h3>📋 Actividad en tiempo real</h3>
      <div class="log-list">
        <div v-for="(log, i) in logs" :key="i" class="log-entry">
          <span class="time">{{ log.time }}</span>
          <span>{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #e11d48;
  --primary-dark: #be123c;
  --secondary: #6366f1;
  --success: #10b981;
  --bg: #0f0f0f;
  --card: #1a1a1a;
  --text: #ffffff;
  --text-muted: #a1a1aa;
}

body {
  font-family: 'Nunito', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text);
}

.app {
  max-width: 420px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 2rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
}

.details {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 700;
}

.phone {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.status .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
}

.status.online .dot {
  background: var(--success);
  box-shadow: 0 0 10px var(--success);
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: 24px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 40px rgba(225, 29, 72, 0.3);
}

.balance-card .label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.balance-card .amount {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0.5rem 0 1.5rem;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.action-btn {
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 16px;
  padding: 0.75rem 1.25rem;
  color: white;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255,255,255,0.25);
  transform: translateY(-2px);
}

.action-btn .icon {
  font-size: 1.5rem;
}

.action-btn span:last-child {
  font-size: 0.75rem;
}

/* Solicitudes */
.solicitudes {
  background: var(--card);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.solicitudes h3 {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.solicitud-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.sol-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sol-nombre {
  font-weight: 600;
}

.sol-msg {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.sol-monto {
  font-weight: 700;
  color: var(--primary);
}

.sol-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-pagar {
  background: var(--success);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-rechazar {
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 100;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  max-width: 420px;
  margin: 0 auto;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
}

.modal-header h2 {
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 1rem;
  background: var(--card);
  border: 2px solid transparent;
  border-radius: 12px;
  color: white;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
}

.form-group input:focus {
  border-color: var(--primary);
}

.monto-input {
  display: flex;
  align-items: center;
  background: var(--card);
  border-radius: 12px;
  padding-left: 1rem;
}

.monto-input .currency {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-muted);
}

.monto-input input {
  font-size: 2rem;
  font-weight: 700;
  background: transparent;
  border: none;
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.quick-amounts button {
  flex: 1;
  padding: 0.5rem;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 8px;
  color: white;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.quick-amounts button:hover {
  background: rgba(255,255,255,0.2);
}

.btn-primary {
  width: 100%;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border: none;
  border-radius: 16px;
  color: white;
  font-family: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 1.25rem;
  background: var(--secondary);
  border: none;
  border-radius: 16px;
  color: white;
  font-family: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1rem;
}

/* Historial */
.historial {
  padding-bottom: 2rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
}

.empty .icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.transacciones-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tx-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--card);
  border-radius: 12px;
}

.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.tx-item.envio .tx-icon {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.tx-item.recibido .tx-icon {
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
}

.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tx-desc {
  font-weight: 600;
}

.tx-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.tx-monto {
  font-weight: 700;
}

.tx-monto.envio {
  color: #ef4444;
}

.tx-monto.recibido {
  color: var(--success);
}

/* Usuarios online */
.online-users {
  background: var(--card);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.online-users h3 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
}

.user-chip:hover {
  background: rgba(255,255,255,0.2);
}

.chip-avatar {
  width: 24px;
  height: 24px;
  background: var(--secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
}

/* Activity */
.activity {
  background: var(--card);
  border-radius: 16px;
  padding: 1rem;
}

.activity h3 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--text-muted);
}

.log-list {
  max-height: 150px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 0.85rem;
}

.log-entry .time {
  color: var(--text-muted);
  font-size: 0.75rem;
}
</style>
