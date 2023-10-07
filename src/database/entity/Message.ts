import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  RelationId
} from "typeorm"
import { User } from "./User";
import { EncryptionTransformer } from "typeorm-encrypted";
import { EncryptionTransformerConfig } from "./encryption-config";

@Entity()
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @ManyToOne(() => User, (user: User) => user.messages)
  user?: User

  @RelationId((e: Message) => e.user)
  @Column({
    type: 'uuid',
    nullable: false,
  })
  userId?: string;

  @Column({
    unique: true,
  })
  telegramMessageId?: string

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @Column({ nullable: true, default: null })
  deletedAt?: Date;

  @Column({
    type: 'text',
    nullable: false,
    transformer: new EncryptionTransformer(EncryptionTransformerConfig)
  })
  content?: string;
}
