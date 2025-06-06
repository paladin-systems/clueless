export type ResponseCategory = "answer" | "advice" | "follow-up";
export type ResponsePriority = "high" | "medium" | "low";

export interface GeminiResponse {
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
