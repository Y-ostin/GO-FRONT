import { useEffect, useRef, useState } from 'react';
import mqtt, { type MqttClient } from 'mqtt';

export type MqttState = 'connecting' | 'connected' | 'error';

interface UseMqttOptions {
  /** Topic a suscribir, p.ej. 'ccip/dashboard' */
  topic: string;
  /** Callback que recibe el payload del mensaje como string */
  onMessage: (payload: string) => void;
}

/**
 * Hook que gestiona la conexión MQTT a EMQX Cloud con reconexión automática.
 *
 * Mejoras respecto a la implementación inline anterior:
 *   - keepalive: 30s  → detecta caídas más rápido que el default de 60s
 *   - connectTimeout: 4000ms → no bloquear cada intento de reconexión
 *   - reconnectPeriod: 3000ms → reintentar cada 3s (antes 5s)
 *   - evento 'offline' → re-establece estado 'connecting' para que la UI
 *     refleje que se está intentando reconectar
 *   - onMessage se almacena en ref → evita stale closures sin recrear el cliente
 */
export function useMqtt({ topic, onMessage }: UseMqttOptions) {
  const [mqttState, setMqttState] = useState<MqttState>('connecting');
  const [mqttMsg,   setMqttMsg]   = useState('');
  const [mqttCount, setMqttCount] = useState(0);
  const clientRef    = useRef<MqttClient | null>(null);
  const onMessageRef = useRef(onMessage);

  // Siempre apunta a la última versión de la función sin recrear el cliente
  onMessageRef.current = onMessage;

  useEffect(() => {
    const url  = import.meta.env.VITE_MQTT_URL  || 'wss://s9a612f1.ala.eu-central-1.emqxsl.com:8084/mqtt';
    const user = import.meta.env.VITE_MQTT_USER || 'ccip-admin';
    const pass = import.meta.env.VITE_MQTT_PASS || '12345678';

    const client = mqtt.connect(url, {
      clientId:         'ccip-dash-' + Math.random().toString(36).substring(2, 10),
      username:         user,
      password:         pass,
      clean:            true,
      keepalive:        30,      // ping al broker cada 30s (evita que el servidor cierre conexiones idle)
      connectTimeout:   4000,    // timeout por intento de conexión
      reconnectPeriod:  3000,    // reintentar cada 3s al perder conexión
      rejectUnauthorized: false, // necesario para WSS con cert de EMQX Cloud
    });

    clientRef.current = client;

    // ── Conexión exitosa (inicial o tras reconexión) ──────────────────────
    client.on('connect', () => {
      setMqttState('connected');
      setMqttMsg('');
      client.subscribe(topic, err => {
        if (err) console.error('[useMqtt] subscribe error:', err);
      });
    });

    // ── Inicio de intento de reconexión ───────────────────────────────────
    // 'reconnect' se dispara cada vez que mqtt.js INTENTA reconectar
    client.on('reconnect', () => {
      setMqttState('connecting');
      setMqttMsg('Reconectando…');
    });

    // ── Conexión cerrada (el broker se cayó o el cliente se desconectó) ───
    // mqtt.js reintentará automáticamente con el período configurado arriba
    client.on('close', () => {
      setMqttState('error');
      setMqttMsg('Desconectado');
    });

    // ── Error de transporte (TLS, DNS, etc.) ──────────────────────────────
    client.on('error', (e) => {
      setMqttState('error');
      setMqttMsg(e.message.substring(0, 40));
    });

    // ── Cliente sin conexión a red ────────────────────────────────────────
    // También dispara el ciclo de reconexión de mqtt.js
    client.on('offline', () => {
      setMqttState('connecting');
    });

    // ── Mensaje recibido ──────────────────────────────────────────────────
    client.on('message', (_topic, payload) => {
      setMqttCount(c => c + 1);
      onMessageRef.current(payload.toString());
    });

    return () => {
      // true = forzar cierre inmediato sin esperar DISCONNECT MQTT
      client.end(true);
    };
  }, [topic]); // solo se recrea si cambia el topic

  return { mqttState, mqttMsg, mqttCount, clientRef };
}
