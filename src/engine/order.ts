/**
 * Deterministic iteration helpers for simulation code.
 *
 * `Object.keys/values/entries` follow insertion order, which a save, a migration or a rebuilt map can
 * change. Anything that draws seeded random numbers, adds floats or picks "the first match" while walking
 * a record must walk it in a canonical order instead. Ids are compared by UTF-16 code unit, never by
 * locale, so the order is identical on every device.
 */
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const sortedKeys = (record: object): string[] => Object.keys(record).sort(compareIds);

export const sortedEntries = <T>(record: Readonly<Record<string, T>>): Array<[string, T]> =>
  sortedKeys(record).map(key => [key, record[key]]);

export const sortedValues = <T>(record: Readonly<Record<string, T>>): T[] =>
  sortedKeys(record).map(key => record[key]);
