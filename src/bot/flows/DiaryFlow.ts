import { AbstractFlow, FlowAction } from "./AbstractFlow";
import { BotContext, UserChat } from "../types";
import { DataSource } from "typeorm";
import { Message } from "../../database/entity/Message";

export class DiaryFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.DIARY, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    // nothing happens here
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    if (ctx.session.userId) {
      const msg = new Message();
      msg.telegramMessageId = ctx.message!.message_id.toString();
      msg.content = message;
      msg.userId = ctx.session.userId;
      await this.db.manager.save(msg);
    }
  }
}

//   // if (session.cycles >= subscriptionCycles) {
//   //   await subscribe(ctx);
//   //   return;
//   // }
//   // await processForChat(ctx, chatId, ctx.message.text);
// });
