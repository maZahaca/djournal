import { BotContext } from "../types";
import { DataSource } from "typeorm";

export enum FlowAction {
  START = 'start',
  DIARY = 'diary',
  WHAT_TO_WRITE = 'what-to-write',
  HELP = 'help',
  FEEDBACK = 'feedback',
  SUBSCRIBE = 'subscribe',
  CONSULT_AI = 'ask_ai',
  RATING_AI = 'rate_ai',
  SUMMARIZE_AI = 'summarize_ai',
  CONSULT_HUMAN = 'consult',

}

export abstract class AbstractFlow {
  action!: FlowAction;
  db!: DataSource;
  finishFlowCallback?: (ctx: BotContext) => void;

  protected constructor(action: FlowAction, db: DataSource, finishFlowCallback?: (ctx: BotContext) => void) {
    this.action = action;
    this.db = db;
    this.finishFlowCallback = finishFlowCallback;
  }

  abstract onAction(ctx: BotContext): Promise<void>;
  abstract onMessage(ctx: BotContext, message: string): Promise<void>;
}
