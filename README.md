# 💸 PasaPay - Pagos P2P en Tiempo Real

Sistema de pagos P2P estilo Nequi construido con **Vue.js 3** y [Pasarela Gateway](https://github.com/Coderic/Pasarela).

![Vue](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Pasarela](https://img.shields.io/badge/Pasarela-Gateway-blueviolet)

## 🚀 Inicio Rápido

### Prerrequisitos

Pasarela Gateway ejecutándose en `http://localhost:5000`:

```bash
npx pasarela-gateway
```

### Instalación

```bash
git clone https://github.com/Coderic/pasarela-ejemplo-pagos.git
cd pasarela-ejemplo-pagos
npm install
npm run dev
```

Abre http://localhost:5173

## 📖 Características

- **Enviar dinero** - Transferencias instantáneas
- **Solicitar pagos** - Pide dinero a otros usuarios
- **Historial** - Registro de transacciones
- **Usuarios online** - Ve quién está conectado
- **Tiempo real** - Todas las operaciones se sincronizan instantáneamente

## 💻 Composable `usePasarela`

Este ejemplo incluye un composable Vue 3 reutilizable:

```vue
<script setup>
import { usePasarela } from './composables/usePasarela';

const { 
  connected, 
  connect, 
  enviarATodos, 
  onMensaje 
} = usePasarela('mi-usuario-id');

onMounted(async () => {
  await connect();
  
  onMensaje((data) => {
    console.log('Mensaje recibido:', data);
  });
});

const enviar = () => {
  enviarATodos({ tipo: 'saludo', texto: 'Hola!' });
};
</script>
```

## 🎯 Flujo de pagos

```javascript
// Usuario A envía dinero a Usuario B
enviarATodos({
  tipo: 'transferencia',
  transaccion: {
    de: usuarioA,
    para: telefonoB,
    monto: 50000,
    mensaje: 'Para el almuerzo'
  }
});

// Usuario B recibe la notificación en tiempo real
onMensaje((data) => {
  if (data.tipo === 'transferencia' && data.transaccion.para === miTelefono) {
    // ¡Dinero recibido!
    saldo += data.transaccion.monto;
  }
});
```

## 📁 Estructura

```
src/
├── composables/
│   └── usePasarela.js    # Composable Vue para Pasarela
├── App.vue               # Componente principal
└── main.js               # Entry point
```

## 🔗 Enlaces

- [Pasarela Gateway](https://github.com/Coderic/Pasarela)
- [Documentación](https://coderic.github.io/Pasarela/)
- [Otros ejemplos](https://github.com/Coderic?q=pasarela-ejemplo)

## 📄 Licencia

MIT © [Coderic](https://github.com/Coderic)
