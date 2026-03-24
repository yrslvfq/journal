import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, getResetTokenExpiryDate, PASSWORD_RESET_TTL_MINUTES } from "@/lib/password-reset";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

const GENERIC_RESPONSE = {
  success: true,
  message: "If an account with this email exists, a reset link has been sent.",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM;
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
    if (!resendApiKey || !mailFrom || !appUrl) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      );
    }

    const { rawToken, tokenHash } = generateResetToken();
    const expiresAt = getResetTokenExpiryDate();

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const base = appUrl.replace(/\/$/, "");
    const resetLink = `${base}/reset-password?token=${rawToken}`;
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: mailFrom,
      to: user.email,
      subject: "Reset your Flow Journal password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Reset your password</h2>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
              Reset password
            </a>
          </p>
          <p>Or paste this URL into your browser:</p>
          <p>${resetLink}</p>
          <p>This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
