import {z} from "zod";
import {integerFromEnv} from "@config/env/premitives.js";

const port_bounds = {min : 1, max : 65_535} as const

export const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .optional(),
    PORT: integerFromEnv(5000, port_bounds),
    MONGODB_URI: z
        .string()
        .trim()
        .min(1, { message: "mongodb uri is required" })
        .startsWith("mongodb", { message: "mongodb uri satrts with mongodb" }),
});