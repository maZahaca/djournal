import { Between, DataSource } from "typeorm";
import { Telegram } from 'telegraf';
import { AbstractScheduledProcess } from "./AbstractScheduledProcess";
import { startOfWeek, endOfWeek } from 'date-fns';
import { getAICompletion, getMessages } from "../../gpt/utils";
import { pageSummaryAI } from "../../templates";
import { OpenAIApi } from "openai";
import { Page } from "../../database/entity/Page";
import { PagePeriodType } from "../../database/entity/types";
import { User } from "../../database/entity/User";

const messageTemplate = (message: string) => `Привет! Ты супер! Я вижу наше общение очень продуктивным. Я еще раз прочитал твои сообщения за неделю и подсветил, на мой взгляд, самое важное
${message}`;

const {
  SCHEDULE_WEEK_SUMMARIZE = '0 19 * * 0',
} = process.env;

export class WeekSummarize extends AbstractScheduledProcess {
  readonly openai;
  constructor(db: DataSource, telegram: Telegram, openai: OpenAIApi) {
    super(db, telegram, SCHEDULE_WEEK_SUMMARIZE);
    this.openai = openai;
  }

  async execute(): Promise<void> {
    // get messages for last 7 days
    const now = new Date();
    const messages = await this.db.getRepository<Page>(Page).find({
      where: { createdAt: Between(startOfWeek(now), endOfWeek(now))},
    });

    console.log('msgs', messages, startOfWeek(now), endOfWeek(now));

    const userMessages = messages.reduce((map, cur) => {
      if (cur.content) {
        const msgs = map.get(cur.userId!) || [];
        map.set(cur.userId!, [
          ...msgs,
          cur,
        ]);
      }
      return map;
    }, new Map<string, Page[]>());

    console.log('msgs', userMessages);

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
        page.period = PagePeriodType.WEEK;
        page.date = endOfWeek(now);
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
