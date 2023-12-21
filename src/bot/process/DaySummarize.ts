import { Between, DataSource } from "typeorm";
import { Telegram } from 'telegraf';
import { AbstractScheduledProcess } from "./AbstractScheduledProcess";
import { Message } from "../../database/entity/Message";
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { getAICompletion, getMessages } from "../../gpt/utils";
import { pageSummaryAI } from "../../templates";
import { OpenAIApi } from "openai";
import { Page } from "../../database/entity/Page";
import { PagePeriodType } from "../../database/entity/types";
import { User } from "../../database/entity/User";

const {
  SCHEDULE_DAY_SUMMARIZE = '0 7 * * *',
} = process.env;

const messageTemplate = (message: string) => `Доброе утро! Я прочитал твое сообщение и подсветил, на мой взгляд, самое важное
${message}`;

export class DaySummarize extends AbstractScheduledProcess {
  readonly openai;
  constructor(db: DataSource, telegram: Telegram, openai: OpenAIApi) {
    super(db, telegram, SCHEDULE_DAY_SUMMARIZE);
    this.openai = openai;
  }

  async execute(): Promise<void> {
    // get messages for last 7 days
    const now = new Date();
    const messages = await this.db.getRepository<Message>(Message).find({
      where: { createdAt: Between(startOfDay(addDays(now, -1)), endOfDay(addDays(now, -1)))},
    });

    const userMessages = messages.reduce((map, cur) => {
      if (cur.content) {
        const msgs = map.get(cur.userId!) || [];
        map.set(cur.userId!, [
          ...msgs,
          cur,
        ]);
      }
      return map;
    }, new Map<string, Message[]>());

    for (const [userId, msgs] of userMessages) {
      const user = await this.db.getRepository<User>(User).findOne({ where: { id: userId } });
      if (!user) {
        continue;
      }
      const completionText = await getAICompletion(this.openai, [{ role: 'user', content: pageSummaryAI(msgs.map((m) => m.content).join('\n')) }]);
      const messages = getMessages(completionText);

      try {
        const page = new Page();
        page.userId = userId;
        page.content = completionText;
        page.period = PagePeriodType.DAY;
        page.date = startOfDay(addDays(now, -1));
        await this.db.manager.save(page);
        await this.telegram.sendMessage(user.telegramChatId!, messageTemplate(messages.join('\n')));
      } catch (err: any) {
        if (err.code !== 23505) {
          throw err;
        }
      }
    }
  }
}
