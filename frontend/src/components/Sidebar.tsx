import { Button, Popconfirm } from 'antd';
import { Plus, Bot, Cloud, FileBarChart, Wrench, MessageSquare, Trash2 } from 'lucide-react';
import { APP_SUBTITLE, APP_TITLE } from '../constants';
import type { Conversation } from '../types';

interface Props {
  onNewChat: () => void;
  messageCount: number;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

const features = [
  { icon: <Bot size={16} />, label: '知识问答', desc: '扫地/扫拖机器人资料库' },
  { icon: <Cloud size={16} />, label: '天气查询', desc: '告诉你要不要拖地' },
  { icon: <FileBarChart size={16} />, label: '使用报告', desc: '按月生成设备报告' },
  { icon: <Wrench size={16} />, label: '故障排查', desc: '常见问题快速诊断' },
];

export default function Sidebar({
  onNewChat,
  messageCount,
  conversations,
  activeId,
  onSelectConversation,
  onDeleteConversation,
}: Props) {
  // 按更新时间倒序,最新的对话置顶
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">🤖</div>
          <div className="brand-text">
            <div className="brand-title">{APP_TITLE}</div>
            <div className="brand-sub">{APP_SUBTITLE}</div>
          </div>
        </div>
      </div>

      <Button
        block
        size="large"
        type="primary"
        icon={<Plus size={16} />}
        className="new-chat-btn"
        onClick={onNewChat}
      >
        新对话
      </Button>

      <div className="sidebar-history">
        <div className="sidebar-section-title">历史对话</div>

        {sorted.length === 0 ? (
          <div className="history-empty">还没有历史对话</div>
        ) : (
          <ul className="history-list">
            {sorted.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li
                  key={c.id}
                  className={`history-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectConversation(c.id)}
                >
                  <span className="history-icon">
                    <MessageSquare size={14} />
                  </span>
                  <div className="history-text">
                    <div className="history-title" title={c.title}>
                      {c.title || '新对话'}
                    </div>
                    <div className="history-meta">{c.messages.length} 条消息</div>
                  </div>
                  <Popconfirm
                    title="删除该对话?"
                    description="此操作不可恢复"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="history-delete"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="删除对话"
                      title="删除对话"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Popconfirm>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="sidebar-features">
        <div className="sidebar-section-title">能力</div>
        <ul className="feature-list">
          {features.map((f) => (
            <li key={f.label} className="feature-item">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-label">{f.label}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <div className="footer-stat">
          当前对话 · <b>{messageCount}</b> 条消息
        </div>
        <div className="footer-tip">后端:FastAPI + LangChain Agent</div>
      </div>
    </aside>
  );
}
