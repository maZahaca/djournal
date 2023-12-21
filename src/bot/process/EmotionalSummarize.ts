import { Between, DataSource } from "typeorm";
import { Telegram } from 'telegraf';
import { AbstractScheduledProcess } from "./AbstractScheduledProcess";
import { Message } from "../../database/entity/Message";
import { getMessageEmotions } from "../../huggingface/emotions";

const findEmotionValue = (
  emotions: { label: string; score: number }[], label: string
) => emotions.find((e) => e.label === label)?.score;

const {
  SCHEDULE_EMOTIONAL_SUMMARIZE = '0 19 * * *',
} = process.env;

export class EmotionalSummarize extends AbstractScheduledProcess {
  constructor(db: DataSource, telegram: Telegram) {
    super(db, telegram, SCHEDULE_EMOTIONAL_SUMMARIZE);
  }

  async execute(): Promise<void> {
    // get messages for last 7 days
    const messages = await this.db.getRepository<Message>(Message).find({
      where: { createdAt: Between(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), new Date())},
    });

    const emotions = await getMessageEmotions(messages.map((m) => m.content));

    await emotions.reduce(async (prev: Promise<void>, cur: { label: string; score: number }[], index: number) => {
      await prev;
      if (messages[index]) {
        messages[index].disgust = findEmotionValue(cur, 'disgust');
        messages[index].neutral = findEmotionValue(cur, 'neutral');
        messages[index].anger = findEmotionValue(cur, 'anger');
        messages[index].interest = findEmotionValue(cur, 'interest');
        messages[index].fear = findEmotionValue(cur, 'fear');
        messages[index].sadness = findEmotionValue(cur, 'sadness');
        messages[index].surprise = findEmotionValue(cur, 'surpise');
        messages[index].joy = findEmotionValue(cur, 'joy');
        messages[index].guilt = findEmotionValue(cur, 'guilt');
        await this.db.getRepository<Message>(Message).save(messages[index]);
      }
    }, Promise.resolve());
  }
}
