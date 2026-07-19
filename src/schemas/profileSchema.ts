import { z } from "zod";
const RESERVED_PROFILENAME = [
  "admin",
  "support",
  "root",
  "system",
  "moderator",
  "null",
  "undefined",
  "owner",
];

export const profileValidation = z
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
        "Profile name cannot contain consecutive underscores"
      )
      .refine(
        (val) => !RESERVED_PROFILENAME.includes(val),
        "This profile name is unavailable"
      )
  );

export const updateProfileSchema = z.object({
  nickname: profileValidation.optional(),
  avatarUrl: z.url().nullable().optional(),
}).refine((data) => data.nickname !== undefined || data.avatarUrl !== undefined, {
  message: "At least one field must be provided",
});