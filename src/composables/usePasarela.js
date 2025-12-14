import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const PASARELA_URL = import.meta.env.VITE_PASARELA_URL || 'http://localhost:5000';

export function usePasarela(userId) {
  const connected = ref(false);
  const identified = ref(false);
  const socket = ref(null);
  const listeners = new Map();

  const connect = () => {
    return new Promise((resolve, reject) => {
      socket.value = io(`${PASARELA_URL}/pasarela`, {
        transports: ['websocket', 'polling']
      });

      socket.value.on('connect', () => {
        console.log('[Pasarela] Conectado:', socket.value.id);
        connected.value = true;
        
        if (userId) {
          socket.value.emit('identificar', userId, (ok) => {
            identified.value = ok;
            console.log('[Pasarela] Identificado:', userId);
          });
        }
        resolve();
      });

      socket.value.on('disconnect', (reason) => {
        console.log('[Pasarela] Desconectado:', reason);
        connected.value = false;
        identified.value = false;
      });

      socket.value.on('connect_error', (error) => {
        console.error('[Pasarela] Error:', error.message);
        reject(error);
      });

      socket.value.on('pasarela', (data) => {
        listeners.forEach(callback => callback(data));
      });

      socket.value.on('notificar', (data) => {
        listeners.forEach((callback, key) => {
          if (key.startsWith('notificar:')) callback(data);
        });
      });
    });
  };

  const enviar = (data, destino = 'nosotros') => {
    if (socket.value) {
      socket.value.emit('pasarela', { ...data, destino });
    }
  };

  const enviarATodos = (data) => enviar(data, 'nosotros');
  const enviarAOtros = (data) => enviar(data, 'ustedes');
  const enviarAMi = (data) => enviar(data, 'yo');

  const onMensaje = (callback) => {
    const key = `mensaje:${Date.now()}:${Math.random()}`;
    listeners.set(key, callback);
    return () => listeners.delete(key);
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
    }
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    connected,
    identified,
    connect,
    enviar,
    enviarATodos,
    enviarAOtros,
    enviarAMi,
    onMensaje,
    disconnect,
    socket
  };
}

