import { Markup } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/types";
import { BotContext, SessionType } from "./types";
import { getSubscription } from "../subscriptions";
import { FlowAction } from "./flows/AbstractFlow";
import { TYPING_TIMEOUT } from "./const";

const markdownV2 = (message: string): string => message.replace(/(\.|\!|\-)/g, '\\\$1');

export const startTyping = async (ctx: BotContext): Promise<() => void> => {
  let canceled = false;
  const cancel = () => {
    canceled = true;
  }

  new Promise(async (resolve, drop) => {
    await ctx.sendChatAction('typing');
    let internal: NodeJS.Timer;
    internal = setInterval(async () => {
      if (canceled) {
        clearInterval(internal);
        return;
      }
      await ctx.sendChatAction('typing');
    }, TYPING_TIMEOUT);
  });
  return cancel;
};
export const typeMessages = async (
  ctx: BotContext,
  messages: string[],
  keyboardForLastMessage?: Markup.Markup<InlineKeyboardMarkup>
): Promise<void> => {
  return messages
    .map((m) => markdownV2(m))
    .reduce(async (prev, message, index) => {
      await prev;
      const isLastMessage = index === messages.length - 1;
      if (isLastMessage) {
        await ctx.replyWithMarkdownV2(message, keyboardForLastMessage);
      } else {
        await ctx.replyWithMarkdownV2(message);
      }
      if (!isLastMessage) {
        await ctx.sendChatAction('typing');
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 250 + (Math.random() * 1000))
        });
      }
    }, Promise.resolve());
};

export const createSession = (session?: SessionType, chatId?: number, userId?: string): SessionType => ({
  chatId: chatId ? chatId : null,
  userId: userId ? userId : null,
  actions: {},
  messages: [],
  cycles: 0,
  subscription: /*session?.subscription ? session.subscription :*/ {
    type: getSubscription(),
    status: 'empty',
  },
  flow: FlowAction.DIARY,
  feedback: {
    id: null,
    items: [],
  },
});
