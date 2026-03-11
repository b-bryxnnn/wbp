const { execSync } = require("child_process");
const { fork } = require("child_process");
const path = require("path");

function run(label, cmd) {
  console.log(`\n=== ${label} ===`);
  try {
    execSync(cmd, { stdio: "inherit", timeout: 60000 });
    return true;
  } catch (e) {
    console.error(`WARNING: ${label} failed:`, e.message);
    return false;
  }
}

// 1) Push schema to database (create tables)
let dbReady = false;
for (let i = 1; i <= 15; i++) {
  console.log(`\n=== [1/3] Pushing DB schema (attempt ${i}/15) ===`);
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      timeout: 15000,
    });
    dbReady = true;
    break;
  } catch (e) {
    console.error(`DB not ready (attempt ${i}/15), retrying in 3s...`);
    execSync("sleep 3");
  }
}

if (!dbReady) {
  console.error("WARNING: Could not push DB schema. Starting server anyway...");
}

// 2) Seed database (non-fatal)
if (dbReady) {
  run("[2/3] Seeding database", "node prisma/seed.js");
}

// 3) Start the Next.js standalone server
console.log("\n=== [3/3] Starting Next.js server ===");
const serverPath = path.join(__dirname, ".next", "standalone", "server.js");
const child = fork(serverPath, [], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code || 0));

