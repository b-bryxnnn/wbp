const { execSync, spawn } = require("child_process");
const path = require("path");

// Show environment info for debugging
console.log("=========================================");
console.log("=== WBP Vote App — Production Start  ===");
console.log("=========================================");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  // Mask password in the URL for safe logging
  const masked = process.env.DATABASE_URL.replace(
    /\/\/([^:]+):([^@]+)@/,
    "//$1:****@"
  );
  console.log("DATABASE_URL:", masked);
}
console.log("CWD:", process.cwd());
console.log("");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exec(cmd) {
  execSync(cmd, { stdio: "inherit", timeout: 30000 });
}

async function main() {
  // 1) Push schema to database (create tables)
  let dbReady = false;
  for (let i = 1; i <= 15; i++) {
    console.log(`\n=== [1/3] Pushing DB schema (attempt ${i}/15) ===`);
    try {
      exec("npx prisma db push --skip-generate --accept-data-loss");
      console.log("DB schema pushed successfully!");
      dbReady = true;
      break;
    } catch (e) {
      console.error(`DB not ready (attempt ${i}/15):`, e.message);
      if (i < 15) {
        console.log("Retrying in 3s...");
        await sleep(3000);
      }
    }
  }

  if (!dbReady) {
    console.error(
      "WARNING: Could not push DB schema after 15 attempts. Starting server anyway..."
    );
  }

  // 2) Seed database (non-fatal)
  if (dbReady) {
    console.log("\n=== [2/3] Seeding database ===");
    try {
      exec("node prisma/seed.js");
      console.log("Seed completed!");
    } catch (e) {
      console.error("WARNING: Seed failed (may already be seeded):", e.message);
    }
  }

  // 3) Start the Next.js standalone server
  console.log("\n=== [3/3] Starting Next.js server ===");
  const serverPath = path.join(
    __dirname,
    ".next",
    "standalone",
    "server.js"
  );
  console.log("Server path:", serverPath);

  const child = spawn("node", [serverPath], {
    stdio: "inherit",
    env: { ...process.env },
  });

  // Forward signals for graceful shutdown
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));

  child.on("error", (err) => {
    console.error("Server process error:", err);
    process.exit(1);
  });

  child.on("exit", (code) => {
    console.log("Server exited with code:", code);
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
