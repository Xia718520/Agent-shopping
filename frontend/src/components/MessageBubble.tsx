import { Avatar } from 'antd';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`bubble-row ${isUser ? 'is-user' : 'is-bot'}`}>
      {!isUser && (
        <Avatar
          size={40}
          className="bubble-avatar bot-avatar"
          icon={<Bot size={22} strokeWidth={2} />}
        />
      )}

      <div className="bubble-content">
        <div className={`bubble-card ${isUser ? 'user-card' : 'bot-card'}`}>
          {message.error ? (
            <div className="bubble-error">⚠️ {message.error}</div>
          ) : isUser ? (
            <div className="bubble-plain">{message.content}</div>
          ) : (
            <div className="bubble-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (message.streaming ? '​' : '')}
              </ReactMarkdown>
              {message.streaming && <span className="typing-cursor">▋</span>}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar
          size={40}
          className="bubble-avatar user-avatar"
          icon={<User size={22} strokeWidth={2} />}
        />
      )}
    </div>
  );
}
