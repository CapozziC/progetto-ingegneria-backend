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
  let max = -1;

  const regex = new RegExp(String.raw`^${base}(\d+)$`);

  for (const u of usernames) {
    if (u === base) {
      max = Math.max(max, 0);
      continue;
    }

    const match = regex.exec(u);

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return max < 0 ? base : `${base}${max + 1}`;
};
