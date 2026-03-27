/**
 * Normalizes a first and last name into a base username string.
 * @param firstName The first name to normalize
 * @param lastName The last name to normalize
 * @returns A normalized base username string
 */
export const normalizeUsernameBase = (firstName: string, lastName: string) => {
  const base = `${firstName}${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replaceAll(/[^a-z0-9]/g, ""); // rimuove simboli

  return base;
};

/**
 * Generates the next available username based on a base and a list of existing usernames.
 * @param {string} base - The base username to use for generation.
 * @param {string[]} usernames - An array of existing usernames to check against.
 * @returns {string} The next available username.
 */

export const nextUsernameFromExisting = (base: string, usernames: string[]) => {
  // accetta: base, base1, base2, ...
  let max = -1;

  for (const u of usernames) {
    if (u === base) {
      max = Math.max(max, 0);
      continue;
    }
    const m = u.match(new RegExp(`^${base}(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }

  // se max = -1 => nessuno esiste, uso base
  // se max = 0 => esiste base, prossimo è base1
  return max < 0 ? base : `${base}${max + 1}`;
};
