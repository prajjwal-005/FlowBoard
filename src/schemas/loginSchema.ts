import { z } from "zod";

const usernameBaseSchema = z.string()
  .min(3, { error: "Username must be at least 3 characters" })
  .max(20, { error: "Username must be at most 20 characters" })
  .regex(/^[a-z][a-z0-9_]*$/, { error: "Invalid username format" })
  .refine(
    (val) => !val.includes("__"),
    { error: "Invalid username format" }
  );

export const loginSchema = z.object({
  identifier: z.string({ error: "Email or username is required" })
    .transform((val) => val.trim().toLowerCase()) 
    .pipe(
      z.union([
        z.email(),
        usernameBaseSchema
      ], { error: "Please enter a valid email address or username" })
    ),
  password: z.string({ error: "Password is required" })
    .min(1, { error: "Password cannot be empty" }), 

});

export type loginInput = z.infer<typeof loginSchema>;