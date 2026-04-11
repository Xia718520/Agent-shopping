import { Input, Button, Tooltip } from 'antd';
import { SendHorizontal, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const { TextArea } = Input;

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  loading: boolean;
}

export default function ChatInput({ onSend, onStop, loading }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // 流式结束后把焦点还给输入框,方便连着问
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="chat-input-wrap">
      <div className="chat-input-card">
        <TextArea
          ref={(el) => {
            // antd TextArea 的 ref 拿的是 internal ResizableTextArea,这里取其 resizableTextArea.textArea
            // 简化起见直接忽略
            inputRef.current = (el as unknown as { resizableTextArea?: { textArea: HTMLTextAreaElement } })?.resizableTextArea?.textArea ?? null;
          }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="输入你的问题,Enter 发送 / Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 6 }}
          variant="borderless"
          disabled={loading}
        />
        {loading ? (
          <Tooltip title="停止生成">
            <Button
              shape="circle"
              size="large"
              danger
              type="primary"
              className="send-btn"
              icon={<Square size={18} fill="currentColor" />}
              onClick={onStop}
            />
          </Tooltip>
        ) : (
          <Tooltip title="发送 (Enter)">
            <Button
              shape="circle"
              size="large"
              type="primary"
              className="send-btn"
              icon={<SendHorizontal size={18} />}
              onClick={handleSubmit}
              disabled={!value.trim()}
            />
          </Tooltip>
        )}
      </div>
      <div className="chat-input-tip">
        Sweeper AI 可能出错,请对关键信息进行核实。
      </div>
    </div>
  );
}
