const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const { Configuration, OpenAIApi } = require("openai");

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const { BOT_TOKEN, OPENAI_TOKEN } = process.env;

const configuration = new Configuration({
  apiKey: OPENAI_TOKEN,
  organization: 'org-VnU8mAVaDs5y8ap1SDGloM8i',
});
console.log(configuration);
const openai = new OpenAIApi(configuration);

const bot = new Telegraf(BOT_TOKEN);

const conversationContexts = {};

bot.start((ctx) => {
  conversationContexts[ctx.message.chat.id] = undefined;
  ctx.replyWithMarkdown(`
Привет!
Я искусственный интеллект 🤖, который помогает разобраться в сложных ситуциях.
Я работаю только с записями в дневнике, то есть ваше сообщение должно быть похоже на то, что вы написали в своем дневнике о вашем дне или описали ваше состояние и события которые вызвали это состояние
Я постараюсь разобраться в вашей проблеме и дать несколько рекомендаций. Вы можете задавать дополнительные вопросы относительно рекомендаций или сделать новую запись в вашем дневнике
*Важная пометка*: бот работает в режиме изучения поведения пользователей, поэтому все разговоры могут быть записаны и использованы для улучшения продукта, имейте это в виду когда пишете приватную информацию. Мы не будем сохранять идентификаторы пользователей, то есть мы будем анализировать анонимные сообщения.

А теперь напишите вашу первую запись в дневнике. Хотя бы несколько предложений ✍️
`)
});
bot.on(message('text'), async (ctx) => {
  if (!conversationContexts[ctx.message.chat.id]) {
    conversationContexts[ctx.message.chat.id] = [
      { role: "system", content: `
      Твоя роль: ответь на сообщение как будто ты психотерапевт, не говоря что ты действуешь как психотерапевт, учитывая наш бэкграунд. Будь максимально практичным, если даешь совет, то лучше давать конктреные сроки, практики и так далее
      Формат ответа на запись в дневнике:
      Первым абзацем напиши саммари записи в несколько слов, показывая эмоциональный окрас информации. Не используй слово саммари, просто абзац.
      Дальнейший ответ лучше без пунктов, просто текст, в конце спроси могу ли я чем-то еще помочь  или может у вас есть вопросы по моим рекомендациям, скажи что ты можешь более подробно рассказать о своих рекомендациях.
      `},
      { role: "system", content: `
      Твоя роль: ответь на сообщение как будто ты психотерапевт, не говоря что ты действуешь как психотерапевт, учитывая наш бэкграунд. Будь максимально практичным, если даешь совет, то лучше давать конктреные сроки, практики и так далее
      Формат ответа на запись в дневнике:
      Первым абзацем напиши саммари записи в несколько слов, показывая эмоциональный окрас информации. Не используй слово саммари, просто абзац.
      Дальнейший ответ лучше без пунктов, просто текст, в конце спроси могу ли я чем-то еще помочь  или может у вас есть вопросы по моим рекомендациям, скажи что ты можешь более подробно рассказать о своих рекомендациях.
      `},
    ];
  }
  history = conversationContexts[ctx.message.chat.id];
  const messages = [];
  for (const message of history) {
    messages.push(message);
  }

  messages.push({ role: "user", content: ctx.message.text });
  conversationContexts[ctx.message.chat.id] = messages;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
    });

    const completion_text = completion.data.choices[0].message.content;
    ctx.reply(completion_text);

    messages.push({ role: "assistant", content: completion_text });
    conversationContexts[ctx.message.chat.id] = messages;
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
});

bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
