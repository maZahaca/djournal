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

export class StartFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.START, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    // reset conversations context for the chat when /start called
    const chat = (ctx.chat as unknown as UserChat);
    const from = (ctx.from as unknown as UserChat);
    const refs = await this.db.manager.upsert<User>(User, {
      telegramChatId: chat.id.toString(),
      telegramUsername: chat.username,
      firstName: chat.first_name,
      lastName: chat.last_name,
      language: from.language_code,
    }, ['telegramChatId']);

    const userId = refs.identifiers[0].id;
    ctx.session = createSession(ctx.session, ctx.chat!.id, userId);

    await typeMessages(ctx, helloMessage());
    await typeMessages(ctx, [textIDontKnowWhatToWrite()], Markup.inlineKeyboard([
      Markup.button.callback(buttonIDontKnowWhatToWrite(), FlowAction.WHAT_TO_WRITE),
    ]));
    this.finishFlowCallback && this.finishFlowCallback(ctx);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}
