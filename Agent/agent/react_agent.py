from typing import List, Dict, Optional

from langchain.agents import create_agent
from model.factory import chat_model
from utils.prompt_loader import load_system_prompts
from agent.tools.agent_tools import (rag_summarize, get_weather, get_user_location, get_user_id,
                                     get_current_month, fetch_external_data, fill_context_for_report)
from agent.tools.middleware import monitor_tool, log_before_model, report_prompt_switch


# 多轮对话窗口大小：最多保留最近 N 条历史消息（不含本轮 query）。
# 设成偶数比较自然 —— 大约对应 N/2 轮 user/assistant 往返。
# 经验值：20 条足够覆盖一般连续问答；若发现 token 超限可下调。
MAX_HISTORY_MESSAGES = 20


class ReactAgent:
    def __init__(self):
        # system_prompt 通过 create_agent 注入，agent 内部会在每次调用时
        # 自动把它放在 messages 最前面 —— 因此外部传入的 history 不应再含 system，
        # 否则会出现重复的系统指令。
        self.agent = create_agent(
            model=chat_model,
            system_prompt=load_system_prompts(),
            tools=[rag_summarize, get_weather, get_user_location, get_user_id,
                   get_current_month, fetch_external_data, fill_context_for_report],
            middleware=[monitor_tool, log_before_model, report_prompt_switch],
        )

    @staticmethod
    def _sanitize_history(history: Optional[List[Dict]]) -> List[Dict]:
        """
        清洗并截断前端传来的历史消息：
          1. 只保留 role 为 user / assistant 的条目（防止前端误传 system，
             避免与 create_agent 的 system_prompt 重复）
          2. 丢弃 content 为空的消息（例如还在 streaming 中的占位气泡）
          3. 只保留最后 MAX_HISTORY_MESSAGES 条，控制 token 预算
        """
        if not history:
            return []

        cleaned: List[Dict] = []
        for m in history:
            role = m.get("role")
            content = (m.get("content") or "").strip()
            if role not in ("user", "assistant"):
                continue
            if not content:
                continue
            cleaned.append({"role": role, "content": content})

        if len(cleaned) > MAX_HISTORY_MESSAGES:
            cleaned = cleaned[-MAX_HISTORY_MESSAGES:]
        return cleaned

    def execute_stream(self, query: str, history: Optional[List[Dict]] = None):
        sanitized_history = self._sanitize_history(history)

        input_dict = {
            "messages": [
                *sanitized_history,
                {"role": "user", "content": query},
            ]
        }

        # 第三个参数context就是上下文runtime中的信息，就是我们做提示词切换的标记
        for chunk in self.agent.stream(input_dict, stream_mode="values", context={"report": False}):
            latest_message = chunk["messages"][-1]
            if latest_message.content:
                yield latest_message.content.strip() + "\n"


if __name__ == '__main__':
    agent = ReactAgent()

    for chunk in agent.execute_stream("给我生成我的使用报告"):
        print(chunk, end="", flush=True)
