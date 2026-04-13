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

/** 一次完整的多轮对话(对应侧边栏的一条历史记录)。 */
export interface Conversation {
  id: string;
  /** 侧边栏显示的标题,通常取第一条 user 消息的前几十个字符 */
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  /** 最后一次写入的时间,用于在侧边栏排序 */
  updatedAt: number;
}

export interface QuickPrompt {
  icon: string; // emoji or short label
  title: string;
  description: string;
  query: string;
}
