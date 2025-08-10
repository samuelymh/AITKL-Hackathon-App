"use client";

import { useFloatingChat } from "@/hooks/useFloatingChat";
import FloatingAIChat from "@/components/ai/FloatingAIChat";

export default function GlobalFloatingChat() {
  const { sessionType, hideChat } = useFloatingChat();

  return <FloatingAIChat sessionType={sessionType} position="bottom-right" defaultOpen={true} onClose={hideChat} />;
}
