import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, theme, App as AntdApp, message as antdMessage } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import { streamChat } from './api/chat';
import type { HistoryItem } from './api/chat';
import {
  CONVERSATION_TITLE_MAX,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY_ACTIVE,
  STORAGE_KEY_CONVERSATIONS,
} from './constants';
import type { ChatMessage, Conversation } from './types';
import './styles.css';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return '新对话';
  return t.length > CONVERSATION_TITLE_MAX ? t.slice(0, CONVERSATION_TITLE_MAX) + '…' : t;
}

interface InitialState {
  conversations: Conversation[];
  activeId: string | null;
}

/**
 * 加载持久化数据。优先读新格式;若新格式不存在,尝试把旧版本(单一对话)
 * 的 chat-history 迁移成一条 Conversation,迁移成功后清掉旧 key。
 */
function loadInitialState(): InitialState {
  // 1. 优先读新格式
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const conversations: Conversation[] = parsed
          .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
          .map((c: Conversation) => ({
            ...c,
            // 任何残留的 streaming 状态都要清掉,避免上次崩溃留下假的"打字中"
            messages: c.messages.map((m) => ({ ...m, streaming: false })),
          }));
        const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
        const activeId =
          rawActive && conversations.some((c) => c.id === rawActive) ? rawActive : null;
        return { conversations, activeId };
      }
    }
  } catch {
    /* ignore parse errors, fall through to migration */
  }

  // 2. 尝试迁移旧 key
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const messages: ChatMessage[] = parsed.map((m: ChatMessage) => ({
          ...m,
          streaming: false,
        }));
        const firstUser = messages.find((m) => m.role === 'user');
        const id = makeId();
        const conv: Conversation = {
          id,
          title: makeTitle(firstUser?.content ?? '历史对话'),
          messages,
          createdAt: messages[0]?.createdAt ?? Date.now(),
          updatedAt: messages[messages.length - 1]?.createdAt ?? Date.now(),
        };
        // 迁移完成后,清理旧 key,避免下次再走迁移流程
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return { conversations: [conv], activeId: id };
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }

  return { conversations: [], activeId: null };
}

function ChatApp() {
  const initial = useMemo(loadInitialState, []);
  const [conversations, setConversations] = useState<Conversation[]>(initial.conversations);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 用 ref 同步最新的 conversations 和 activeId,这样 send/stop/delete 等
  // 回调里能拿到"调用瞬间"的真实状态,而不必把它们放进 useCallback 的依赖里。
  const conversationsRef = useRef<Conversation[]>(conversations);
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 持久化 conversations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
    } catch {
      /* quota / 隐私模式失败,忽略 */
    }
  }, [conversations]);

  // 持久化 activeId
  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
      else localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  // 当前会话的 messages,作为单一派生值供渲染层使用
  const messages = useMemo<ChatMessage[]>(() => {
    if (!activeId) return [];
    return conversations.find((c) => c.id === activeId)?.messages ?? [];
  }, [conversations, activeId]);

  // 自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  /**
   * 工具:对指定 id 的会话执行一次 messages 更新。
   * 用 convId 而不是 activeId,这样即使用户在流式过程中切换了对话,
   * 增量内容仍然写回正确的会话。
   */
  const updateConversationMessages = useCallback(
    (convId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: updater(c.messages), updatedAt: Date.now() }
            : c,
        ),
      );
    },
    [],
  );

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

      // 决定本轮往哪个 conversation 写。如果没有活跃会话就懒创建一个。
      let convId = activeIdRef.current;
      let priorMessages: ChatMessage[] = [];

      if (convId === null) {
        const newId = makeId();
        const newConv: Conversation = {
          id: newId,
          title: makeTitle(text),
          messages: [userMsg, botMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        // 新对话置顶
        setConversations((prev) => [newConv, ...prev]);
        setActiveId(newId);
        convId = newId;
      } else {
        const current = conversationsRef.current.find((c) => c.id === convId);
        priorMessages = current?.messages ?? [];

        // 如果该会话此前是空的(刚 setActiveId 但还没发消息),用本条 user 文本生成标题
        const shouldSetTitle = priorMessages.length === 0;

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  title: shouldSetTitle ? makeTitle(text) : c.title,
                  messages: [...c.messages, userMsg, botMsg],
                  updatedAt: Date.now(),
                }
              : c,
          ),
        );
      }

      // 闭包捕获本轮的 convId,后续流式回调即便 activeId 变了也写回这里
      const targetConvId = convId;

      // 构建发给后端的 history(只取本会话的 prior messages,不含本轮 user/bot 占位)
      const history: HistoryItem[] = priorMessages
        .filter((m) => !m.error && m.content && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setLoading(true);

      const ac = new AbortController();
      abortRef.current = ac;

      streamChat(text, {
        signal: ac.signal,
        history,
        onDelta: (delta) => {
          updateConversationMessages(targetConvId, (msgs) =>
            msgs.map((m) => (m.id === botId ? { ...m, content: m.content + delta } : m)),
          );
        },
        onError: (err) => {
          updateConversationMessages(targetConvId, (msgs) =>
            msgs.map((m) =>
              m.id === botId ? { ...m, error: err, streaming: false } : m,
            ),
          );
          antdMessage.error(err);
        },
        onDone: () => {
          updateConversationMessages(targetConvId, (msgs) =>
            msgs.map((m) => (m.id === botId ? { ...m, streaming: false } : m)),
          );
          setLoading(false);
          abortRef.current = null;
        },
      });
    },
    [loading, updateConversationMessages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    // 清掉所有会话里残留的 streaming 标记(理论上只会有一条)
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
      })),
    );
  }, []);

  const newChat = useCallback(() => {
    if (loading) {
      abortRef.current?.abort();
      abortRef.current = null;
      setLoading(false);
    }
    // 懒创建:不立刻生成空会话,把 activeId 置 null 显示欢迎屏。
    // 用户发出第一条消息时才物化为 Conversation,避免侧栏堆积空记录。
    setActiveId(null);
  }, [loading]);

  const selectConversation = useCallback(
    (id: string) => {
      if (loading) {
        // 切换会话时如果还在流式,先中断当前的(避免增量错位)
        abortRef.current?.abort();
        abortRef.current = null;
        setLoading(false);
        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.streaming ? { ...m, streaming: false } : m,
            ),
          })),
        );
      }
      setActiveId(id);
    },
    [loading],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      // 如果删的就是当前正在流式的会话,先中断
      if (loading && activeIdRef.current === id) {
        abortRef.current?.abort();
        abortRef.current = null;
        setLoading(false);
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));
    },
    [loading],
  );

  const isEmpty = messages.length === 0;
  const messageCount = messages.length;

  return (
    <div className="app-root">
      <Sidebar
        onNewChat={newChat}
        messageCount={messageCount}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />

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
