import fs from "node:fs";
import path from "node:path";

/**
 * Synchronizes Prisma SQLite migrations into Cloudflare D1 migrations.
 * D1 expects sequential flat files: migrations/0001_<name>.sql, migrations/0002_<name>.sql
 */
const PRISMA_MIGRATIONS_DIR = path.resolve(process.cwd(), "prisma/sqlite/migrations");
const D1_MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

export function syncD1Migrations(): void {
  if (!fs.existsSync(PRISMA_MIGRATIONS_DIR)) {
    console.error(`Prisma SQLite migrations directory not found at ${PRISMA_MIGRATIONS_DIR}`);
    return;
  }

  if (!fs.existsSync(D1_MIGRATIONS_DIR)) {
    fs.mkdirSync(D1_MIGRATIONS_DIR, { recursive: true });
  }

  // Get all migration subdirectories sorted chronologically
  const entries = fs
    .readdirSync(PRISMA_MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  console.log(`Found ${entries.length} Prisma SQLite migrations.`);

  entries.forEach((dirName, index) => {
    const migrationSqlPath = path.join(PRISMA_MIGRATIONS_DIR, dirName, "migration.sql");
    if (!fs.existsSync(migrationSqlPath)) {
      return;
    }

    const migrationNumber = String(index + 1).padStart(4, "0");
    // Strip timestamp prefix if present (e.g., 20261102120000_init -> init)
    const sanitizedName = dirName.replace(/^\d+_/, "") || "migration";
    const targetFileName = `${migrationNumber}_${sanitizedName}.sql`;
    const targetFilePath = path.join(D1_MIGRATIONS_DIR, targetFileName);

    const sqlContent = fs.readFileSync(migrationSqlPath, "utf-8");
    fs.writeFileSync(targetFilePath, sqlContent, "utf-8");
    console.log(`Synced: ${dirName} -> migrations/${targetFileName}`);
  });

  console.log(`D1 migrations up to date in ${D1_MIGRATIONS_DIR}`);
}

syncD1Migrations();
