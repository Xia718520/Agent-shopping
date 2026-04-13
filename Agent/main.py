import json
import asyncio
from contextlib import asynccontextmanager
from typing import List, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.react_agent import ReactAgent


# ---------- 全局资源 ----------
# 使用 lifespan 在应用启动时初始化 ReactAgent，避免每次请求重复构建
agent_holder: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    agent_holder["agent"] = ReactAgent()
    yield
    # 关闭时清理（如有需要）
    agent_holder.clear()


app = FastAPI(
    title="智扫通机器人智能客服 API",
    description="基于 LangChain 的 ReAct Agent 后端接口，供 React 前端调用",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------- CORS ----------
# 允许 React 开发服务器（Vite 默认 5173、CRA 默认 3000）访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- 请求/响应模型 ----------
class HistoryMessage(BaseModel):
    """历史对话中的单条消息（仅 user / assistant，不含 system）。"""
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    query: str
    # 由前端传入的多轮对话历史（不含本轮 query）。
    # 后端会在 ReactAgent 内做窗口截断，避免超 token。
    history: List[HistoryMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str


# ---------- 路由 ----------
@app.get("/")
def root():
    return {"message": "智扫通机器人智能客服 API 正在运行"}


@app.get("/api/health")
def health():
    return {"status": "ok", "agent_ready": "agent" in agent_holder}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    非流式接口：一次性返回最终答案。
    适合简单调用或调试。
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query 不能为空")

    agent: ReactAgent = agent_holder["agent"]
    history = [m.model_dump() for m in req.history]

    # ReactAgent.execute_stream 是同步生成器，放到线程池执行以避免阻塞事件循环
    def _collect() -> str:
        chunks = []
        for chunk in agent.execute_stream(req.query, history=history):
            chunks.append(chunk)
        return chunks[-1] if chunks else ""

    answer = await asyncio.to_thread(_collect)
    return ChatResponse(answer=answer)


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    流式接口：使用 SSE(Server-Sent Events) 推送增量内容。

    前端消费示例（React）：
        const res = await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            // 按 SSE 格式解析 "data: ...\n\n"
        }
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query 不能为空")

    agent: ReactAgent = agent_holder["agent"]
    history = [m.model_dump() for m in req.history]

    async def event_generator():
        # 把同步生成器放到独立线程中，逐块转成 SSE 事件
        loop = asyncio.get_running_loop()
        sync_gen = agent.execute_stream(req.query, history=history)

        sentinel = object()

        def next_chunk():
            try:
                return next(sync_gen)
            except StopIteration:
                return sentinel

        try:
            while True:
                chunk = await loop.run_in_executor(None, next_chunk)
                if chunk is sentinel:
                    break
                # SSE 规范：data 字段 + 空行结束
                payload = json.dumps({"content": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
            # 结束标记，前端据此关闭流
            yield "data: [DONE]\n\n"
        except Exception as e:
            err = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {err}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
