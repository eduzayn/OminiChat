import { createContext, useContext, useState, ReactNode } from "react";
import { Conversation } from "@shared/schema";

interface ConversationContextType {
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  return (
    <ConversationContext.Provider value={{ activeConversation, setActiveConversation }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}
