import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOtpEmail(to: string, code: string) {
  if (resend) {
    await resend.emails.send({
      from: 'otp@example.com',
      to,
      subject: 'Your login code',
      text: `Your verification code is ${code}`,
    });
  } else {
    console.log(`OTP for ${to}: ${code}`);
  }
}
