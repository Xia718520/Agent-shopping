import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, theme, App as AntdApp, message as antdMessage } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import { streamChat } from './api/chat';
import { STORAGE_KEY } from './constants';
import type { ChatMessage } from './types';
import './styles.css';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 清掉任何残留的 streaming 状态
    return parsed.map((m: ChatMessage) => ({ ...m, streaming: false }));
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* quota / 隐私模式下会失败,忽略即可 */
  }
}

function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 持久化到 localStorage
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // 自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    (text: string) => {
      if (loading) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };
      const botMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: '',
        streaming: true,
        createdAt: Date.now() + 1,
      };
      const botId = botMsg.id;

      setMessages((prev) => [...prev, userMsg, botMsg]);
      setLoading(true);

      const ac = new AbortController();
      abortRef.current = ac;

      streamChat(text, {
        signal: ac.signal,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, content: m.content + delta } : m)),
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, error: err, streaming: false } : m)),
          );
          antdMessage.error(err);
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m)),
          );
          setLoading(false);
          abortRef.current = null;
        },
      });
    },
    [loading],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  }, []);

  const newChat = useCallback(() => {
    if (loading) {
      abortRef.current?.abort();
      abortRef.current = null;
      setLoading(false);
    }
    setMessages([]);
  }, [loading]);

  const isEmpty = messages.length === 0;
  const messageCount = useMemo(() => messages.length, [messages]);

  return (
    <div className="app-root">
      <Sidebar onNewChat={newChat} messageCount={messageCount} />

      <main className="chat-main">
        <div className="chat-scroll" ref={scrollRef}>
          {isEmpty ? (
            <WelcomeScreen onPick={send} />
          ) : (
            <div className="message-list">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        <ChatInput onSend={send} onStop={stop} loading={loading} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c5cff',
          colorInfo: '#7c5cff',
          colorBgBase: '#0b0d16',
          colorTextBase: '#e6e8f2',
          borderRadius: 12,
          fontFamily:
            "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      }}
    >
      <AntdApp>
        <ChatApp />
      </AntdApp>
    </ConfigProvider>
  );
}
