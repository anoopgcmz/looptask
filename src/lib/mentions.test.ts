import { describe, it, expect } from 'vitest';
import { parseMentions } from './mentions';

describe('parseMentions', () => {
  it('parses @email', () => {
    const emails = parseMentions('Hello @alice@example.com');
    expect(emails).toEqual(['alice@example.com']);
  });

  it('parses @Name <email>', () => {
    const emails = parseMentions('Hi @Alice <alice@example.com> and @Bob <bob@example.com>');
    expect(emails).toEqual(['alice@example.com', 'bob@example.com']);
  });

  it('deduplicates and handles mix', () => {
    const emails = parseMentions('@a@example.com hi @A <a@example.com>');
    expect(emails).toEqual(['a@example.com']);
  });
});
