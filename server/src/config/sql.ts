import { QueryTypes } from 'sequelize';
import { sequelize } from './database.js';

type QueryOptions = {
  replacements?: unknown[];
  type?: QueryTypes;
  transaction?: unknown;
};

/**
 * Raw SQL runner for Postgres (Supabase).
 * Call sites keep MySQL-style `?` placeholders; we rewrite to `$1, $2, ...`
 * and pass values as `bind` (Sequelize/Postgres requires `bind` for `$n`,
 * `replacements` would leave `$1` unbound -> "there is no parameter $1").
 */
export const sql = <R = Record<string, any>>(text: string, options: QueryOptions = {}): Promise<R[]> => {
  let index = 0;
  const rewritten = text.replace(/\?(?=(?:[^']*'[^']*')*[^']*$)/g, () => `$${(index += 1)}`);
  const { replacements, ...rest } = options;
  const expected = Array.isArray(replacements) ? replacements.length : 0;
  if (index !== expected) {
    console.error(`[sql] placeholder mismatch: ${index} markers vs ${expected} values :: ${rewritten.slice(0, 160)}`);
  }
  const queryOptions = { ...(rest as object), ...(expected ? { bind: replacements } : {}) };
  return sequelize.query<R[]>(rewritten, queryOptions as never) as unknown as Promise<R[]>;
};
