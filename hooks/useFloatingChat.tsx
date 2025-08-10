"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

type SessionType = "consultation_prep" | "clinical_support" | "medication_education" | "emergency_triage" | "general";

interface FloatingChatContextType {
  isVisible: boolean;
  sessionType: SessionType;
  showChat: (type?: SessionType) => void;
  hideChat: () => void;
  toggleChat: () => void;
  setSessionType: (type: SessionType) => void;
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(undefined);

interface FloatingChatProviderProps {
  children: ReactNode;
}

export function FloatingChatProvider({ children }: FloatingChatProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("general");

  const showChat = (type: SessionType = "general") => {
    setSessionType(type);
    setIsVisible(true);
  };

  const hideChat = () => {
    setIsVisible(false);
  };

  const toggleChat = () => {
    setIsVisible(!isVisible);
  };

  const contextValue = useMemo(
    () => ({
      isVisible,
      sessionType,
      showChat,
      hideChat,
      toggleChat,
      setSessionType,
    }),
    [isVisible, sessionType]
  );

  return <FloatingChatContext.Provider value={contextValue}>{children}</FloatingChatContext.Provider>;
}

export function useFloatingChat() {
  const context = useContext(FloatingChatContext);
  if (context === undefined) {
    throw new Error("useFloatingChat must be used within a FloatingChatProvider");
  }
  return context;
}
