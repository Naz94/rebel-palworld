import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PALWORLD_API_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:8212"),

  PALWORLD_USERNAME: z.string().min(1),

  PALWORLD_PASSWORD: z.string().min(1),

  REBEL_API_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:4000"),

  REBEL_CONNECTOR_TOKEN: z.string().min(20),

  REBEL_SERVER_ID: z.string().uuid(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid connector environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;