import { DB_ENCRYPTION_KEY } from "../const";

export const EncryptionTransformerConfig = {
  key: DB_ENCRYPTION_KEY,
  algorithm: 'aes-256-gcm',
  ivLength: 16,
};
