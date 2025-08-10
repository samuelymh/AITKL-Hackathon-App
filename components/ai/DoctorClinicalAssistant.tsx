"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Brain,
  AlertTriangle,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Clock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

// Markdown renderer component for AI responses
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-code:text-blue-800 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3 mt-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2 mt-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-800 mb-2 mt-3 first:mt-0">{children}</h3>
          ),
          // Custom list styles
          ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 my-2 list-decimal list-inside">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-gray-700 leading-relaxed">
              <span className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></span>
              <span>{children}</span>
            </li>
          ),
          // Custom paragraph styles
          p: ({ children }) => <p className="text-gray-700 leading-relaxed my-2 first:mt-0 last:mb-0">{children}</p>,
          // Custom strong/bold styles
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          // Custom code styles
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-blue-50 text-blue-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
            }
            return <code className={className}>{children}</code>;
          },
          // Custom blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-300 pl-4 py-2 my-3 bg-blue-50 text-gray-700 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Get doctor's display name
const getDoctorDisplayName = (user: any) => {
  if (!user) return "Doctor";
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const title = user.title || "Dr.";

  if (firstName && lastName) {
    return `${title} ${firstName} ${lastName}`;
  } else if (firstName) {
    return `${title} ${firstName}`;
  } else if (user.email) {
    return `${title} ${user.email.split("@")[0]}`;
  }
  return "Doctor";
};

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  clinicalInsights?: ClinicalInsights;
}

interface SafetyAlert {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  priority: number;
}

interface ClinicalRecommendation {
  category: "assessment" | "diagnostic" | "treatment" | "monitoring" | "referral";
  title: string;
  description: string;
  evidence?: string;
  priority: "high" | "medium" | "low";
}

interface CareOptimization {
  type: "gap" | "opportunity" | "efficiency";
  area: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
}

interface TrendAnalysis {
  metric: string;
  trend: "improving" | "stable" | "declining" | "concerning";
  timeframe: string;
  significance: string;
}

interface ClinicalInsights {
  briefing: {
    patientSummary: string;
    keyRiskFactors: string[];
    clinicalSignificance: string;
    presentingConcernAnalysis: string;
  };
  safetyAlerts: SafetyAlert[];
  recommendations: ClinicalRecommendation[];
  careOptimization: CareOptimization[];
  trendAnalysis: TrendAnalysis[];
  riskScore?: number;
  confidence: number;
}

interface DoctorClinicalAssistantProps {
  patientId?: string;
  patientName?: string;
  className?: string;
}

export default function DoctorClinicalAssistant({
  patientId,
  patientName,
  className = "",
}: DoctorClinicalAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["briefing", "alerts"]));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !user || user.role !== "doctor") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: `clinical-analysis-${patientId}-${Date.now()}`,
          message: inputMessage.trim(),
          sessionType: "clinical_analysis",
          userRole: "doctor", // Move userRole to top level
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          context: {
            patientId: patientId,
            userId: user.id,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I apologize, but I couldn't process your request at this time.",
        sender: "ai",
        timestamp: new Date(),
        clinicalInsights: data.clinicalInsights,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, there was an error processing your request. Please try again.",
        sender: "ai",
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
      sendMessage();
    }
  };

  const renderClinicalInsights = (insights: ClinicalInsights) => {
    // Safety check to ensure all array properties exist
    const safeInsights = {
      briefing: insights.briefing || {
        patientSummary: "Clinical analysis in progress...",
        keyRiskFactors: [],
        clinicalSignificance: "Standard evaluation recommended.",
        presentingConcernAnalysis: "Analysis pending...",
      },
      safetyAlerts: insights.safetyAlerts || [],
      recommendations: insights.recommendations || [],
      careOptimization: insights.careOptimization || [],
      trendAnalysis: insights.trendAnalysis || [],
      riskScore: insights.riskScore,
      confidence: insights.confidence || 0.8,
    };

    return (
      <div className="space-y-4 mt-4 border-t border-gray-200 pt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 bg-white px-3 py-2 rounded-md shadow-sm">
          <Brain className="h-4 w-4" />
          Clinical Intelligence Report
        </div>
        {/* Clinical Briefing */}
        <Card className="border-blue-200 bg-white shadow-sm">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("briefing")}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="font-semibold text-blue-800">📋 Clinical Briefing</span>
              {expandedSections.has("briefing") ? (
                <ChevronUp className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          {expandedSections.has("briefing") && (
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none">
                {/* Patient Summary */}
                {safeInsights.briefing.patientSummary && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Patient Summary</h4>
                    <MarkdownRenderer content={safeInsights.briefing.patientSummary} />
                  </div>
                )}

                {/* Key Risk Factors */}
                {safeInsights.briefing.keyRiskFactors && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Key Risk Factors</h4>
                    <MarkdownRenderer content={safeInsights.briefing.keyRiskFactors.join("\n")} />
                  </div>
                )}

                {/* Clinical Significance */}
                {safeInsights.briefing.clinicalSignificance && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Clinical Significance</h4>
                    <MarkdownRenderer content={safeInsights.briefing.clinicalSignificance} />
                  </div>
                )}

                {/* Presenting Concern Analysis */}
                {safeInsights.briefing.presentingConcernAnalysis && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Presenting Concern Analysis</h4>
                    <MarkdownRenderer content={safeInsights.briefing.presentingConcernAnalysis} />
                  </div>
                )}
              </div>

              {safeInsights.riskScore && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Badge
                    variant={
                      safeInsights.riskScore > 7 ? "destructive" : safeInsights.riskScore > 4 ? "default" : "secondary"
                    }
                    className="text-sm px-3 py-1"
                  >
                    Risk Score: {safeInsights.riskScore}/10
                  </Badge>
                </div>
              )}
            </CardContent>
          )}
        </Card>{" "}
        {/* Safety Alerts */}
        {safeInsights.safetyAlerts && safeInsights.safetyAlerts.length > 0 && (
          <Card className="border-red-200 bg-white shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("alerts")}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  🚨 Safety Alerts ({safeInsights.safetyAlerts.length})
                </span>
                {expandedSections.has("alerts") ? (
                  <ChevronUp className="h-4 w-4 text-red-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-red-600" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("alerts") && (
              <CardContent className="pt-0 space-y-3">
                {(safeInsights.safetyAlerts || []).map((alert, index) => (
                  <Alert
                    key={index}
                    className={
                      alert.type === "critical"
                        ? "border-red-500 bg-red-50"
                        : alert.type === "warning"
                          ? "border-orange-500 bg-orange-50"
                          : "border-blue-500 bg-blue-50"
                    }
                  >
                    <AlertDescription>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm mt-1">{alert.description}</div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            )}
          </Card>
        )}
        {/* Clinical Recommendations */}
        {safeInsights.recommendations && safeInsights.recommendations.length > 0 && (
          <Card className="border-green-200 bg-white shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("recommendations")}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-green-800">
                  <Shield className="h-4 w-4 text-green-600" />
                  💡 Clinical Recommendations ({safeInsights.recommendations.length})
                </span>
                {expandedSections.has("recommendations") ? (
                  <ChevronUp className="h-4 w-4 text-green-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("recommendations") && (
              <CardContent className="pt-0 space-y-4">
                {(safeInsights.recommendations || []).map((rec, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        {rec.category}
                      </Badge>
                      <Badge
                        variant={
                          rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm text-gray-800 mb-1">{rec.title}</div>
                    <div className="text-sm mb-2">
                      <MarkdownRenderer content={rec.description} />
                    </div>
                    {rec.evidence && (
                      <div className="text-xs text-gray-600 italic bg-white p-2 rounded border-l-2 border-blue-300">
                        <strong>Evidence:</strong> <MarkdownRenderer content={rec.evidence} />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}
        {/* Trend Analysis */}
        {safeInsights.trendAnalysis && safeInsights.trendAnalysis.length > 0 && (
          <Card className="border-purple-200 bg-white shadow-sm">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSection("trends")}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-purple-800">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  📈 Trend Analysis ({safeInsights.trendAnalysis.length})
                </span>
                {expandedSections.has("trends") ? (
                  <ChevronUp className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-purple-600" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("trends") && (
              <CardContent className="pt-0 space-y-3">
                {(safeInsights.trendAnalysis || []).map((trend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                  >
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{trend.metric}</div>
                      <div className="text-xs text-gray-600 mt-1">{trend.timeframe}</div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          trend.trend === "improving"
                            ? "default"
                            : trend.trend === "concerning" || trend.trend === "declining"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs mb-1"
                      >
                        {trend.trend}
                      </Badge>
                      <div className="text-xs text-gray-600 font-medium">{trend.significance}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}
        <div className="text-center mt-4 pt-3 border-t border-gray-200">
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            🤖 AI Confidence: {Math.round(safeInsights.confidence * 100)}%
          </Badge>
        </div>
      </div>
    );
  };

  // Only show for doctors
  if (!user || user.role !== "doctor") {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border-0">
            <CardHeader className="flex-row items-center justify-between py-4 px-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    Clinical AI Assistant
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                      AI-Powered
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-sm text-gray-600">
                      Consulting for: <span className="font-semibold text-blue-700">{getDoctorDisplayName(user)}</span>
                    </div>
                    {patientName && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Badge variant="outline" className="text-xs bg-white border-gray-300">
                          Patient: {patientName}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-white rounded-b-lg">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4 max-h-[calc(90vh-200px)] overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome, {getDoctorDisplayName(user)}</h3>
                    <p className="text-gray-600 mb-4 max-w-md mx-auto">
                      Your AI-powered clinical decision support assistant is ready to help with:
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="font-semibold text-blue-800 mb-1">🩺 Patient Analysis</div>
                        <div className="text-gray-600">Comprehensive patient assessments</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 mb-1">💊 Treatment Plans</div>
                        <div className="text-gray-600">Evidence-based recommendations</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="font-semibold text-red-800 mb-1">⚠️ Safety Alerts</div>
                        <div className="text-gray-600">Drug interactions & contraindications</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="font-semibold text-purple-800 mb-1">📊 Clinical Insights</div>
                        <div className="text-gray-600">Diagnostic support & trends</div>
                      </div>
                    </div>
                    {patientName && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                        <div className="text-sm font-semibold text-blue-800 mb-1">Current Patient Context</div>
                        <div className="text-blue-700">{patientName}</div>
                        <div className="text-xs text-blue-600 mt-1">
                          All responses will be tailored to this patient's medical history
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`mb-8 ${message.sender === "user" ? "text-right" : "text-left"}`}>
                    {/* Message Header with User Info */}
                    <div
                      className={`flex items-center gap-2 mb-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.sender === "user" ? (
                        <>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-700">{getDoctorDisplayName(user)}</div>
                            <div className="text-xs text-gray-500">{message.timestamp.toLocaleString()}</div>
                          </div>
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "D"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                            <Brain className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                              🤖 Clinical AI Assistant
                              <Badge variant="outline" className="text-xs">
                                AI
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">{message.timestamp.toLocaleString()}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Message Content */}
                    <div
                      className={`inline-block max-w-[90%] rounded-lg shadow-sm border ${
                        message.sender === "user"
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 rounded-tr-sm"
                          : "bg-white text-gray-900 border-gray-200 rounded-tl-sm"
                      }`}
                    >
                      <div className="p-4">
                        {message.sender === "ai" ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <div className="text-sm leading-relaxed font-medium">{message.content}</div>
                        )}
                      </div>
                    </div>

                    {/* Clinical Insights */}
                    {message.sender === "ai" && message.clinicalInsights && (
                      <div className="mt-4 max-w-[95%]">{renderClinicalInsights(message.clinicalInsights)}</div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="text-left mb-8">
                    {/* AI Thinking Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                          🤖 Clinical AI Assistant
                          <Badge variant="outline" className="text-xs">
                            Thinking...
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">Analyzing patient data</div>
                      </div>
                    </div>

                    {/* Loading Content */}
                    <div className="inline-block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg max-w-[90%] shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                            <div className="absolute inset-0 animate-pulse">
                              <div className="h-6 w-6 bg-blue-100 rounded-full opacity-75"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-blue-900 mb-2">Processing Clinical Analysis...</div>
                          <div className="space-y-2 text-sm text-blue-800">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span>Reviewing patient medical history</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <span>Analyzing current medications & allergies</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                              <span>Generating evidence-based recommendations</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.6s" }}
                              ></div>
                              <span>Checking for safety alerts & contraindications</span>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-blue-600 italic">
                            🧠 Powered by advanced medical AI • Response in progress...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input */}
              <div className="border-t bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-b-lg">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask about ${patientName ? `${patientName}'s` : "patient"} analysis, diagnosis, treatment recommendations...`}
                      className="resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white rounded-lg transition-all duration-200 pr-12"
                      rows={2}
                      disabled={isLoading}
                    />
                    {inputMessage.trim() && (
                      <div className="absolute right-2 top-2 text-xs text-gray-400">{inputMessage.length}/500</div>
                    )}
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                    className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 self-end transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Brain className="h-3 w-3" />
                        <span>Ask AI</span>
                      </div>
                    )}
                  </Button>
                </div>
                <div className="text-xs text-gray-600 mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>💡 Press Enter to send, Shift+Enter for new line</span>
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Brain className="h-3 w-3" />
                    <span>AI-Powered Clinical Assistant</span>
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => setInputMessage("Tell me about this patient")}
                    disabled={isLoading}
                  >
                    📋 Patient Overview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-white hover:bg-red-50 border-red-200 text-red-700"
                    onClick={() => setInputMessage("What are the key safety concerns?")}
                    disabled={isLoading}
                  >
                    ⚠️ Safety Check
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-white hover:bg-green-50 border-green-200 text-green-700"
                    onClick={() => setInputMessage("Are there any drug interactions to worry about?")}
                    disabled={isLoading}
                  >
                    💊 Drug Interactions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
                    onClick={() => setInputMessage("What treatment adjustments do you recommend?")}
                    disabled={isLoading}
                  >
                    🎯 Treatment Plan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
