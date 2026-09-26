// Disclosure guard: what must never be published (see CONTEXT.md, "Proof point").
// Generic patterns live here; employer-specific sensitive terms live in a gitignored
// local file so the public repo never names them.
import { existsSync, readFileSync } from 'node:fs';

const localFile = new URL('./disclosure.local.json', import.meta.url);

export const localTerms = existsSync(localFile)
  ? JSON.parse(readFileSync(localFile, 'utf8')).terms
  : null;

const patterns = [
  { name: 'phone number', re: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/ },
  { name: 'job-search language', re: /open to (work|opportunities|new roles)|looking for (a|my next|new)|actively (seeking|looking)|job search/i },
  { name: 'street address', re: /\d+\s+\w+\s+(street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|blvd)\b/i },
];

/** Returns a list of human-readable violations found in the text. */
export function findDisclosures(text) {
  const found = patterns.filter((p) => p.re.test(text)).map((p) => `${p.name}: ${text.match(p.re)[0]}`);
  for (const term of localTerms || []) {
    if (text.toLowerCase().includes(term.toLowerCase())) found.push(`sensitive term: ${term}`);
  }
  return found;
}
