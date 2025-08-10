"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingChat } from "@/hooks/useFloatingChat";

interface ChatTriggerButtonProps {
  sessionType?: "consultation_prep" | "clinical_support" | "medication_education" | "emergency_triage" | "general";
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "sm" | "default" | "lg";
}

export default function ChatTriggerButton({
  sessionType = "general",
  className = "",
  children,
  variant = "default",
  size = "default",
}: ChatTriggerButtonProps) {
  const { showChat } = useFloatingChat();

  const handleClick = () => {
    showChat(sessionType);
  };

  return (
    <Button onClick={handleClick} variant={variant} size={size} className={`flex items-center space-x-2 ${className}`}>
      <MessageCircle className="w-4 h-4" />
      {children ? <span>{children}</span> : <span>AI Assistant</span>}
    </Button>
  );
}
