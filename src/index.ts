import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { Configuration, OpenAIApi } from 'openai';
import { diaryAIMessageV2, diaryAIMessageV3, helloMessage, systemContext } from './templates';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

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

const conversationContexts: { [key: string]: ChatMessageType[] } = {};

bot.start(async (ctx) => {
  // reset conversations context for the chat when /start called
  if (conversationContexts[ctx.message.chat.id]) {
    delete conversationContexts[ctx.message.chat.id];
  }
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
  await ctx.sendChatAction('typing');

  if (!conversationContexts[chatId]) {
    conversationContexts[chatId] = [
      // { role: 'system', content: systemContext() },
    ];
  }
  const messages: ChatMessageType[] = [];
  for (const message of conversationContexts[chatId]) {
    messages.push(message);
  }

  messages.push({ role: 'user', content: diaryAIMessageV3(ctx.message.text) });
  conversationContexts[chatId] = messages;

  try {
    console.log('messages', messages);
    const completion = await openai.createChatCompletion({
      model: OPENAI_MODEL!,
      messages: messages,
    });

    const completionText = completion!.data!.choices[0].message!.content;
    ctx.reply(completionText);
    console.log('completionText', completionText);

    messages.push({ role: 'assistant', content: completionText });
    conversationContexts[chatId] = messages;
  } catch (error) {
    console.error(error);
  }
});

bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
