const FALLBACK = 'instance';

/** The title in lowercase ASCII letters, digits and dashes: "Amex Catón" becomes `amex-caton`. */
export function slug(title: string): string {
  const folded = title
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const dashed = folded
    .split(/[^a-z0-9]+/u)
    .filter(part => part !== '')
    .join('-');
  return dashed === '' ? FALLBACK : dashed;
}

/**
 * The id of a new instance: the slug of its title, followed by `-2`, `-3`… when another instance
 * of any plugin already uses it. It never changes afterwards.
 */
export function newInstanceId(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slug(title);
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${String(suffix)}`;
  }
  return candidate;
}
