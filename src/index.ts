import { Markup, Telegraf, session, type Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { Redis } from '@telegraf/session/redis';
import { message } from 'telegraf/filters';
import { Configuration, OpenAIApi } from 'openai';
import {
  badAIResponse,
  diaryAIMessageV3,
  diaryAISummary,
  diaryAISummaryRecommend,
  diaryUserSummary,
  helloMessage,
  notADiaryNote,
  notARealLifeCase,
  notEnoughContext,
  subscriptionHeader,
  subscriptionNotReady,
  subscriptionNotSubscribed,
  subscriptionSubscribed,
  systemError,
} from './templates';
import { getSubscription } from './subscriptions';
import { AsyncSessionStore } from 'telegraf/typings/session';


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('Starting bot');

const subscriptionCycles = 2;

const {
  BOT_TOKEN,
  OPENAI_TOKEN,
  OPENAI_ORG,
  OPENAI_MODEL,
  REDIS_HOST,
  REDIS_PORT,
} = process.env;

const openai = new OpenAIApi(new Configuration({
  apiKey: OPENAI_TOKEN,
  organization: OPENAI_ORG,
}));

type ChatMessageType = { role: 'system' | 'user' | 'assistant', content: string };
type SessionType = {
  messages: ChatMessageType[],
  actions: { [key: string]: string },
  cycles: number,
  subscription: {
    type: string,
    status: 'empty' | 'subscribed' | 'unsubscribed',
  },
};

interface BotContext<U extends Update = Update> extends Context<U> {
  session: SessionType,
}

const bot = new Telegraf<BotContext>(BOT_TOKEN!);
const store = Redis<SessionType>({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
}) as unknown as AsyncSessionStore<SessionType>;

const createSession = (session?: SessionType): SessionType => ({
  actions: {},
  messages: [],
  cycles: 0,
  subscription: /*session?.subscription ? session.subscription :*/ {
    type: getSubscription(),
    status: 'empty',
  },
});

// pass the store to session
bot.use(session<SessionType, BotContext>({
  store, defaultSession: () => createSession(),
}));

const getAICompletion = async (ctx: any, messages: ChatMessageType[]): Promise<string> => {
  console.log('messages', messages);
  await ctx.sendChatAction('typing');
  let completion = await openai.createChatCompletion({
    model: OPENAI_MODEL!,
    messages: messages,
  });
  return completion!.data!.choices[0].message!.content;
}

const getActionOptions = (text: string): string[] => {
  return text.split('\n').reduce((acc, cur): string[] => {
    const matched = cur.match(/^((\d+\s?\.)|(-\s?))(.+)$/);
    if (matched && matched[4]) {
      acc.push(matched[4].trim());
    }
    return acc;
  }, [] as string[]);
};

const processForChat = async (ctx: any, chatId: number, message: string) => {
  console.log('ctx.session', ctx.session);
  const { session } = ctx;
  const payMatched = message.match(/^pay-(.+)$/)
  if (session.subscription.status !== 'empty') {
    return;
  }
  if (payMatched && payMatched[1]) {
    if (payMatched[1] === 'not-ready') {
      ctx.session.subscription.status = 'unsubscribed';
      ctx.reply(subscriptionNotSubscribed());
    } else {
      ctx.session.subscription.status = 'subscribed';
      ctx.reply(subscriptionSubscribed());
    }
    return;
  }
  if (session.cycles >= subscriptionCycles) {
    const subscriptionPlan = session.subscription.type;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback(subscriptionPlan, `pay-${subscriptionPlan}`),
      Markup.button.callback(subscriptionNotReady(), `pay-not-ready`),
    ]);
    await ctx.reply(`${subscriptionHeader()}`, keyboard);
    return;
  }

  const messages: ChatMessageType[] = [];
  for (const message of session.messages) {
    messages.push(message);
  }

  try {
    let completionText: string;
    // first message about long diary record
    if (session.messages.length === 0) {
      messages.push({ role: 'user', content: diaryAIMessageV3(message) });
    } else {
      messages.push({ role: 'user', content: diaryAISummaryRecommend(ctx.session.actions[message]) });
    }
    completionText = await getAICompletion(ctx, messages);
    if (
      !completionText ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      ctx.reply(systemError());
      return;
    }
    if ([notEnoughContext(), notADiaryNote(), notARealLifeCase()].includes(completionText)) {
      ctx.reply(completionText);
      return;
    }

    if (completionText) {
      ctx.reply(completionText);
      console.log('question completion', completionText);
      messages.push({ role: 'assistant', content: completionText });
    }

    // Summary
    await ctx.sendChatAction('typing');
    messages.push({ role: 'user', content: diaryAISummary() });
    completionText = await getAICompletion(ctx, messages);
    if (
      !completionText ||
      [notEnoughContext(), notADiaryNote(), notARealLifeCase()].includes(completionText) ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      return;
    }
    console.log('summary completion', completionText);
    messages.push({ role: 'assistant', content: completionText });
    const options = getActionOptions(completionText);
    console.log('options', options);
    const keyboard = Markup.inlineKeyboard(
      options.map((o, i) => Markup.button.callback((i + 1).toString(), (i + 1).toString())),
    );
    session.actions = options.reduce((acc, cur, i) => {
      acc[i + 1] = cur;
      return acc;
    }, {} as { [key: string]: string });
    await ctx.reply(`${diaryUserSummary()}\n${completionText}`, keyboard);
  } catch (error) {
    console.error(error);
  }
  session.messages = messages;
  session.cycles++;
}

bot.start(async (ctx) => {
  // reset conversations context for the chat when /start called
  ctx.session = createSession(ctx.session);

  const messages = helloMessage();
  await messages.reduce(async (prev, message, index) => {
    await prev;
    await ctx.replyWithMarkdownV2(message);
    if (index !== messages.length - 1) {
      await ctx.sendChatAction('typing');
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), Math.random() * 1000)
      });
    }
  }, Promise.resolve());
});

bot.on(message('text'), async (ctx) => {
  const { id: chatId } = ctx.message.chat;
  await processForChat(ctx, chatId, ctx.message.text);
});

bot.action(/.*/, async (ctx) => {
  const { id: chatId } = ctx.update.callback_query.message!.chat;
  await processForChat(ctx, chatId, ctx.match.input);
});

bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
