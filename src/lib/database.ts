import type { D1Database } from "@cloudflare/workers-types";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaClient as SqliteClient } from "@/generated/prisma-sqlite/client";

// Dossier keeps its data in PostgreSQL, Cloudflare D1, or in an SQLite file when
// DATABASE_URL is one ("file:/data/dossier.db"), for a single container
// without a database server. The SQLite schema is made from the PostgreSQL
// one (prisma/sqlite), so both clients have the same models, and the code
// uses the PostgreSQL client's types for both.

/** Whether `url` names an SQLite file or D1 rather than an external PostgreSQL server. */
export function isSqliteUrl(url: string): boolean {
  return url.startsWith("file:") || url === "d1" || url.startsWith("d1:");
}

function getCloudflareEnvSync(): { DB?: D1Database; HYPERDRIVE?: { connectionString: string } } | null {
  try {
    // Dynamic require so non-Cloudflare/Node builds don't fail if opennext is not active
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext({ async: false });
    return (ctx?.env as { DB?: D1Database; HYPERDRIVE?: { connectionString: string } }) ?? null;
  } catch {
    return null;
  }
}

/** A client for the database at `url`. */
export function createPrismaClient(url: string): PrismaClient {
  const cf = getCloudflareEnvSync();

  // 1. Cloudflare D1 Database binding
  if (cf?.DB) {
    const adapter = new PrismaD1(cf.DB);
    return new SqliteClient({ adapter }) as unknown as PrismaClient;
  }

  // 2. Cloudflare Hyperdrive connection pooling
  if (cf?.HYPERDRIVE?.connectionString) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: cf.HYPERDRIVE.connectionString }) });
  }

  // 3. PostgreSQL or local SQLite
  if (!isSqliteUrl(url)) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }

  return new SqliteClient({ adapter: new OneAtATime({ url: url.startsWith("file:") ? url : "file:/tmp/dossier.db" }) }) as unknown as PrismaClient;
}

type Adapter = Awaited<ReturnType<PrismaBetterSqlite3["connect"]>>;

/**
 * better-sqlite3 has a single connection, and Prisma's adapter only makes
 * transactions wait for each other: a query from elsewhere while one is open
 * would run inside it, and be undone with it. Here every query waits until
 * the open transaction has ended.
 */
class OneAtATime extends PrismaBetterSqlite3 {
  async connect(): Promise<Adapter> {
    const adapter = await super.connect();
    let last = Promise.resolve();
    /** Waits for the turns before; returns what ends this one. */
    const turn = async () => {
      const before = last;
      let end!: () => void;
      last = new Promise((resolve) => (end = resolve));
      await before;
      return end;
    };
    const alone =
      <A extends unknown[], R>(call: (...args: A) => Promise<R>) =>
      async (...args: A) => {
        const end = await turn();
        try {
          return await call(...args);
        } finally {
          end();
        }
      };

    return Object.assign(Object.create(adapter), {
      queryRaw: alone(adapter.queryRaw.bind(adapter)),
      executeRaw: alone(adapter.executeRaw.bind(adapter)),
      executeScript: alone(adapter.executeScript.bind(adapter)),
      async startTransaction(...args: Parameters<Adapter["startTransaction"]>) {
        const end = await turn();
        try {
          const transaction = await adapter.startTransaction(...args);
          const ending = (call: () => Promise<void>) => async () => {
            try {
              await call();
            } finally {
              end();
            }
          };
          return Object.assign(Object.create(transaction), {
            commit: ending(() => transaction.commit()),
            rollback: ending(() => transaction.rollback()),
          });
        } catch (error) {
          end();
          throw error;
        }
      },
    } satisfies Partial<Adapter>);
  }
}
