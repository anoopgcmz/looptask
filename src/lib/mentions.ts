export function parseMentions(body: string): string[] {
  const emails = new Set<string>();
  const regex = /@(?:([\w.+-]+@[\w.-]+\.[\w-]+)|[^<@\n]*<([\w.+-]+@[\w.-]+\.[\w-]+)>)/g;
  for (const match of body.matchAll(regex)) {
    const email = match[1] || match[2];
    if (email) emails.add(email.toLowerCase());
  }
  return Array.from(emails);
}
