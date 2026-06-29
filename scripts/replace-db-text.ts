#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEARCH_TEXT = "PISES BAJOS";
const REPLACE_TEXT = "PAISES BAJOS";
const TARGET_TABLES = new Set([
  "Mundial2026Campaign",
  "Mundial2026Match",
  "Mundial2026Prize",
  "Mundial2026MatchPrize",
  "Mundial2026Participant",
  "Mundial2026Prediction",
  "Mundial2026RedemptionLog",
]);
const TARGET_TABLE_LIST_SQL = Array.from(TARGET_TABLES)
  .map((table) => `'${table.replace(/'/g, "''")}'`)
  .join(", ");

type ColumnInfo = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
};

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function isTextColumn(dataType: string) {
  return dataType === "text" || dataType === "character varying" || dataType === "character";
}

async function main() {
  const apply = process.argv.includes("--apply");

  const columns = await prisma.$queryRawUnsafe<ColumnInfo[]>(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'character')
      AND table_name IN (${TARGET_TABLE_LIST_SQL})
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name, ordinal_position
  `);

  const textColumns = columns.filter((column) => isTextColumn(column.data_type));

  console.log(`[replace-db-text] searching for "${SEARCH_TEXT}" -> "${REPLACE_TEXT}"`);
  console.log(`[replace-db-text] text columns scanned: ${textColumns.length}`);

  const matches: Array<{ table: string; column: string; count: number }> = [];

  for (const column of textColumns) {
    const tableRef = `${quoteIdent(column.table_schema)}.${quoteIdent(column.table_name)}`;
    const columnRef = quoteIdent(column.column_name);
    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::bigint AS count
       FROM ${tableRef}
       WHERE ${columnRef} LIKE '%' || $1 || '%'`,
      SEARCH_TEXT,
    );

    const count = Number(countRows[0]?.count ?? 0);
    if (count > 0) {
      matches.push({
        table: `${column.table_schema}.${column.table_name}`,
        column: column.column_name,
        count,
      });
    }
  }

  if (matches.length === 0) {
    console.log("[replace-db-text] no matches found");
    return;
  }

  console.log("[replace-db-text] matches found:");
  for (const match of matches) {
    console.log(`  - ${match.table}.${match.column}: ${match.count} row(s)`);
  }

  if (!apply) {
    console.log('[replace-db-text] dry run only. Re-run with --apply to update the database.');
    return;
  }

  let totalUpdated = 0;

  for (const match of matches) {
    const [schema, table] = match.table.split(".");
    const tableRef = `${quoteIdent(schema)}.${quoteIdent(table)}`;
    const columnRef = quoteIdent(match.column);

    const updatedRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `WITH updated AS (
         UPDATE ${tableRef}
         SET ${columnRef} = replace(${columnRef}, $1, $2)
         WHERE ${columnRef} LIKE '%' || $1 || '%'
         RETURNING 1
       )
       SELECT COUNT(*)::bigint AS count FROM updated`,
      SEARCH_TEXT,
      REPLACE_TEXT,
    );

    const updated = Number(updatedRows[0]?.count ?? 0);
    totalUpdated += updated;
    console.log(`[replace-db-text] updated ${match.table}.${match.column}: ${updated} row(s)`);
  }

  console.log(`[replace-db-text] done. total rows updated: ${totalUpdated}`);
}

main()
  .catch((error) => {
    console.error("[replace-db-text] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
