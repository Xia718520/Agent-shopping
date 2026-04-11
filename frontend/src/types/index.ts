export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** assistant 消息是否还在流式接收中 */
  streaming?: boolean;
  /** 出错时记录错误文本,方便在气泡里展示 */
  error?: string;
  createdAt: number;
}

export interface QuickPrompt {
  icon: string; // emoji or short label
  title: string;
  description: string;
  query: string;
}
