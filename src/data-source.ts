import "reflect-metadata";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

const {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USERNAME,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
} = process.env;

console.log('POSTGRES_HOST', POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DB);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: POSTGRES_HOST,
  port: parseInt(POSTGRES_PORT!, 10),
  username: POSTGRES_USERNAME,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: true,
  logging: true,
  entities: [
    'src/database/entity/**{.ts,.js}',
    'dist/database/entity/**{.ts,.js}',
  ],
  subscribers: [
    'src/database/subscriber/**{.ts,.js}',
    'dist/database/subscriber/**{.ts,.js}',
  ],
  migrations: [
    'src/database/migration/**{.ts,.js}',
    'dist/database/migration/**{.ts,.js}',
  ],
})
