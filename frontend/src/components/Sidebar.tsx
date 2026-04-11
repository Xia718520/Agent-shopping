import { Button } from 'antd';
import { Plus, Bot, Cloud, FileBarChart, Wrench } from 'lucide-react';
import { APP_SUBTITLE, APP_TITLE } from '../constants';

interface Props {
  onNewChat: () => void;
  messageCount: number;
}

const features = [
  { icon: <Bot size={16} />, label: '知识问答', desc: '扫地/扫拖机器人资料库' },
  { icon: <Cloud size={16} />, label: '天气查询', desc: '告诉你要不要拖地' },
  { icon: <FileBarChart size={16} />, label: '使用报告', desc: '按月生成设备报告' },
  { icon: <Wrench size={16} />, label: '故障排查', desc: '常见问题快速诊断' },
];

export default function Sidebar({ onNewChat, messageCount }: Props) {
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

      <div className="sidebar-footer">
        <div className="footer-stat">
          当前对话 · <b>{messageCount}</b> 条消息
        </div>
        <div className="footer-tip">后端:FastAPI + LangChain Agent</div>
      </div>
    </aside>
  );
}
