import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 10;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Compared against when no account matches, so "unknown user" costs the same
// as "wrong password" and response time can't be used to enumerate accounts.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);