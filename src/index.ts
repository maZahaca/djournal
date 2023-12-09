if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import { Telegraf, session } from 'telegraf';
import { Redis } from '@telegraf/session/redis';
import { message } from 'telegraf/filters';
import { Configuration, OpenAIApi } from 'openai';
import { AsyncSessionStore } from 'telegraf/typings/session';
import { AppDataSource as db } from "./data-source";
import { BotContext, SessionType } from "./bot/types";
import { createSession } from "./bot/utils";
import { StartFlow } from "./bot/flows/StartFlow";
import { AbstractFlow, FlowAction } from "./bot/flows/AbstractFlow";
import { FeedbackFlow } from "./bot/flows/FeedbackFlow";
import { WhatToWriteFlow } from "./bot/flows/WhatToWriteFlow";
import { DiaryFlow } from "./bot/flows/DiaryFlow";
import { HelpFlow } from "./bot/flows/HelpFlow";
import { ConsultAIFlow } from "./bot/flows/ConsultAIFlow";
import { RatingAIFlow } from "./bot/flows/RatingAIFlow";
import { SummarizeAIFlow } from "./bot/flows/SummarizeAIFlow";
import { MessageReminder } from "./bot/process/MessageReminder";
import { EmotionalSummarize } from "./bot/process/EmotionalSummarize";
import { DaySummarize } from "./bot/process/DaySummarize";
import { WeekSummarize } from "./bot/process/WeekSummarize";

console.log('Starting bot');

const {
  BOT_TOKEN,
  OPENAI_TOKEN,
  OPENAI_ORG,
  REDIS_HOST,
  REDIS_PORT,
} = process.env;

const openai = new OpenAIApi(new Configuration({
  apiKey: OPENAI_TOKEN,
  organization: OPENAI_ORG,
}));

(async () => {
  await db.initialize();

  const bot = new Telegraf<BotContext>(BOT_TOKEN!);
  const store = Redis<SessionType>({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  }) as unknown as AsyncSessionStore<SessionType>;
  // pass the store to session
  bot.use(session<SessionType, BotContext>({
    store, defaultSession: () => createSession(),
  }));

  const schedules = [
    new MessageReminder(db, bot.telegram),
    new EmotionalSummarize(db, bot.telegram),
    new DaySummarize(db, bot.telegram, openai),
    new WeekSummarize(db, bot.telegram, openai),
  ];

  // Enable graceful stop
  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    console.log('Stopping all schedules');
    schedules.forEach((s) => s.stop());
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
  });

  const flowsStore = new Map<FlowAction, AbstractFlow>();
  const finishFlowCallback = (ctx: BotContext) => {
    ctx.session.flow = FlowAction.DIARY;
  };

  [
    new StartFlow(db, finishFlowCallback),
    new ConsultAIFlow(db, openai, finishFlowCallback),
    new RatingAIFlow(db, openai, finishFlowCallback),
    new SummarizeAIFlow(db, openai, finishFlowCallback),
    new FeedbackFlow(db, finishFlowCallback),
    new WhatToWriteFlow(db, finishFlowCallback),
    new DiaryFlow(db, finishFlowCallback),
    new HelpFlow(db, finishFlowCallback),
  ].forEach((flow) => flowsStore.set(flow.action, flow));

  const processCommand = async (ctx: BotContext, command: string) => {
    const flowAction = command as unknown as FlowAction;
    const flow = command && flowsStore.get(flowAction);
    if (command && flow) {
      ctx.session.flow = flowAction;
      await flow.onAction(ctx);
    }
  }

  await bot
    .action(/.*/, async (ctx) => {
      const flowAction = ctx.match.input;
      console.log('action>', flowAction);
      await processCommand(ctx, flowAction);
    })
    .command(/.*/, async (ctx) => {
      const flowAction = ctx.update.message.text.replace('/', '');
      console.log('command>', flowAction);
      await processCommand(ctx, flowAction);
    })
    .on(message('text'), async (ctx) => {
      const message = ctx.message.text;
      const flow = flowsStore.get(ctx.session.flow);
      if (flow) {
        await flow.onMessage(ctx, message);
      }
    })
    .on(message('sticker'), (ctx) => ctx.reply('👍'))
    .launch();
})();
