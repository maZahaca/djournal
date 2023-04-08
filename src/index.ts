import { Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { Configuration, OpenAIApi } from 'openai';
import {
  badAIResponse,
  diaryAIMessageV2,
  diaryAIMessageV3,
  diaryAISummary, diaryAISummaryRecommend,
  diaryUserSummary,
  helloMessage,
  notADiaryNote,
  notARealLifeCase,
  notEnoughContext, subscriptionHeader, subscriptionNotReady, subscriptionNotSubscribed, subscriptionSubscribed,
  systemContext,
  systemError,
} from './templates';
import { getSubscription } from "./subscriptions";

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const subscriptionCycles = 1;

const {
  BOT_TOKEN,
  OPENAI_TOKEN,
  OPENAI_ORG,
  OPENAI_MODEL,
} = process.env;

const openai = new OpenAIApi(new Configuration({
  apiKey: OPENAI_TOKEN,
  organization: OPENAI_ORG,
}));

const bot = new Telegraf(BOT_TOKEN!);

type ChatMessageType = { role: 'system' | 'user' | 'assistant', content: string };
type ChatStateType = {
  messages: ChatMessageType[],
  actions: { [key: string]: number },
  cycles: number,
  subscription: {
    type: string,
    status: 'subscribed' | 'unsubscribed',
  },
};

const states: { [key: string]: ChatStateType } = {};

const initStateForChat = (chatId: number) => {
  states[chatId] = {
    actions: {},
    messages: [],
    cycles: 0,
    subscription: {
      ...states[chatId]?.subscription
        ? states[chatId]?.subscription
        : { type: getSubscription(), status: 'unsubscribed' },
    },
  }
};

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
  return text.split("\n").reduce((acc, cur): string[] => {
    const matched = cur.match(/^((\d+\s?\.)|(-\s?))(.+)$/);
    if (matched && matched[4]) {
      acc.push(matched[4].trim());
    }
    return acc;
  }, [] as string[]);
};

const processForChat = async (ctx: any, chatId: number, message: string) => {
  if (!states[chatId]) {
    initStateForChat(chatId);
  }

  const payMatched = message.match(/^pay-(.+)$/)
  console.log('payMatched', payMatched, message);
  if (payMatched && payMatched[1]) {
    if (payMatched[1] === subscriptionNotReady()) {
      ctx.reply(subscriptionNotSubscribed());
    } else {
      ctx.reply(subscriptionSubscribed());
    }
    return;
  }
  if (states[chatId].cycles >= subscriptionCycles) {
    const subscriptionPlan = states[chatId].subscription.type;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback(subscriptionPlan, `pay-${subscriptionPlan}`),
      Markup.button.callback(subscriptionNotReady(), `pay-${subscriptionNotReady()}`),
    ]);
    await ctx.reply(`${subscriptionHeader()}`, keyboard);
    return;
  }

  const messages: ChatMessageType[] = [];
  for (const message of states[chatId].messages) {
    messages.push(message);
  }

  try {
    let completionText: string;
    // first message about long diary record
    if (states[chatId].messages.length === 0) {
      messages.push({ role: 'user', content: diaryAIMessageV3(message) });
    } else {
      messages.push({ role: 'user', content: diaryAISummaryRecommend(message)  });
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
      options.map((o, i) => Markup.button.callback((i + 1).toString(), o))
    );
    await ctx.reply(`${diaryUserSummary()}\n${completionText}`, keyboard);
  } catch (error) {
    console.error(error);
  }
  states[chatId].messages = messages;
  states[chatId].cycles++;
}

bot.start(async (ctx) => {
  // reset conversations context for the chat when /start called
  initStateForChat(ctx.message.chat.id);
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
