import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(name, email) {
    await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Welcome!',
        html: `<p>Hi ${name}, thanks for signing up!</p>`
    });
}