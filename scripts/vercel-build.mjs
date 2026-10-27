#!/usr/bin/env node
/**
 * Vercel build: generate the Prisma client, apply migrations when a database
 * is configured, then build Next.js.
 *
 * Works with the variable names the common Postgres providers inject:
 *   Neon (Vercel Marketplace): DATABASE_URL (pooled) + DATABASE_URL_UNPOOLED
 *   Supabase / others:         DATABASE_URL + DIRECT_URL
 *   Legacy Vercel Postgres:    POSTGRES_PRISMA_URL + POSTGRES_URL_NON_POOLING
 * Migrations always use the direct (unpooled) connection when one exists.
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };
const pick = (...names) => names.map((n) => env[n]).find(Boolean);

const runtimeUrl = pick("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
const directUrl = pick("DATABASE_URL_UNPOOLED", "DIRECT_URL", "POSTGRES_URL_NON_POOLING") ?? runtimeUrl;

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...env, ...extraEnv } });
  return r.status ?? 1;
}

const line = "─".repeat(64);
const say = (...lines) => console.log(`\n${line}\n${lines.join("\n")}\n${line}\n`);

// 1. Prisma client — needs no database.
if (run("npx", ["prisma", "generate"], { DATABASE_URL: runtimeUrl ?? "postgresql://build:build@localhost:5432/build" }) !== 0) {
  process.exit(1);
}

// 2. Migrations — only when a database is configured.
if (!directUrl) {
  say(
    "⚠  No database configured — skipping migrations.",
    "   The site will deploy and show a setup page until you add one:",
    "   Vercel → Project → Storage → Create Database (Neon), then redeploy.",
  );
} else {
  console.log("Applying database migrations…");
  const status = run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: directUrl });
  if (status !== 0) {
    say(
      "✖  Database migrations failed.",
      "   • Check DATABASE_URL is correct and the database accepts connections.",
      "   • On Neon/Supabase, provide the direct (unpooled) URL as DATABASE_URL_UNPOOLED or DIRECT_URL.",
      "   • The URL usually needs ?sslmode=require.",
    );
    process.exit(status);
  }
}

// 3. Next.js
process.exit(run("npx", ["next", "build"]));
