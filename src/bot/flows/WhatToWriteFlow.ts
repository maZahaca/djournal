import { AbstractFlow, FlowAction } from "./AbstractFlow";
import {
  buttonIDontKnowWhatToWrite,
  suggestionWhatToWriteAbout,
  whatToWriteAbout
} from "../../templates";
import { BotContext } from "../types";
import { typeMessages } from "../utils";
import { DataSource } from "typeorm";
import { Markup } from "telegraf";

export class WhatToWriteFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.WHAT_TO_WRITE, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    await ctx.editMessageReplyMarkup(undefined);
    const message = whatToWriteAbout()[Math.floor(Math.random() * whatToWriteAbout().length)];
    await typeMessages(ctx, ([] as string[]).concat(suggestionWhatToWriteAbout(), message), Markup.inlineKeyboard([
      Markup.button.callback(buttonIDontKnowWhatToWrite(), FlowAction.WHAT_TO_WRITE),
    ]));
    this.finishFlowCallback && this.finishFlowCallback(ctx);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}
