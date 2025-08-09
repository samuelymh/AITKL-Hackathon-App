"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  emergencyDetected?: boolean;
}

interface FloatingAIChatProps {
  sessionType?: "consultation_prep" | "clinical_support" | "medication_education" | "emergency_triage" | "general";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  defaultOpen?: boolean;
  onClose?: () => void;
}

export default function FloatingAIChat({
  sessionType = "general",
  position = "bottom-right",
  defaultOpen = false,
  onClose,
}: Readonly<FloatingAIChatProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getGreetingMessage();
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, sessionType, user]);

  const getGreetingMessage = () => {
    const name = user?.firstName || "there";

    switch (sessionType) {
      case "consultation_prep":
        return `Hello ${name}! I'm here to help you prepare for your upcoming consultation. What would you like to discuss?`;
      case "clinical_support":
        return `Hello Dr. ${name}! I'm here to provide clinical decision support. How can I assist you today?`;
      case "medication_education":
        return `Hello ${name}! I can help you understand medications, side effects, and interactions. What would you like to know?`;
      case "emergency_triage":
        return `Hello ${name}! I'm here for urgent health concerns. If this is a medical emergency, please call 911 immediately. How can I help?`;
      default:
        return `Hello ${name}! I'm your AI health assistant. How can I help you today?`;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: `floating-chat-${Date.now()}`,
          message: userMessage.content,
          sessionType,
          userRole: user?.role || "patient",
          conversationHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.response,
          timestamp: new Date(),
          emergencyDetected: data.data.emergencyDetected,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsConnected(true);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsConnected(false);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "bottom-left":
        return "bottom-4 left-4";
      case "top-right":
        return "top-4 right-4";
      case "top-left":
        return "top-4 left-4";
      default:
        return "bottom-4 right-4";
    }
  };

  const getSessionTypeColor = () => {
    switch (sessionType) {
      case "emergency_triage":
        return "bg-red-500 text-white";
      case "clinical_support":
        return "bg-blue-500 text-white";
      case "medication_education":
        return "bg-green-500 text-white";
      case "consultation_prep":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="lg"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <Card className={`w-80 shadow-2xl transition-all duration-300 ${isMinimized ? "h-14" : "h-96"}`}>
        <CardHeader className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium text-sm">AI Health Assistant</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 h-6 w-6 text-white hover:bg-blue-800"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="p-1 h-6 w-6 text-white hover:bg-blue-800"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {!isMinimized && (
            <Badge className={`text-xs ${getSessionTypeColor()} w-fit`}>
              {sessionType.replace("_", " ").toUpperCase()}
            </Badge>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-80">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    } ${msg.emergencyDetected ? "border-2 border-red-500" : ""}`}
                  >
                    {msg.emergencyDetected && (
                      <div className="text-red-600 font-bold text-xs mb-1">🚨 EMERGENCY DETECTED</div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-xs mt-1 opacity-70 ${msg.role === "user" ? "text-blue-100" : "text-gray-500"}`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-2 rounded-lg rounded-bl-none">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-gray-50">
              <div className="flex space-x-2">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 min-h-[40px] max-h-[80px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {sessionType === "emergency_triage" && (
                <div className="mt-2 text-xs text-red-600 font-medium">For emergencies, call 911 immediately</div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
