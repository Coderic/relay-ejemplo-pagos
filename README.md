# 💳 PasaPay - Pagos P2P en Tiempo Real

Sistema de pagos P2P estilo Nequi construido con **Vue.js 3** y **[Relay Gateway](https://github.com/Coderic/Relay)**.

![Vue](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Relay](https://img.shields.io/badge/Relay-Gateway-blueviolet)

## 📖 Sobre este Ejemplo

**PasaPay** es un ejemplo funcional que demuestra cómo construir un sistema de pagos peer-to-peer (P2P) en tiempo real, similar a aplicaciones como Nequi o Venmo. Este ejemplo muestra:

- 💸 **Transferencias P2P** - Envío y recepción de pagos entre usuarios
- ⚡ **Actualización en tiempo real** - Los saldos y transacciones se sincronizan instantáneamente
- 🔔 **Notificaciones** - Alertas cuando recibes un pago o se completa una transacción
- 📊 **Historial de transacciones** - Registro completo de movimientos

Este ejemplo pertenece a la colección de ejemplos de **[Relay Gateway](https://github.com/Coderic/Relay)**, un gateway de comunicación en tiempo real diseñado para ser inmutable y agnóstico.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ o Docker
- Relay Gateway ejecutándose (ver [documentación de Relay](https://relay.coderic.net))

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Coderic/pagos.git
cd pagos

# Instalar dependencias
npm install
```

### Configuración

Asegúrate de tener Relay Gateway ejecutándose. Puedes usar el endpoint público para pruebas:

```javascript
// En tu código, el conector se conecta a:
const relay = new RelayConector('http://demo.relay.coderic.net');
```

O ejecuta Relay localmente:

```bash
# Opción 1: Con npx (recomendado para pruebas)
npx @coderic/relay

# Opción 2: Con Docker Compose
docker compose up -d
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

Abre tu navegador en `http://localhost:5173` (o el puerto que Vite asigne).

### Producción

```bash
# Construir para producción
npm run build

# Los archivos estarán en la carpeta dist/
```

## 🎯 Uso

1. **Abrir múltiples pestañas** para simular diferentes usuarios
2. **Identificarse** con un nombre de usuario único
3. **Enviar pagos** a otros usuarios conectados
4. **Observar** cómo los saldos se actualizan en tiempo real en todas las pestañas

## 🔗 Enlaces

- 📦 [Repositorio](https://github.com/Coderic/pagos)
- 🐛 [Issues](https://github.com/Coderic/pagos/issues)
- 🌐 [Demo en línea](https://coderic.org/pagos/)
- 📚 [Documentación de Relay](https://relay.coderic.net)
- ⚡ [Relay Gateway](https://github.com/Coderic/Relay)

## 🛠️ Tecnologías

- **Vue.js 3** - Framework JavaScript progresivo
- **Vite** - Build tool y dev server
- **Relay Gateway** - Gateway de comunicación en tiempo real
- **Socket.io** - Comunicación WebSocket

## 📝 Licencia

MIT
