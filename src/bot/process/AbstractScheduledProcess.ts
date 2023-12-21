import { DataSource } from "typeorm";
import { Telegram } from "telegraf";
import { FlowAction } from "../flows/AbstractFlow";
import * as cron from "node-cron";

export abstract class AbstractScheduledProcess {
  protected db: DataSource;
  protected bot: FlowAction;
  protected telegram: Telegram;
  protected schedule: string;
  protected timezone = 'Europe/Moscow';
  protected task?: cron.ScheduledTask;

  constructor(db: DataSource, telegram: Telegram, schedule?: string) {
    this.db = db;
    this.telegram = telegram;
    if (schedule) {
      this.schedule = schedule;
    }
    console.log('Registered scheduled task for', this.constructor.name, this.schedule);
    if (this.schedule) {
      this.task = cron.schedule(this.schedule, () => {
        console.log('Executing scheduled process', this.constructor.name);
        this.execute();
      }, {
        timezone: this.timezone
      });
    }
  }

  abstract execute(): Promise<void>;

  stop(): void {
    if (this.task) {
      this.task.stop();
    }
  }
}
