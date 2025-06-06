export type ResponseCategory = "answer" | "advice" | "follow-up";

export interface GeminiResponse {
  content: string;
  category: ResponseCategory;
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
