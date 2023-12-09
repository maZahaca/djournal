import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  RelationId, Unique
} from "typeorm"
import { User } from "./User";
import { PagePeriodType } from "./types";

@Entity()
@Unique(['userId', 'period', 'date'])
export class Page {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @ManyToOne(() => User, (user: User) => user.pages)
  user?: User

  @RelationId((e: Page) => e.user)
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

  @Column({type: 'text'})
  content?: string;

  @Column({
    nullable: false,
    type: 'varchar',
    enum: PagePeriodType,
    default: PagePeriodType.DAY,
  })
  period?: PagePeriodType;

  @Column({ nullable: false })
  date?: Date;
}
