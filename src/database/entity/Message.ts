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
  content: string;

  @Column({ nullable: true, type: 'decimal' })
  disgust?: number;

  @Column({ nullable: true, type: 'decimal' })
  neutral?: number;

  @Column({ nullable: true, type: 'decimal' })
  anger?: number;

  @Column({ nullable: true, type: 'decimal' })
  interest?: number;

  @Column({ nullable: true, type: 'decimal' })
  fear?: number;

  @Column({ nullable: true, type: 'decimal' })
  sadness?: number;

  @Column({ nullable: true, type: 'decimal' })
  surprise?: number;

  @Column({ nullable: true, type: 'decimal' })
  joy?: number;

  @Column({ nullable: true, type: 'decimal' })
  guilt?: number;
}
