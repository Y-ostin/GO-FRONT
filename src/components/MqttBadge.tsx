import type { MqttState } from '../hooks/useMqtt';

interface MqttBadgeProps {
  state: MqttState;
  msg: string;
}

/**
 * Indicador visual del estado de la conexión MQTT.
 * Muestra un punto pulsante + texto de estado.
 */
export function MqttBadge({ state, msg }: MqttBadgeProps) {
  const dotCls =
    state === 'connected'  ? 'w-2 h-2 rounded-full bg-emerald-400 inline-block dot-pulse' :
    state === 'connecting' ? 'w-2 h-2 rounded-full bg-amber-400  inline-block dot-pulse' :
                             'w-2 h-2 rounded-full bg-rose-500   inline-block';

  const lblCls =
    state === 'connected'  ? 'text-emerald-400 text-xs' :
    state === 'connecting' ? 'text-amber-400   text-xs' :
                             'text-rose-400    text-xs';

  const lblText =
    state === 'connected'  ? 'MQTT activo' :
    state === 'connecting' ? (msg || 'Conectando…') :
                             (msg || 'Error MQTT');

  return (
    <div className="flex items-center gap-1.5">
      <span className={dotCls} />
      <span className={lblCls}>{lblText}</span>
    </div>
  );
}
