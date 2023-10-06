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

@Entity()
export class Feedback {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @ManyToOne(() => User, (user: User) => user.messages)
  user?: User

  @RelationId((e: Feedback) => e.user)
  @Column({
    type: 'uuid',
    nullable: false,
  })
  userId?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @Column({ nullable: true, default: null })
  deletedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
  })
  like?: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  improve?: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  dislike?: string | null;
}
