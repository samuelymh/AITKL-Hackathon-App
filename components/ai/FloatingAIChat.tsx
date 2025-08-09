"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
}

export default function FloatingAIChat({ sessionType = "general" }: Readonly<FloatingAIChatProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user, token } = useAuth();

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
    return `Hi ${name}! How can I help you today?`;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Check if user is authenticated
    if (!user || !token) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Please log in to chat with the AI assistant.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

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
          ...(token && { Authorization: `Bearer ${token}` }),
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
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.");
        } else if (response.status === 403) {
          throw new Error("Access denied. You don't have permission to use the AI chat.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error("Failed to get AI response");
        }
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          emergencyDetected: data.emergencyDetected,
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
        content:
          error instanceof Error
            ? error.message
            : "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
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
    return "bottom-6 right-6";
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Minimalistic Floating Action Button
  const renderFAB = () => (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={toggleChat}
        className="rounded-full w-14 h-14 bg-gray-900 hover:bg-gray-800 shadow-lg border-0 transition-all duration-200"
        size="lg"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Button>
    </div>
  );

  // Minimalistic Chat Modal
  const renderChatModal = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/10 backdrop-blur-sm cursor-default"
        onClick={() => setIsOpen(false)}
        aria-label="Close chat"
      />

      {/* Chat Container */}
      <div className="relative">
        <Card className="w-80 h-[480px] shadow-xl border border-gray-200 overflow-hidden">
          <CardHeader className="p-3 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium text-sm text-gray-900">AI Assistant</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-[420px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      msg.role === "user" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
                    } ${msg.emergencyDetected ? "border border-red-500" : ""}`}
                  >
                    {msg.emergencyDetected && (
                      <div className="text-red-600 font-medium text-xs mb-1">Emergency detected</div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex space-x-2">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[36px] max-h-[72px] resize-none text-sm border-gray-200 focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                  className="self-end h-9 w-9 bg-gray-900 hover:bg-gray-800 border-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {sessionType === "emergency_triage" && (
                <div className="mt-2 text-xs text-red-600">For emergencies, call 911 immediately</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!isOpen) {
    return renderFAB();
  }

  return (
    <>
      {renderFAB()}
      {renderChatModal()}
    </>
  );
}
