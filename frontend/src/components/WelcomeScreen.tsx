import { Sparkles } from 'lucide-react';
import { APP_TITLE, QUICK_PROMPTS } from '../constants';

interface Props {
  onPick: (query: string) => void;
}

export default function WelcomeScreen({ onPick }: Props) {
  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <Sparkles size={44} strokeWidth={1.8} />
      </div>
      <h1 className="welcome-title">你好,我是 {APP_TITLE}</h1>
      <p className="welcome-sub">
        我可以回答扫地机器人相关问题、查询天气、生成你的本月使用报告。
        <br />
        试试下面几个示例,或者直接在下方输入问题。
      </p>

      <div className="quick-grid">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.title}
            className="quick-card"
            onClick={() => onPick(q.query)}
            type="button"
          >
            <div className="quick-icon">{q.icon}</div>
            <div className="quick-text">
              <div className="quick-title">{q.title}</div>
              <div className="quick-desc">{q.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
