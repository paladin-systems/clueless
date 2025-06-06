export type ResponseType = "response" | "question" | "reference" | "note";
export type ResponseCategory = "response" | "follow-up" | "context" | "suggestion";
export type ResponsePriority = "high" | "medium" | "low";

export interface GeminiResponse {
  type: ResponseType;
  content: string;
  category: ResponseCategory;
  priority: ResponsePriority;
  timestamp: number;
}

export interface GeminiStreamMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{ text: string }>;
    };
    generationComplete?: boolean;
    turnComplete?: boolean;
  };
  error?: {
    message: string;
  };
}
