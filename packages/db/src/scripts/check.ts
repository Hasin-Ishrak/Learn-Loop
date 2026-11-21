import { config } from "dotenv";
import { Pool } from "pg";

config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL is required");
  process.exit(1);
}

type Result = { name: string; pass: boolean; detail?: string | undefined };
const results: Result[] = [];
const pass = (name: string, detail?: string) => results.push({ name, pass: true, detail });
const fail = (name: string, detail?: string) => results.push({ name, pass: false, detail });

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });

async function main() {
  let client;
  try {
    client = await pool.connect();

    const r = await client.query("SELECT 1 AS ok");
    if (r.rows[0]?.ok === 1) pass("connection works");
    else fail("connection works", "unexpected result");

    const roleRes = await client.query(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    const { rolsuper, rolbypassrls } = roleRes.rows[0] ?? {};
    if (rolsuper === false) pass("current role is not superuser");
    else fail("current role is not superuser", `rolsuper=${rolsuper}`);
    if (rolbypassrls === false) pass("current role does not have BYPASSRLS");
    else fail("current role does not have BYPASSRLS", `rolbypassrls=${rolbypassrls}`);

    const extRes = await client.query(
      "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm','pgcrypto')",
    );
    const installed = new Set(extRes.rows.map((row: { extname: string }) => row.extname));
    for (const ext of ["vector", "pg_trgm", "pgcrypto"]) {
      if (installed.has(ext)) pass(`extension ${ext} exists`);
      else fail(`extension ${ext} exists`, "not installed");
    }

    let createDenied = false;
    let createError = "";
    try {
      await client.query("BEGIN");
      await client.query("CREATE TABLE __check_perm (id int)");
      await client.query("ROLLBACK");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      createError = String(e);
      if (createError.toLowerCase().includes("permission denied")) createDenied = true;
    }
    if (createDenied) pass("app role cannot CREATE TABLE in public");
    else fail("app role cannot CREATE TABLE in public", createError || "CREATE succeeded");
  } catch (e) {
    fail("connection works", String(e));
  } finally {
    client?.release();
    await pool.end().catch(() => {});
  }

  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}: ${r.name}${r.detail ? " — " + r.detail : ""}`);
    if (!r.pass) allPass = false;
  }
  process.exit(allPass ? 0 : 1);
}

main();
