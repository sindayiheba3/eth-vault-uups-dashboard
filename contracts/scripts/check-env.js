const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/check-env.js <sepolia|tenderly>");
  process.exit(1);
}

const placeholders = new Set(["0x", "<fork-id>"]);
const normalizedValue = (value) => (value || "").trim();
const isValid = (value) => {
  const v = normalizedValue(value);
  return v.length > 0 && !placeholders.has(v);
};

const requirementsByTarget = {
  sepolia: ["SEPOLIA_RPC_URL", "PRIVATE_KEY"],
  tenderly: ["TENDERLY_RPC_URL", "PRIVATE_KEY", "PROXY_ADDRESS"]
};

const requiredVars = requirementsByTarget[target];
if (!requiredVars) {
  console.error(`Unsupported target "${target}". Use "sepolia" or "tenderly".`);
  process.exit(1);
}

const missingVars = requiredVars.filter((key) => !isValid(process.env[key]));
if (missingVars.length > 0) {
  console.error(`Missing required environment values for ${target}:`);
  missingVars.forEach((key) => console.error(`- ${key}`));
  console.error("");
  console.error("Fix:");
  console.error("1. Copy contracts/.env.example to contracts/.env");
  console.error(`2. Fill all values required for "${target}"`);
  process.exit(1);
}

console.log(`Environment validation passed for ${target}.`);
