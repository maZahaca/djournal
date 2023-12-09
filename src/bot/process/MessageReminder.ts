import { DataSource, In } from "typeorm";
import { Telegram } from 'telegraf';
import { AbstractScheduledProcess } from "./AbstractScheduledProcess";
import { User } from "../../database/entity/User";

const messageTemplate = (questions: string[]) => `
Привет! Я думаю, сейчас отлично время подумать о себе :) Если ты не знаешь с чего начать попробуй ответить на вопросы:
${questions.map((q) => `- ${q}`).join("\n")}`;

const questions = [
  'Каким был мой день сегодня? Есть ли что-то, что особенно выделилось?',
  'Что я сегодня узнал о себе?',
  'Какие препятствия я сегодня преодолел?',
  'Какие моменты сегодня меня радовали?',
  'Есть ли что-то, о чем я сегодня жалею или что хотел бы изменить?',
  'Какие чувства я сегодня испытывал больше всего?',
  'Что я сделал сегодня для достижения своих целей?',
  'Как я заботился о своем здоровье и благополучии сегодня?',
  'Есть ли люди или события, которые особенно повлияли на меня сегодня?',
  'Какие мысли больше всего занимают мой разум сегодня?',
  'Что бы я хотел изменить в своей жизни прямо сейчас?',
  'Чему новому я научился сегодня или в этой неделе?',
  'Какое событие сегодня вызвало у меня самую сильную эмоциональную реакцию ~~(положительную или отрицательную)~~?',
  'Что в моей жизни сейчас вызывает стресс или тревогу? Как я мог бы с этим справиться?',
  'Каким бы я хотел видеть свое завтра?',
  'Есть ли сегодняшние моменты, которые я бы хотел запомнить надолго?',
  'Что бы я сделал иначе, если бы знал, что не потерплю неудачи?',
  'Есть ли люди в моей жизни, которым я хотел бы что-то сказать, но не решаюсь?',
  'Какие мои привычки помогают мне в жизни, а какие, возможно, мешают?',
  'Есть ли что-то, чего я боюсь в ближайшем будущем?',
  'Как я мог бы улучшить свои отношения с близкими?',
  'Что меня мотивирует двигаться вперед?',
  'Какие качества я ценю в себе больше всего?',
  'Какими бы я хотел развить свои навыки или знания в ближайшее время?',
  'Что мне дает силы и энергию в повседневной жизни?',
  'Что я мог бы сделать завтра, чтобы сделать свой день лучше?',
  'Есть ли вопросы или проблемы, которые я бы хотел обсудить с кем-то из близких или друзей?',
  'Какие моменты сегодня были особенно ценными для меня и почему?',
  'Если бы я мог отправиться в любое место прямо сейчас, куда бы я поехал?',
];

export class MessageReminder extends AbstractScheduledProcess {
  constructor(db: DataSource, telegram: Telegram) {
    super(db, telegram, '0 19 * * *');
  }

  async execute(): Promise<void> {
    const userIds = await this.db.manager.query<[{ id: string }]>(`select distinct(u.id) as id
                                             from public.user u
                                                      left join message m on m.user_id = u.id
                                             where m.id is null or m.created_at < NOW() - interval '1 day'`);

    const users = await this.db.getRepository(User).findBy({
      id: In(userIds.map((u) => u.id)),
    });


    await users.reduce(async (prev, user) => {
      await prev;
      const msg = messageTemplate([
        questions[Math.floor(Math.random() * questions.length)],
        questions[Math.floor(Math.random() * questions.length)],
      ]);
      await this.telegram.sendMessage(parseInt(user.telegramChatId as string, 10), msg);
    }, Promise.resolve());
  }
}
