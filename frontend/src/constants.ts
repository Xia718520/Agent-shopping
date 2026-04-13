import type { QuickPrompt } from './types';

export const APP_TITLE = '扫地机器人智能客服';
export const APP_SUBTITLE = 'Sweeper AI · 由 FastAPI + LangChain 驱动';

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: '☁️',
    title: '查询天气',
    description: '告诉我今天适不适合拖地',
    query: '帮我查一下我当前所在城市今天的天气,适合拖地吗?',
  },
  {
    icon: '📊',
    title: '生成使用报告',
    description: '查看本月机器使用情况',
    query: '帮我生成一份本月的扫地机使用报告',
  },
  {
    icon: '🛠️',
    title: '故障排查',
    description: '机器人无法回充怎么办',
    query: '我的扫地机器人无法自动回充,可能是什么原因?怎么解决?',
  },
  {
    icon: '🧽',
    title: '保养技巧',
    description: '滚刷多久清洗一次',
    query: '扫地机器人的滚刷、边刷和滤网多久需要清洗或更换一次?',
  },
];

/** 旧版本(单一对话)使用的 key,只在迁移时读取一次,迁移成功后会被清除。 */
export const LEGACY_STORAGE_KEY = 'sweeper-ai:chat-history-v1';

/** 新版本:存放 Conversation[] 的 key。 */
export const STORAGE_KEY_CONVERSATIONS = 'sweeper-ai:conversations-v1';

/** 新版本:存放当前激活的 conversation id,允许为 null(欢迎屏)。 */
export const STORAGE_KEY_ACTIVE = 'sweeper-ai:active-conversation-v1';

/** 标题最多保留多少个字符。 */
export const CONVERSATION_TITLE_MAX = 24;
