import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Types
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
  createdAt: Date;
  updatedAt: Date;
}

export interface UseAIChatOptions {
  sessionType: ChatSession["type"];
  context?: ChatSession["context"];
  apiEndpoint?: string;
  autoSave?: boolean;
  maxMessages?: number;
}

export interface UseAIChatReturn {
  // Session state
  session: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;

  // Session management
  startNewSession: () => void;
  endSession: () => void;

  // Utilities
  exportChat: () => string;
  getSessionSummary: () => string;
}

export const useAIChat = (options: UseAIChatOptions): UseAIChatReturn => {
  const { sessionType, context, apiEndpoint = "/api/ai/chat", autoSave = true, maxMessages = 50 } = options;

  const { user, token } = useAuth();

  // State
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");

  // Generate new session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Start new session
  const startNewSession = useCallback(() => {
    const newSession: ChatSession = {
      sessionId: generateSessionId(),
      type: sessionType,
      messages: [],
      context: context,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSession(newSession);
    setError(null);

    // Add welcome message
    const welcomeMessage = getWelcomeMessage(sessionType);
    if (welcomeMessage) {
      const message: ChatMessage = {
        id: `welcome_${Date.now()}`,
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date(),
      };

      setSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [message],
              updatedAt: new Date(),
            }
          : null
      );
    }
  }, [sessionType, context, generateSessionId]);

  // Helper to get welcome message
  const getWelcomeMessage = (type: ChatSession["type"]): string => {
    const messages = {
      consultation_prep:
        "Hello! I'm here to help you prepare for your upcoming consultation. Tell me about your symptoms or concerns.",
      clinical_support:
        "Hello! I'm here to provide clinical decision support. Share patient information or clinical questions for evidence-based insights.",
      medication_education:
        "Hi! I can help you understand medications, including how they work, side effects, and interactions.",
      emergency_triage:
        "⚠️ If this is a medical emergency, please call 911 immediately. I can help assess non-emergency symptoms.",
      general: "Hello! I'm your AI health assistant. How can I help you today?",
    };

    return messages[type] || messages.general;
  };

  // Add message to session
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setSession((prev) => {
        if (!prev) return null;

        const updatedMessages = [...prev.messages, message].slice(-maxMessages);
        const updatedSession = {
          ...prev,
          messages: updatedMessages,
          updatedAt: new Date(),
        };

        // Auto-save if enabled
        if (autoSave) {
          saveSessionToStorage(updatedSession);
        }

        return updatedSession;
      });
    },
    [maxMessages, autoSave]
  );

  // Save session to localStorage
  const saveSessionToStorage = useCallback((sessionData: ChatSession) => {
    try {
      const savedSessions = JSON.parse(localStorage.getItem("ai_chat_sessions") || "[]");
      const existingIndex = savedSessions.findIndex((s: ChatSession) => s.sessionId === sessionData.sessionId);

      if (existingIndex >= 0) {
        savedSessions[existingIndex] = sessionData;
      } else {
        savedSessions.push(sessionData);
      }

      // Keep only last 10 sessions
      const recentSessions = savedSessions.slice(-10);
      localStorage.setItem("ai_chat_sessions", JSON.stringify(recentSessions));
    } catch (error) {
      console.warn("Failed to save session to localStorage:", error);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !session) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Store last user message for retry functionality
      lastUserMessageRef.current = content.trim();

      // Add user message immediately
      addMessage(userMessage);
      setIsLoading(true);
      setError(null);

      try {
        // Cancel any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
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
          message: content.trim(),
          sessionType: sessionType,
          context: context,
          userRole: user?.role || "patient",
          conversationHistory: session.messages.slice(-5), // Last 5 messages for context
        };

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Remove typing indicator
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.filter((msg) => !msg.isTyping),
            updatedAt: new Date(),
          };
        });

        if (data.success) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: data.data.response,
            timestamp: new Date(),
            metadata: data.metadata,
          };

          addMessage(assistantMessage);
          setIsConnected(true);

          // Handle emergency detection
          if (data.data.emergencyDetected) {
            console.warn("Emergency scenario detected:", data.data.emergencyContext);
            // Could trigger emergency protocols here
          }
        } else {
          throw new Error(data.error || "Failed to get AI response");
        }
      } catch (error: any) {
        // Remove typing indicator
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.filter((msg) => !msg.isTyping),
            updatedAt: new Date(),
          };
        });

        if (error.name === "AbortError") {
          return; // Request was cancelled
        }

        console.error("AI Chat Error:", error);
        const errorMessage = error.message || "Something went wrong. Please try again.";
        setError(errorMessage);
        setIsConnected(false);

        // Add error message
        const errorChatMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
          timestamp: new Date(),
          isError: true,
        };
        addMessage(errorChatMessage);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [session, isLoading, addMessage, sessionType, context, user, token, apiEndpoint]
  );

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  // Clear chat
  const clearChat = useCallback(() => {
    if (session) {
      setSession({
        ...session,
        messages: [],
        updatedAt: new Date(),
      });
    }
    setError(null);
  }, [session]);

  // Save session
  const saveSession = useCallback(async () => {
    if (!session || !user) return;

    try {
      const response = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          sessionData: session,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save session");
      }

      console.log("Session saved successfully");
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, [session, user, token]);

  // Load session
  const loadSession = useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch(`/api/ai/sessions/${sessionId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load session");
        }

        const data = await response.json();
        if (data.success) {
          setSession(data.data);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        setError("Failed to load session");
      }
    },
    [token]
  );

  // End session
  const endSession = useCallback(() => {
    if (session && autoSave) {
      saveSession();
    }
    setSession(null);
    setError(null);
  }, [session, autoSave, saveSession]);

  // Export chat
  const exportChat = useCallback((): string => {
    if (!session) return "";

    const chatData = {
      sessionId: session.sessionId,
      type: session.type,
      createdAt: session.createdAt,
      messages: session.messages.filter((msg) => !msg.isTyping && !msg.isError),
    };

    return JSON.stringify(chatData, null, 2);
  }, [session]);

  // Get session summary
  const getSessionSummary = useCallback((): string => {
    if (!session || session.messages.length === 0) return "";

    const messageCount = session.messages.filter((msg) => !msg.isTyping && !msg.isError).length;
    const userMessages = session.messages.filter((msg) => msg.role === "user").length;
    const assistantMessages = session.messages.filter((msg) => msg.role === "assistant" && !msg.isError).length;

    return `Session: ${session.sessionId} | Type: ${session.type} | Messages: ${messageCount} (${userMessages} user, ${assistantMessages} AI)`;
  }, [session]);

  // Initialize session on mount
  React.useEffect(() => {
    if (!session) {
      startNewSession();
    }
  }, []);

  return {
    // Session state
    session,
    messages: session?.messages || [],
    isLoading,
    error,
    isConnected,

    // Actions
    sendMessage,
    clearChat,
    saveSession,
    loadSession,
    retryLastMessage,

    // Session management
    startNewSession,
    endSession,

    // Utilities
    exportChat,
    getSessionSummary,
  };
};
