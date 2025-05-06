import { Button } from "@/components/ui/button";

/**
 * Componente removido conforme solicitado
 */
function ConversationView() {
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-100 rounded-full mb-4">
          <span className="text-neutral-400 text-3xl">🔒</span>
        </div>
        <h3 className="text-xl font-medium text-neutral-800 mb-2">Componente Removido</h3>
        <p className="text-sm text-neutral-500 max-w-sm">
          Este componente de visualização de conversas foi removido conforme solicitado.
        </p>
      </div>
    </div>
  );
}

export default ConversationView;