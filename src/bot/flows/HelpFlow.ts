import { AbstractFlow, FlowAction } from "./AbstractFlow";
import {
  helpMessages,
} from "../../templates";
import { BotContext } from "../types";
import { typeMessages } from "../utils";
import { DataSource } from "typeorm";

export class HelpFlow extends AbstractFlow {
  constructor(db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.HELP, db, finishFlowCallback);
  }

  async onAction(ctx: BotContext): Promise<void> {
    await typeMessages(ctx, helpMessages());
    this.finishFlowCallback && this.finishFlowCallback(ctx);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}
