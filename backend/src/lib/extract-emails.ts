/** Extract unique email addresses from free text (job descriptions, etc.). */

const EMAIL_RE =
  /[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/g;

const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'email.com',
  'domain.com',
  'sentry.io',
  'wixpress.com',
  'schema.org',
  'googleapis.com',
  'gstatic.com',
  'sentry-next.wixpress.com',
]);

const BLOCKED_LOCAL = new Set([
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
]);

export function extractEmailsFromText(text: string | null | undefined): string[] {
  if (!text) return [];

  const found = text.match(EMAIL_RE) ?? [];
  const unique = new Set<string>();

  for (const raw of found) {
    const email = raw.toLowerCase().replace(/[.,;:)+>]+$/g, '');
    const at = email.lastIndexOf('@');
    if (at < 1) continue;

    const local = email.slice(0, at);
    const domain = email.slice(at + 1);

    if (BLOCKED_DOMAINS.has(domain)) continue;
    if (BLOCKED_LOCAL.has(local)) continue;
    if (local.includes('noreply') || local.includes('no-reply')) continue;
    // Skip image/asset-looking locals
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(local)) continue;

    unique.add(email);
  }

  return [...unique];
}

export function extractEmailsFromTexts(texts: Array<string | null | undefined>): string[] {
  const all = new Set<string>();
  for (const t of texts) {
    for (const e of extractEmailsFromText(t)) all.add(e);
  }
  return [...all];
}
