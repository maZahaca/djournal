import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from "typeorm"
import { EncryptionTransformer } from "typeorm-encrypted";
import { Message } from "./Message";
import { Page } from "./Page";
import { SubscriptionTier } from "./types";
import { EncryptionTransformerConfig } from "./encryption-config";

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
    type: "varchar",
    nullable: true,
    transformer: new EncryptionTransformer(EncryptionTransformerConfig)
  })
  telegramUsername?: string

  @Column({
    type: "varchar",
    nullable: true,
    transformer: new EncryptionTransformer(EncryptionTransformerConfig)
  })
  firstName?: string

  @Column({
    type: "varchar",
    nullable: true,
    transformer: new EncryptionTransformer(EncryptionTransformerConfig)
  })
  lastName?: string

  @Column({
    type: "varchar",
    length: 2,
    nullable: true,
  })
  language?: string

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
