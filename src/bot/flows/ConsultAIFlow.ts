import { startOfDay } from 'date-fns';
import { AbstractFlow, FlowAction } from "./AbstractFlow";
import {
  badAIResponse,
  diaryAIMessageV3,
  diaryAISummary,
  diaryUserSummary,
  notCorrectDiaryMessage,
  systemError,
} from "../../templates";
import { BotContext, ChatMessageType } from "../types";
import { startTyping, typeMessages } from "../utils";
import { Between, DataSource } from "typeorm";
import { Markup } from "telegraf";
import { OpenAIApi } from "openai";
import { Message } from "../../database/entity/Message";
import { getAICompletion, getMessages } from "../../gpt/utils";

export class ConsultAIFlow extends AbstractFlow {
  openai!: OpenAIApi;

  constructor(db: DataSource, openai: OpenAIApi, finishFlowCallback?: (ctx: BotContext) => void) {
    super(FlowAction.CONSULT_AI, db, finishFlowCallback);
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
    console.log('msgs', msgs);
    await processForChat(this.openai, ctx, ctx.session.chatId!, msgs);
    this.finishFlowCallback && this.finishFlowCallback(ctx);
  }

  async onMessage(ctx: BotContext, message: string): Promise<void> {
    // nothing happens here
  }
}

const getActionOptions = (text: string): string[] => {
  return text.split('\n').reduce((acc, cur): string[] => {
    const matched = cur.match(/^((\d+\s?\.)|(-\s?))(.+)$/);
    if (matched && matched[4]) {
      acc.push(matched[4].trim());
    }
    return acc;
  }, [] as string[]);
};

const processForChat = async (openai: OpenAIApi, ctx: any, chatId: number, msgs: string[]) => {
  const cancelTyping = await startTyping(ctx);
  const { session } = ctx;
  let messages: ChatMessageType[] = [];
  // for (const message of session.messages) {
  //   messages.push(message);
  // }

  try {
    let completionText: string;
    messages.push({ role: 'user', content: diaryAIMessageV3(msgs.join('\n')), diaryPage: true });
    // // first message about long diary record
    // if (session.messages.length === 0) {
    //   messages.push({ role: 'user', content: diaryAIMessageV3(message), diaryPage: true });
    // } else {
    //   const diaryPageIndex = messages.findIndex((m) => m.diaryPage);
    //   if (diaryPageIndex !== -1) {
    //     messages = messages.slice(0, diaryPageIndex + 1);
    //   }
    //   messages.push({ role: 'user', content: diaryAISummaryRecommend(ctx.session.actions[message]) });
    // }
    await ctx.sendChatAction('typing');
    completionText = await getAICompletion(openai, messages);
    if (
      !completionText ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      cancelTyping();
      await typeMessages(ctx, [systemError()]);
      return;
    }
    if ([notCorrectDiaryMessage()].includes(completionText)) {
      cancelTyping();
      await typeMessages(ctx, [completionText]);
      return;
    }

    if (completionText) {
      cancelTyping();
      await typeMessages(ctx, getMessages(completionText));
      messages.push({ role: 'assistant', content: completionText });
    }

    // Summary
    await ctx.sendChatAction('typing');
    messages.push({ role: 'user', content: diaryAISummary() });
    completionText = await getAICompletion(openai, messages);
    if (
      !completionText ||
      [notCorrectDiaryMessage()].includes(completionText) ||
      completionText.match(new RegExp(`^${badAIResponse()}`))
    ) {
      cancelTyping();
      await typeMessages(ctx, [systemError()]);
      return;
    }
    console.log('summary completion', completionText);
    messages.push({ role: 'assistant', content: completionText });
    const options = getActionOptions(completionText);
    console.log('options', options);
    const keyboard = Markup.inlineKeyboard(
      options.map((o, i) => Markup.button.callback((i + 1).toString(), (i + 1).toString())),
    );
    session.actions = options.reduce((acc, cur, i) => {
      acc[i + 1] = cur;
      return acc;
    }, {} as { [key: string]: string });
    cancelTyping();
    await typeMessages(ctx, [`${diaryUserSummary()}\n${completionText}`], keyboard);
  } catch (error) {
    console.error(error);
  }
  session.messages = messages;
  session.cycles++;
}
