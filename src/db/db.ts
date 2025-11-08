import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

// ensure db exists
if (!fs.existsSync("./data/mydb.sqlite")) {
  // run bun prisma migrate deploy with child_process
  console.log("Database not found, creating a new one...");
  execSync("bun prisma migrate deploy");
}

// The db version before we switched to Prisma
const prisma = new PrismaClient();
const legacyVersion = await prisma.$queryRaw<{ user_version: bigint }[]>`PRAGMA user_version;`;
if (legacyVersion[0]?.user_version === 1n) {
  // close prisma connection
  await prisma.$disconnect();
  // Existing legacy database found, needs migration
  console.log("Legacy database found. Skipping initial migration...");
  execSync("bun prisma migrate resolve --applied 0_init");
  // reconnect prisma
  await prisma.$connect();
  // set user_version to 2
  await prisma.$executeRaw`PRAGMA user_version = 2;`;
}

console.log("Running database migrations...");

// run any pending migrations
await prisma.$disconnect();
execSync("bun prisma migrate deploy");
await prisma.$connect();

await prisma.$queryRaw`PRAGMA journal_mode = WAL;`.catch((e) => {
  console.error("Failed to set journal mode to WAL:", e);
});

export default prisma;
