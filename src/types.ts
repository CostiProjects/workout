export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system_log";
  content: string;
  timestamp: string;
  finishReason?: string;
  rawRequestPayload?: any;
  rawResponsePayload?: any;
}

export interface GenerationConfig {
  model: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  systemInstruction: string;
  safetySettings: SafetySetting[];
}

export interface Preset {
  name: string;
  description: string;
  icon: string;
  config: GenerationConfig;
}
