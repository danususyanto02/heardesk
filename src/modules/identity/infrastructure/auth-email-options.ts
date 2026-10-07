import type { EmailSender } from "../domain/email";

export function authEmailOptions(sender: EmailSender) {
  return {
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => sender.send({ to: user.email, subject: "Verify your HearDesk email", text: `Verify your email address using this link:\n${url}\nThis link expires in one hour.` }),
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => sender.send({ to: user.email, subject: "Reset your HearDesk password", text: `Reset your password using this link:\n${url}\nIf you did not request this, ignore this email.` }),
  };
}
