import { Update, Message } from "telegraf/types";
import { Context } from "telegraf";
import { FlowAction } from "./flows/AbstractFlow";

export interface BotContext<U extends Update = Update> extends Context<U> {
  session: SessionType,
}

export type UserChat = { id: number, first_name: string, last_name: string, username: string };

export type FeedbackItem = { question: string, answer?: string };

export type ChatMessageType = { role: 'system' | 'user' | 'assistant', content: string, diaryPage?: boolean };

export type SessionType = {
  chatId: number | null,
  userId: string | null,
  messages: ChatMessageType[],
  actions: { [key: string]: string },
  cycles: number,
  subscription: {
    type: string,
    status: 'empty' | 'subscribed' | 'unsubscribed',
  },
  flow: FlowAction,
  feedback: {
    id: string|null,
    items: FeedbackItem[],
  },
};
