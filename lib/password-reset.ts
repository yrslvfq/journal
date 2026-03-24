import crypto from "crypto";

export const PASSWORD_RESET_TTL_MINUTES = 30;

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function getResetTokenExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}
