import { AbstractFlow, FlowAction } from "./AbstractFlow";
import { feedbackMessage1, feedbackMessage2, feedbackMessage3, feedbackMessageFinish } from "../../templates";
import { Feedback } from "../../database/entity/Feedback";
import { BotContext } from "../types";
import { typeMessages } from "../utils";
import { DataSource } from "typeorm";

export class FeedbackFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.FEEDBACK, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    // ctx.session.flow = this.action;
    ctx.session.feedback = {
      id: null,
      items: [],
    };
    const question = feedbackMessage1();
    if (ctx.session.userId) {
      const refs = await this.db.manager.insert<Feedback>(Feedback, {
        userId: ctx.session.userId,
      });
      ctx.session.feedback.id = refs.identifiers[0].id;
      ctx.session.feedback.items.push({ question });
    }

    // ask first question
    await typeMessages(ctx, [question]);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    switch (ctx.session.feedback.items.length) {
      case 1: { // answer to first question
        if (ctx.session.userId) {
          await this.db.manager.update<Feedback>(Feedback, {
            id: ctx.session.feedback.id,
          }, { like: message });
        }
        ctx.session.feedback.items[ctx.session.feedback.items.length - 1].answer = message;
        const question = feedbackMessage2();
        ctx.session.feedback.items.push({ question });

        // ask second question
        await typeMessages(ctx, [question]);
        break;
      }
      case 2: { // answer to second question
        if (ctx.session.userId) {
          await this.db.manager.update<Feedback>(Feedback, {
            id: ctx.session.feedback.id,
          }, { improve: message });
        }
        ctx.session.feedback.items[ctx.session.feedback.items.length - 1].answer = message;
        const question = feedbackMessage3();
        ctx.session.feedback.items.push({ question });

        // ask third question
        await typeMessages(ctx, [question]);
        break;
      }
      case 3: { // answer to third question
        if (ctx.session.userId) {
          await this.db.manager.update<Feedback>(Feedback, {
            id: ctx.session.feedback.id,
          }, { dislike: message });
        }
        ctx.session.feedback.items[ctx.session.feedback.items.length - 1].answer = message;

        // say thanks and finish flow
        await typeMessages(ctx, [feedbackMessageFinish()]);
        this.finishFlowCallback && this.finishFlowCallback(ctx);
        break;
      }
    }
  }
}
