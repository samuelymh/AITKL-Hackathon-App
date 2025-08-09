import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Bot, User, Loader2, AlertTriangle, Shield, Clock, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for the chat interface
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
    confidence?: number;
    modelUsed?: string;
  };
  isError?: boolean;
  isTyping?: boolean;
}

export interface ChatSession {
  sessionId: string;
  type: "consultation_prep" | "clinical_support" | "medication_education" | "emergency_triage" | "general";
  messages: ChatMessage[];
  context?: {
    patientId?: string;
    practitionerId?: string;
    organizationId?: string;
    encounterId?: string;
  };
}

export interface AIChatProps {
  // Core configuration
  sessionType: ChatSession["type"];
  title?: string;
  subtitle?: string;
  placeholder?: string;

  // Context and authentication
  context?: ChatSession["context"];
  userRole?: "patient" | "doctor" | "pharmacist" | "admin";

  // Behavior configuration
  maxMessages?: number;
  enableHistory?: boolean;
  enableExport?: boolean;
  autoSuggestQuestions?: boolean;

  // Styling
  height?: string;
  className?: string;
  variant?: "default" | "compact" | "fullscreen";

  // Event handlers
  onMessageSent?: (message: string, context?: any) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, summary?: any) => void;
  onEmergencyDetected?: (message: string, context?: any) => void;

  // API configuration
  apiEndpoint?: string;
  customHeaders?: Record<string, string>;
}

const AIChat: React.FC<AIChatProps> = ({
  sessionType,
  title,
  subtitle,
  placeholder = "Type your message...",
  context,
  userRole = "patient",
  maxMessages = 50,
  enableHistory = true,
  enableExport = false,
  autoSuggestQuestions = true,
  height = "400px",
  className,
  variant = "default",
  onMessageSent,
  onSessionStart,
  onSessionEnd,
  onEmergencyDetected,
  apiEndpoint = "/api/ai/chat",
  customHeaders = {},
}) => {
  // State management
  const [session, setSession] = useState<ChatSession>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: sessionType,
    messages: [],
    context,
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showDisclaimers, setShowDisclaimers] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  // Initialize session
  useEffect(() => {
    if (onSessionStart) {
      onSessionStart(session.sessionId);
    }

    // Add welcome message based on session type
    const welcomeMessage = getWelcomeMessage(sessionType, userRole);
    if (welcomeMessage) {
      addMessage({
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      });
    }
  }, []);

  // Helper function to get welcome message
  const getWelcomeMessage = (type: ChatSession["type"], role: string): string => {
    const messages = {
      consultation_prep:
        "Hello! I'm here to help you prepare for your upcoming consultation. Tell me about your symptoms or concerns, and I'll help you get ready for your appointment.",
      clinical_support:
        "Hello Doctor! I'm here to provide clinical decision support. Share patient information or clinical questions, and I'll provide evidence-based insights.",
      medication_education:
        "Hi! I can help you understand your medications, including how they work, side effects, and interactions. What would you like to know?",
      emergency_triage:
        "⚠️ If this is a medical emergency, please call 911 immediately. I can help assess non-emergency symptoms and guide you to appropriate care.",
      general: "Hello! I'm your AI health assistant. How can I help you today?",
    };

    return messages[type] || messages.general;
  };

  // Add message to session
  const addMessage = (message: ChatMessage) => {
    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages.slice(-maxMessages + 1), message],
    }));
  };

  // Handle sending messages
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message
    addMessage(userMessage);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    // Call event handler
    if (onMessageSent) {
      onMessageSent(content, context);
    }

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add typing indicator
      const typingMessage: ChatMessage = {
        id: `typing_${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isTyping: true,
      };
      addMessage(typingMessage);

      // Prepare request
      const requestBody = {
        sessionId: session.sessionId,
        message: content,
        sessionType: sessionType,
        context: context,
        userRole: userRole,
        conversationHistory: session.messages.slice(-5), // Last 5 messages for context
      };

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Remove typing indicator
      setSession((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => !msg.isTyping),
      }));

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.data.response,
          timestamp: new Date(),
          metadata: data.metadata,
        };

        addMessage(assistantMessage);

        // Check for emergency scenarios
        if (data.data.emergencyDetected && onEmergencyDetected) {
          onEmergencyDetected(content, data.data.emergencyContext);
        }

        // Update connection status
        setIsConnected(true);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    } catch (error: any) {
      // Remove typing indicator
      setSession((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => !msg.isTyping),
      }));

      if (error.name === "AbortError") {
        return; // Request was cancelled
      }

      console.error("AI Chat Error:", error);
      setError(error.message || "Something went wrong. Please try again.");
      setIsConnected(false);

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
        timestamp: new Date(),
        isError: true,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  // Render message component
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";
    const isTyping = message.isTyping;
    const isError = message.isError;

    return (
      <div key={message.id} className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-medium",
              isError ? "bg-red-500" : "bg-blue-500"
            )}
          >
            {isError ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        )}

        <div
          className={cn(
            "max-w-[80%] rounded-lg px-4 py-2 text-sm",
            isUser
              ? "bg-blue-500 text-white"
              : isError
                ? "bg-red-50 text-red-900 border border-red-200"
                : "bg-gray-100 text-gray-900"
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-500">AI is thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}

          {message.metadata && !isTyping && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center gap-2 flex-wrap">
                {message.metadata.responseTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {message.metadata.responseTime}ms
                  </span>
                )}
                {message.metadata.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(message.metadata.confidence * 100)}% confident
                  </Badge>
                )}
                {message.metadata.modelUsed && (
                  <Badge variant="outline" className="text-xs">
                    {message.metadata.modelUsed}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {isUser && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-xs font-medium">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  };

  // Render disclaimers
  const renderDisclaimers = () => {
    if (!showDisclaimers) return null;

    return (
      <Alert className="mb-4 border-amber-200 bg-amber-50">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <strong>Medical Disclaimer:</strong> This AI assistant provides educational information only and does not
              replace professional medical advice. Always consult with qualified healthcare providers for medical
              decisions.
              {sessionType === "emergency_triage" && (
                <div className="mt-2 font-semibold text-red-600">⚠️ For medical emergencies, call 911 immediately.</div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisclaimers(false)}
              className="h-auto p-1 text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Suggested questions based on session type
  const getSuggestedQuestions = () => {
    const suggestions = {
      consultation_prep: [
        "What questions should I ask my doctor?",
        "What tests might be recommended?",
        "How should I describe my symptoms?",
      ],
      clinical_support: [
        "What are the differential diagnoses?",
        "What tests should I order?",
        "Are there any drug interactions?",
      ],
      medication_education: [
        "How does this medication work?",
        "What side effects should I watch for?",
        "When should I take this medication?",
      ],
      emergency_triage: [
        "How severe are these symptoms?",
        "Should I go to the emergency room?",
        "What should I do right now?",
      ],
    };

    return suggestions[sessionType] || [];
  };

  const suggestedQuestions = autoSuggestQuestions ? getSuggestedQuestions() : [];

  return (
    <Card className={cn("flex flex-col", className)}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5" />
              {title || "AI Health Assistant"}
            </CardTitle>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pb-4">
        {/* Disclaimers */}
        {renderDisclaimers()}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" style={{ height: variant === "compact" ? "300px" : height }}>
          <div className="space-y-4">
            {session.messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && session.messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => sendMessage(question)}
                  disabled={isLoading}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(inputMessage)}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
            className="px-3"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Session Info */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{session.messages.filter((m) => !m.isTyping).length} messages</span>
          <span>Session: {session.sessionId.slice(-8)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;
