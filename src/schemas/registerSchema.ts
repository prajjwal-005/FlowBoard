import { z } from "zod";

const RESERVED_USERNAMES = [
  "admin",
  "support",
  "root",
  "system",
  "moderator",
  "null",
  "undefined",
  "owner",
];

export const usernameValidation = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Username must start with a letter and contain only letters, numbers, or underscores"
      )
      .refine(
        (val) => !val.includes("__"),
        "Username cannot contain consecutive underscores"
      )
      .refine(
        (val) => !RESERVED_USERNAMES.includes(val),
        "This username is unavailable"
      )
  );

export const registerSchema = z.object({
  username: usernameValidation,
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});