export type UserDataItem = {
  userId: string;
  timestamp: string;
};

export type BaseUserMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

export type UserMessage = UserDataItem & BaseUserMessage;

export type BaseUserInfo = {
  threadId?: string;
  rating?: number;
};

export type UserInfo = UserDataItem & BaseUserInfo;
