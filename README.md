# Sweeper AI · 扫地机器人智能客服(前端)

> 基于 **React 19 + TypeScript + Vite + Ant Design 5** 构建的 AI 客服对话界面,
> 后端对接 `Agent/` 目录下基于 **FastAPI + LangChain** 的智能 Agent,
> 通过 **SSE 流式接口**实时推送回复,支持知识问答、天气查询、使用报告生成、故障排查等能力。

---

## 技术栈

| 分类 | 选型 |
|---|---|
| 构建工具 | Vite 8 |
| 框架 | React 19 + TypeScript 6 |
| UI 组件库 | Ant Design 5(深色算法主题) |
| 图标 | lucide-react |
| Markdown 渲染 | react-markdown + remark-gfm |
| 数据流 | `fetch` + `ReadableStream`(手动解析 SSE) |
| 持久化 | `localStorage` |

---

## 目录结构

```
frontend/
├── index.html                  # HTML 入口,title 为应用名
├── package.json                # 依赖声明
├── vite.config.ts              # Vite 配置 + /api 代理到后端 8000 端口
├── tsconfig*.json              # TypeScript 编译配置
├── eslint.config.js            # ESLint 规则
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.tsx                # React 渲染入口
    ├── App.tsx                 # 主应用:状态管理 + 主题配置 + 布局
    ├── styles.css              # 全局样式(深色科技风主题)
    ├── constants.ts            # 应用标题、快捷提问、localStorage key
    ├── api/
    │   └── chat.ts             # SSE 流式请求封装
    ├── types/
    │   └── index.ts            # ChatMessage / QuickPrompt 类型定义
    └── components/
        ├── Sidebar.tsx         # 左侧栏:品牌 + 新对话 + 能力说明
        ├── WelcomeScreen.tsx   # 空状态欢迎页 + 快捷提问卡片
        ├── MessageBubble.tsx   # 单条消息气泡(支持 Markdown + 打字光标)
        └── ChatInput.tsx       # 底部输入框 + 发送/停止按钮
```

---

## 每个文件的作用与关键功能

### 入口与配置

#### `index.html`
HTML 入口,挂载 `#root`,标题为 `Sweeper AI · 扫地机器人智能客服`。

#### `vite.config.ts`
- 开发服务器固定 **3000 端口**(`strictPort: true`),与后端 CORS 白名单对齐
- 启动时自动打开浏览器(`open: true`)、监听 `0.0.0.0`(`host: true`)局域网可访问
- **`/api` 反向代理到 `http://localhost:8000`**,彻底避免前后端跨域问题

#### `src/main.tsx`
React 渲染入口,使用 `StrictMode` 包裹 `<App />`。

---

### 主应用

#### `src/App.tsx`
整个前端的「大脑」,职责:

- **主题注入**:通过 `ConfigProvider` 指定 `theme.darkAlgorithm` + 紫蓝渐变主色 `#7c5cff`
- **消息状态管理**:`messages`、`loading` 两个 state 管理整个对话
- **localStorage 持久化**:`useEffect` 监听 `messages` 变化,自动读写 `sweeper-ai:chat-history-v1`,刷新页面不丢对话
- **SSE 调用**:调用 `streamChat()`,通过 `onDelta` 回调把分块内容增量追加到目标气泡
- **流中断**:`AbortController` 实现「停止生成」按钮,点击后立刻终止 fetch 并清理 streaming 状态
- **自动滚动**:每次新消息进来自动 `scrollTo` 到底部
- **空状态切换**:无消息时渲染 `WelcomeScreen`,有消息时渲染 `MessageList`

#### `src/styles.css`
全局样式表,**深色科技风主题**的核心:

- 顶部用两束径向渐变(紫 + 蓝)模拟宇宙光晕
- CSS 变量统一管理色板(`--brand`、`--bg-0`、`--text-1` 等),改主题只需动几行
- 消息气泡:用户消息用品牌渐变色,bot 消息用半透明毛玻璃卡片(`backdrop-filter`)
- **打字光标**:`.typing-cursor` 用 `@keyframes blink` 做闪烁
- **气泡入场动画**:`.bubble-row` 用 `fadeUp` 做渐入上移
- 完整的 Markdown 样式(标题/列表/表格/代码块/引用块)
- `≤840px` 响应式:自动隐藏侧边栏

---

### 数据层

#### `src/api/chat.ts`
SSE 流式请求的**核心封装**,也是全项目技术含量最高的文件:

```ts
streamChat(query, { onDelta, onDone, onError, signal })
```

- 由于后端是 `POST /api/chat/stream`(有请求体),**不能用浏览器的 `EventSource`**(只支持 GET),所以手写 `fetch` + `reader.read()` 方案
- 按 SSE 协议用 `\n\n` 分割事件帧,只挑 `data:` 开头的行解析
- 识别三种 payload:
  - `{"content": "..."}` → 触发 `onDelta`,前端按字符增量拼接出打字机效果
  - `{"error": "..."}` → 触发 `onError`,在气泡内显示错误提示
  - `[DONE]` → 触发 `onDone`,关闭 loading、结束流
- 支持外部 `AbortSignal` 传入,`AbortError` 会被静默吞掉(是用户主动取消,不是错误)
- 文本解码使用 `TextDecoder('utf-8', { stream: true })`,正确处理跨 chunk 的多字节中文字符

#### `src/types/index.ts`
TypeScript 类型定义:

- `ChatMessage`:`id` / `role` / `content` / `streaming?` / `error?` / `createdAt`
- `QuickPrompt`:快捷提问卡片的结构
- `MessageRole` 联合类型:`'user' | 'assistant'`

#### `src/constants.ts`
应用常量集中地:

- `APP_TITLE` / `APP_SUBTITLE`
- `QUICK_PROMPTS`:4 张快捷提问卡片,覆盖 agent 的核心能力(天气、报告、故障、保养)
- `STORAGE_KEY`:localStorage 的 key,带版本号便于日后升级迁移

---

### 组件层

#### `src/components/Sidebar.tsx`
左侧固定栏:

- 顶部品牌区(渐变色 logo + 应用名 + 副标题)
- 主操作按钮:「新对话」,点击清空消息并中断当前流
- 能力列表:4 项静态的功能介绍(知识问答 / 天气 / 报告 / 故障)
- 底部页脚:实时显示当前对话消息条数 + 后端技术栈标注

#### `src/components/WelcomeScreen.tsx`
空状态时的首屏:

- 大号渐变 logo + 标题 + 说明文字
- 4 张可点击的**快捷提问卡片**(来自 `constants.QUICK_PROMPTS`),hover 有上浮和发光效果
- 点击卡片直接触发 `send(query)`,开箱即用

#### `src/components/MessageBubble.tsx`
单条消息气泡,是对话页的视觉核心:

- 用户消息右对齐(品牌渐变色 + 白色文字),bot 消息左对齐(毛玻璃卡片)
- 头像使用 `lucide-react` 的 `Bot` / `User` 图标
- Bot 消息走 `react-markdown + remark-gfm` 渲染,支持 GFM 表格/任务列表/删除线
- **流式时显示闪烁光标**`▋`,空内容时用零宽字符占位避免气泡塌陷
- 错误状态单独渲染,带 ⚠️ 图标和红色文本

#### `src/components/ChatInput.tsx`
底部输入区:

- `antd` 的 `TextArea` + `autoSize`(1~6 行自动撑开)
- **键盘交互**:Enter 发送,Shift+Enter 换行
- 发送按钮和停止按钮根据 `loading` 状态切换(紫→红),发送按钮在空输入时 disable
- loading 变 false 后自动把焦点还给输入框,方便连问
- 底部"AI 可能出错"提示文案

---

## 项目亮点

### 1. SSE 流式对话的完整工程实现
不依赖任何第三方 SSE 库,**从零实现** `fetch + ReadableStream` 的协议解析,正确处理:

- POST 请求体(`EventSource` 做不到)
- 按 `\n\n` 分帧、按 `data:` 提取
- 跨 chunk 的 UTF-8 多字节字符解码
- `[DONE]` / `error` / `content` 三种事件分派
- `AbortController` 中断 + `AbortError` 静默处理

### 2. 打字机效果
流式 `onDelta` 回调触发 React state 增量更新,配合 CSS 闪烁光标和气泡淡入动画,还原主流 AI 产品的对话体验。

### 3. 深色科技风主题 + 毛玻璃质感
- 两束径向光晕 + 紫蓝渐变主色调,营造未来感
- `backdrop-filter: blur()` 实现毛玻璃气泡和输入框
- CSS 变量统一管理色板,换主题零成本
- Ant Design 的 `darkAlgorithm` + 自定义 token,组件和自定义样式无缝融合

### 4. 对话历史本地持久化
基于 `localStorage` 自动保存,刷新 / 关闭浏览器不丢对话;`STORAGE_KEY` 带版本号(`v1`),便于日后 schema 升级。

### 5. 可中断的请求控制
点击发送按钮后立即切换为**红色停止按钮**,支持随时 abort 当前流式请求(体验对齐 ChatGPT)。

### 6. 清晰的分层架构
```
components (纯 UI) → App (状态) → api (SSE 封装) → backend
```
每一层职责单一:组件不直接调 fetch,API 层不感知 React,主 App 负责把状态和副作用串起来。便于后续扩展(比如加入多会话 / 迁移到 Zustand / 换掉 SSE 方案)。

### 7. 快捷提问引导
首屏 4 张卡片精准对应后端 agent 的 7 个 tool 能力,降低新用户学习成本,点击即问。

### 8. 完善的响应式
`≤840px` 自动隐藏侧边栏、调整 padding 和气泡宽度,移动端可用。

### 9. 零跨域烦恼
Vite dev 代理 `/api → http://localhost:8000`,开发和生产用同一套请求路径,无需区分环境变量。

### 10. 严格的类型安全
全量 TypeScript,`tsc -b` 通过零错误、生产 `vite build` 通过零警告(仅有常规 bundle size 提示)。

---

## 快速开始

### 环境要求
- Node.js ≥ 18
- 后端 FastAPI 服务已在 `http://localhost:8000` 启动

### 安装与启动

```bash
# 1. 启动后端(另开终端)
cd ../Agent
python main.py                  # 或 uvicorn main:app --port 8000 --reload

# 2. 启动前端
cd frontend
npm install
npm run dev                     # 自动打开 http://localhost:3000
```

### 其他命令

```bash
npm run build     # 生产构建(tsc -b && vite build)
npm run preview   # 预览生产构建产物
npm run lint      # ESLint 检查
```

---

## 与后端的契约

**接口**:`POST /api/chat/stream`

**请求体**:
```json
{ "query": "用户的问题文本" }
```

**响应**(SSE,`Content-Type: text/event-stream`):
```
data: {"content": "分块"}

data: {"content": "再一块"}

data: [DONE]

```

**出错时**:
```
data: {"error": "错误描述"}

data: [DONE]

```

---

## 后续可扩展方向

- **消息级操作**:复制、重试、点赞 / 点踩反馈
- **文件上传 / 导出**:若后端开放文件接口,可在气泡里挂附件卡片
- **代码块高亮**:引入 `react-syntax-highlighter`(目前是纯 CSS 样式)
- **国际化**:Ant Design 已接入 `zhCN`,加 `react-i18next` 即可支持多语言
- **主题切换**:把 CSS 变量拆到 `data-theme` 属性上,加浅色主题开关
