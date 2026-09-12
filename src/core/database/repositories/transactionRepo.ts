import { getDb } from '../pool.js';

export interface TransactionRecord {
  id: number;
  guildId: string;
  userId: string;
  type: string;
  amount: number;
  source: string;
  targetId: string | null;
  note: string | null;
  createdAt: Date;
}

export async function logTransaction(
  guildId: string,
  userId: string,
  type: string,
  amount: number,
  source: string,
  targetId?: string | null,
  note?: string | null,
): Promise<TransactionRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO economy_transactions (
      guild_id, user_id, type, amount, source, target_id, note
    ) VALUES (
      ${guildId}, ${userId}, ${type}, ${amount}, ${source}, ${targetId ?? null}, ${note ?? null}
    )
    RETURNING id, guild_id, user_id, type, amount, source, target_id, note, created_at
  `;

  return {
    id: rows[0].id,
    guildId: rows[0].guild_id,
    userId: rows[0].user_id,
    type: rows[0].type,
    amount: Number(rows[0].amount),
    source: rows[0].source,
    targetId: rows[0].target_id,
    note: rows[0].note,
    createdAt: new Date(rows[0].created_at),
  };
}

export async function getTransactionsForGuild(
  guildId: string,
  page: number = 1,
  pageSize: number = 15,
  typeFilter?: string,
): Promise<{ rows: TransactionRecord[]; total: number }> {
  const db = getDb();
  const offset = Math.max(0, (page - 1) * pageSize);

  let countResult;
  let rowsResult;

  if (typeFilter && typeFilter !== 'all') {
    countResult = await db`
      SELECT COUNT(*)::int AS count
      FROM economy_transactions
      WHERE guild_id = ${guildId} AND type = ${typeFilter}
    `;
    rowsResult = await db`
      SELECT id, guild_id, user_id, type, amount, source, target_id, note, created_at
      FROM economy_transactions
      WHERE guild_id = ${guildId} AND type = ${typeFilter}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else {
    countResult = await db`
      SELECT COUNT(*)::int AS count
      FROM economy_transactions
      WHERE guild_id = ${guildId}
    `;
    rowsResult = await db`
      SELECT id, guild_id, user_id, type, amount, source, target_id, note, created_at
      FROM economy_transactions
      WHERE guild_id = ${guildId}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  }

  const rows: TransactionRecord[] = rowsResult.map((r: any) => ({
    id: r.id,
    guildId: r.guild_id,
    userId: r.user_id,
    type: r.type,
    amount: Number(r.amount),
    source: r.source,
    targetId: r.target_id,
    note: r.note,
    createdAt: new Date(r.created_at),
  }));

  return {
    rows,
    total: countResult[0]?.count ?? 0,
  };
}

export async function getTransactionsForUser(
  guildId: string,
  userId: string,
  limit: number = 10,
): Promise<TransactionRecord[]> {
  const db = getDb();
  const rowsResult = await db`
    SELECT id, guild_id, user_id, type, amount, source, target_id, note, created_at
    FROM economy_transactions
    WHERE guild_id = ${guildId} AND (user_id = ${userId} OR target_id = ${userId})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rowsResult.map((r: any) => ({
    id: r.id,
    guildId: r.guild_id,
    userId: r.user_id,
    type: r.type,
    amount: Number(r.amount),
    source: r.source,
    targetId: r.target_id,
    note: r.note,
    createdAt: new Date(r.created_at),
  }));
}
