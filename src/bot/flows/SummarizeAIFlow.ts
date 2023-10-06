import { startOfDay } from 'date-fns';
import { AbstractFlow, FlowAction } from "./AbstractFlow";
import {
  pageSummaryAI,
} from "../../templates";
import { BotContext } from "../types";
import { Between, DataSource } from "typeorm";
import { OpenAIApi } from "openai";
import { Message } from "../../database/entity/Message";
import { getAICompletion, getMessages } from "../../gpt/utils";
import { typeMessages } from "../utils";

export class SummarizeAIFlow extends AbstractFlow {
  openai!: OpenAIApi;

  constructor(db: DataSource, openai: OpenAIApi, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.SUMMARIZE_AI, db, finishFlowCallback);
    this.openai = openai;
  }

  async onAction(ctx: BotContext): Promise<void> {
    const now = new Date();
    const messages = await this.db.manager.find<Message>(Message, {
      where: {
        createdAt: Between(startOfDay(now), now),
      }
    });
    const msgs = messages.map((m) => m.content!).filter(Boolean);
    await ctx.sendChatAction('typing');
    const completionText = await getAICompletion(this.openai, ctx, [{ role: 'user', content: pageSummaryAI(msgs.join('\n')) }]);
    await typeMessages(ctx, getMessages(completionText));
    this.finishFlowCallback && this.finishFlowCallback(ctx);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}
