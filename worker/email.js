// Password reset email. Delivered through Resend when RESEND_API_KEY is set;
// otherwise the link is logged so the flow still works in development and on a
// deployment that has not been given a provider yet.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const COPY = {
  en: {
    subject: 'Reset your Firepath password',
    heading: 'Reset your password',
    body: 'Someone asked to reset the password for your Firepath account. The link below works for one hour.',
    cta: 'Choose a new password',
    ignore: 'If this wasn’t you, you can ignore this email — your password stays the same.',
  },
  pt: {
    subject: 'Repõe a tua palavra-passe do Firepath',
    heading: 'Repõe a tua palavra-passe',
    body: 'Alguém pediu para repor a palavra-passe da tua conta Firepath. O link abaixo funciona durante uma hora.',
    cta: 'Escolher uma nova palavra-passe',
    ignore: 'Se não foste tu, podes ignorar este email — a tua palavra-passe mantém-se.',
  },
}

function renderHtml(copy, url) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f8f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#46544b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e9ede8;border-radius:14px;">
<tr><td style="padding:32px;">
<p style="margin:0 0 18px;font-size:13px;font-weight:700;color:#3f6b4a;">firepath<span style="color:#81ad83;">.</span></p>
<h1 style="margin:0 0 12px;font-size:20px;color:#293a31;">${copy.heading}</h1>
<p style="margin:0 0 22px;font-size:13px;line-height:1.6;">${copy.body}</p>
<a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#4b7a57;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">${copy.cta}</a>
<p style="margin:22px 0 0;font-size:11px;line-height:1.6;color:#98a29b;">${copy.ignore}</p>
<p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#98a29b;word-break:break-all;">${url}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

/**
 * Sends the reset link. Returns whether it was actually delivered — a missing
 * provider is not an error, it just falls back to logging.
 */
export async function sendResetEmail(env, { to, url, language }) {
  const copy = COPY[language] || COPY.en

  if (!env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY is not set — password reset link for ${to}: ${url}`)
    return false
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Firepath <onboarding@resend.dev>',
      to: [to],
      subject: copy.subject,
      html: renderHtml(copy, url),
    }),
  })

  if (!response.ok) {
    console.error(`[email] Resend rejected the message (${response.status}): ${await response.text()}`)
    return false
  }

  return true
}
