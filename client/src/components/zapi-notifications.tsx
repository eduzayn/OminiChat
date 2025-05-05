import { useZAPINotifications } from "@/hooks/use-zapi-notifications";

/**
 * Componente que lida com notificações Z-API
 * Este componente não renderiza nada, apenas gerencia as notificações
 */
export function ZAPINotifications() {
  // Usar o hook que lida com as notificações
  useZAPINotifications();
  
  // Este componente não renderiza nada visualmente
  return null;
}