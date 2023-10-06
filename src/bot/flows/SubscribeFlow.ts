import { AbstractFlow, FlowAction } from "./AbstractFlow";
import {
  buttonIDontKnowWhatToWrite,
  helloMessage, textIDontKnowWhatToWrite
} from "../../templates";
import { BotContext, UserChat } from "../types";
import { createSession, typeMessages } from "../utils";
import { DataSource } from "typeorm";
import { User } from "../../database/entity/User";
import { Markup } from "telegraf";

export class SubscribeFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.SUBSCRIBE, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    // nothing happens here
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}

// // const subscribe = async (ctx: BotContext) => {
// //   const subscriptionPlan = ctx.session.subscription.type;
// //   const keyboard = Markup.inlineKeyboard([
// //     Markup.button.callback(subscriptionPlan, `pay-${subscriptionPlan}`),
// //     Markup.button.callback(subscriptionNotReady(), `pay-not-ready`),
// //   ]);
// //   ctx.session.subscription.status = 'empty';
// //   await typeMessages(ctx, [subscriptionHeader()], keyboard);
// // }
//
// // bot.command('subscribe', async (ctx) => {
// //   await subscribe(ctx);
// // });
// //
// // bot.action(/^pay-(.+)$/, async (ctx) => {
// //   await ctx.editMessageReplyMarkup(undefined);
// //   const { session } = ctx;
// //   if (session.subscription.status !== 'empty') {
// //     return;
// //   }
// //   const payMatched = ctx.match.input.match(/^pay-(.+)$/)
// //   if (payMatched && payMatched[1]) {
// //     if (payMatched[1] === 'not-ready') {
// //       ctx.session.subscription.status = 'unsubscribed';
// //       await typeMessages(ctx, [subscriptionNotSubscribed()]);
// //     } else {
// //       ctx.session.subscription.status = 'subscribed';
// //       await typeMessages(ctx, [subscriptionSubscribed()]);
// //     }
// //     return;
// //   }
// // });

// bot.action(/.*/, async (ctx) => {
//   await ctx.editMessageReplyMarkup(undefined);
//   const { id: chatId } = ctx.update.callback_query.message!.chat;
//   const { input: message } = ctx.match;
//   const { session } = ctx;
//   if (session.cycles >= subscriptionCycles) {
//     // await subscribe(ctx);
//     return;
//   }
//   await processForChat(ctx, chatId, message);
// });
