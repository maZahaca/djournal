import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from "typeorm"
import { Message } from "./Message";
import { Page } from "./Page";
import { SubscriptionTier } from "./types";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({
    unique: true,
  })
  telegramChatId?: string

  @Column({
    unique: true,
  })
  telegramUsername?: string

  @Column()
  firstName?: string

  @Column()
  lastName?: string

  @Column({
    nullable: false,
    type: 'varchar',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  tier?: SubscriptionTier;

  @OneToMany(() => Message, (m) => m.user)
  messages?: Message[]

  @OneToMany(() => Page, (page) => page.user)
  pages?: Page[]
}
