import "dotenv/config";
import Joi from "joi";

const schema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(4004),
  FRONTEND_URL: Joi.string().uri({ allowRelative: false }).default("http://localhost:3001"),
  BACKEND_PUBLIC_URL: Joi.string().uri({ allowRelative: false }).default("http://localhost:4004"),
  DB_HOST: Joi.string().default("127.0.0.1"),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().default("sistem_klinik"),
  DB_USER: Joi.string().default("root"),
  DB_PASSWORD: Joi.string().allow("").default(""),
  DB_SOCKET: Joi.string().allow("").default(""),
  REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).default("redis://localhost:6379"),
  JWT_SECRET: Joi.string().min(24).default("change_this_to_a_long_random_secret"),
  JWT_EXPIRES_IN: Joi.string().default("8h"),
  AUTH_COOKIE_NAME: Joi.string().default("clinic_auth_token"),
  AUTH_COOKIE_MAX_AGE_MS: Joi.number().integer().positive().default(28800000),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

export const appConfig = {
  nodeEnv: value.NODE_ENV as "development" | "test" | "production",
  port: Number(value.PORT),
  frontendUrl: value.FRONTEND_URL as string,
  backendPublicUrl: value.BACKEND_PUBLIC_URL as string,
  redisUrl: value.REDIS_URL as string,
  jwtSecret: value.JWT_SECRET as string,
  jwtExpiresIn: value.JWT_EXPIRES_IN as string,
  authCookieName: value.AUTH_COOKIE_NAME as string,
  authCookieMaxAgeMs: Number(value.AUTH_COOKIE_MAX_AGE_MS),
  database: {
    host: value.DB_HOST as string,
    port: Number(value.DB_PORT),
    name: value.DB_NAME as string,
    user: value.DB_USER as string,
    password: value.DB_PASSWORD as string,
    socket: value.DB_SOCKET as string,
  },
} as const;

export type AppConfig = typeof appConfig;
