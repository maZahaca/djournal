import { Markup, Telegraf, session, type Context, NarrowedContext } from 'telegraf';
import type { Update, InlineKeyboardMarkup } from 'telegraf/types';
import { Redis } from '@telegraf/session/redis';
import { message } from 'telegraf/filters';
import { Configuration, OpenAIApi } from 'openai';
import {
  badAIResponse,
  buttonIDontKnowWhatToWrite,
  diaryAIMessageV3,
  diaryAISummary,
  diaryAISummaryRecommend,
  diaryUserSummary,
  feedbackMessage1,
  feedbackMessage2,
  feedbackMessage3,
  feedbackMessageFinish,
  helloMessage,
  helpMessages,
  notCorrectDiaryMessage,
  subscriptionHeader,
  subscriptionNotReady,
  subscriptionNotSubscribed,
  subscriptionSubscribed,
  systemError,
  textIDontKnowWhatToWrite,
  whatToWriteAbout,
} from './templates';
import { getSubscription } from './subscriptions';
import { AsyncSessionStore } from 'telegraf/typings/session';

const BUTTON_WHAT_TO_WRITE = 'what-to-write';
const TYPING_TIMEOUT = 5000;

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('Starting bot');

const subscriptionCycles = 3;

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

type FeedbackItem = { question: string, answer?: string };
type ChatMessageType = { role: 'system' | 'user' | 'assistant', content: string, diaryPage?: boolean };
type SessionType = {
  chatId: number | null,
  messages: ChatMessageType[],
  actions: { [key: string]: string },
  cycles: number,
  subscription: {
    type: string,
    status: 'empty' | 'subscribed' | 'unsubscribed',
  },
  flow: 'diary' | 'subscription' | 'feedback',
  feedback: FeedbackItem[],
};

interface BotContext<U extends Update = Update> extends Context<U> {
  session: SessionType,
}

const bot = new Telegraf<BotContext>(BOT_TOKEN!);
const store = Redis<SessionType>({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
}) as unknown as AsyncSessionStore<SessionType>;

const createSession = (session?: SessionType, chatId?: number): SessionType => ({
  chatId: chatId ? chatId : null,
  actions: {},
  messages: [],
  cycles: 0,
  subscription: /*session?.subscription ? session.subscription :*/ {
    type: getSubscription(),
    status: 'empty',
  },
  flow: 'diary',
  feedback: [],
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
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
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

const startTyping = async (ctx: BotContext): Promise<() => void> => {
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

const getMessages = (completionText: string): string[] => {
  return completionText.split('\n').filter(Boolean);
}

const processForChat = async (ctx: any, chatId: number, message: string) => {
  console.log('ctx.session', ctx.session);
  const cancelTyping = await startTyping(ctx);
  const { session } = ctx;
  let messages: ChatMessageType[] = [];
  for (const message of session.messages) {
    messages.push(message);
  }

  try {
    let completionText: string;
    // first message about long diary record
    if (session.messages.length === 0) {
      messages.push({ role: 'user', content: diaryAIMessageV3(message), diaryPage: true });
    } else {
      const diaryPageIndex = messages.findIndex((m) => m.diaryPage);
      if (diaryPageIndex !== -1) {
        messages = messages.slice(0, diaryPageIndex + 1);
      }
      messages.push({ role: 'user', content: diaryAISummaryRecommend(ctx.session.actions[message]) });
    }
    completionText = await getAICompletion(ctx, messages);
    if (
      !completionText ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      cancelTyping();
      await typeMessages(ctx, [systemError()]);
      return;
    }
    if ([notCorrectDiaryMessage()].includes(completionText)) {
      cancelTyping();
      await typeMessages(ctx, [completionText]);
      return;
    }

    if (completionText) {
      cancelTyping();
      await typeMessages(ctx, getMessages(completionText));
      messages.push({ role: 'assistant', content: completionText });
    }

    // Summary
    await ctx.sendChatAction('typing');
    messages.push({ role: 'user', content: diaryAISummary() });
    completionText = await getAICompletion(ctx, messages);
    if (
      !completionText ||
      [notCorrectDiaryMessage()].includes(completionText) ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      cancelTyping();
      await typeMessages(ctx, [systemError()]);
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
    cancelTyping();
    await typeMessages(ctx, [`${diaryUserSummary()}\n${completionText}`], keyboard);
  } catch (error) {
    console.error(error);
  }
  session.messages = messages;
  session.cycles++;
}

const markdownV2 = (message: string): string => message.replace(/(\.|\!|\-)/g, '\\\$1');

const typeMessages = async (
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
}

bot.start(async (ctx) => {
  // reset conversations context for the chat when /start called
  ctx.session = createSession(ctx.session, ctx.chat.id);
  const messages = helloMessage();
  await typeMessages(ctx, messages);
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(buttonIDontKnowWhatToWrite(), BUTTON_WHAT_TO_WRITE),
  ]);
  await typeMessages(ctx, [textIDontKnowWhatToWrite()], keyboard);
});

const feedback = async (ctx: any, message?: string) => {
  console.log('.feedback');
  if (ctx.session.flow !== 'feedback') {
    return false;
  }
  if (ctx.session.feedback.length === 0) {
    const question = feedbackMessage1();
    ctx.session.feedback.push({ question });
    await typeMessages(ctx, [question]);
    return true;
  }
  if (ctx.session.feedback.length === 1) {
    ctx.session.feedback[ctx.session.feedback.length - 1].answer = message;
    const question = feedbackMessage2();
    ctx.session.feedback.push({ question });
    await typeMessages(ctx, [question]);
    return true;
  }
  if (ctx.session.feedback.length === 2) {
    ctx.session.feedback[ctx.session.feedback.length - 1].answer = message;
    const question = feedbackMessage3();
    ctx.session.feedback.push({ question });
    await typeMessages(ctx, [question]);
    return true;
  }
  if (ctx.session.feedback.length >= 3) {
    ctx.session.feedback[ctx.session.feedback.length - 1].answer = message;
    await typeMessages(ctx, [feedbackMessageFinish()]);
    ctx.session.flow = 'diary';
    return true;
  }
  return false;
}

bot.command('feedback', async (ctx) => {
  if (ctx.session.flow !== 'feedback') {
    ctx.session.flow = 'feedback';
  }
  await feedback(ctx);
});

const subscribe = async (ctx: BotContext) => {
  console.log('.subscribe');
  const subscriptionPlan = ctx.session.subscription.type;
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(subscriptionPlan, `pay-${subscriptionPlan}`),
    Markup.button.callback(subscriptionNotReady(), `pay-not-ready`),
  ]);
  ctx.session.subscription.status = 'empty';
  await typeMessages(ctx, [subscriptionHeader()], keyboard);
}

bot.command('subscribe', async (ctx) => {
  await subscribe(ctx);
});

bot.action(/^pay-(.+)$/, async (ctx) => {
  await ctx.editMessageReplyMarkup(undefined);
  const { session } = ctx;
  if (session.subscription.status !== 'empty') {
    return;
  }
  const payMatched = ctx.match.input.match(/^pay-(.+)$/)
  if (payMatched && payMatched[1]) {
    if (payMatched[1] === 'not-ready') {
      ctx.session.subscription.status = 'unsubscribed';
      await typeMessages(ctx, [subscriptionNotSubscribed()]);
    } else {
      ctx.session.subscription.status = 'subscribed';
      await typeMessages(ctx, [subscriptionSubscribed()]);
    }
    return;
  }
});

bot.action(new RegExp(`^${BUTTON_WHAT_TO_WRITE}$`), async (ctx) => {
  await ctx.editMessageReplyMarkup(undefined);
  await typeMessages(ctx, whatToWriteAbout());
});

bot.help((ctx) => typeMessages(ctx, helpMessages()));

bot.on(message('text'), async (ctx) => {
  console.log('text', ctx.message.text);
  const { id: chatId } = ctx.message.chat;
  const isFeedbackFlow = await feedback(ctx, ctx.message.text);
  console.log('isFeedbackFlow', isFeedbackFlow);
  if (isFeedbackFlow) {
    return;
  }
  const { session } = ctx;
  console.log('isFeedbackFlow', isFeedbackFlow);
  if (session.cycles >= subscriptionCycles) {
    await subscribe(ctx);
    return;
  }
  await processForChat(ctx, chatId, ctx.message.text);
});
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.action(/.*/, async (ctx) => {
  await ctx.editMessageReplyMarkup(undefined);
  const { id: chatId } = ctx.update.callback_query.message!.chat;
  const { input: message } = ctx.match;
  const { session } = ctx;
  if (session.cycles >= subscriptionCycles) {
    await subscribe(ctx);
    return;
  }
  await processForChat(ctx, chatId, message);
});
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
