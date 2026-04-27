const path = require("path");
const { spawnSync } = require("child_process");

const outputPath = "contracts/aderyn_report.md";

const printHelp = () => {
  console.log("Usage: npm run aderyn:wsl [-- --install]");
  console.log("");
  console.log("Options:");
  console.log("  --install   Install/update Aderyn in WSL before running the scan");
};

const toWslPath = (windowsPath) => {
  const normalized = path.resolve(windowsPath).replace(/\\/g, "/");
  const drive = normalized.slice(0, 2);
  if (!/^[A-Za-z]:$/.test(drive)) {
    throw new Error(`Expected an absolute Windows path, received: ${windowsPath}`);
  }

  const driveLetter = drive[0].toLowerCase();
  const remainder = normalized.slice(2);
  return `/mnt/${driveLetter}${remainder}`;
};

const run = (file, args) =>
  spawnSync(file, args, {
    stdio: "inherit",
    windowsHide: true
  });

const runCapture = (file, args) =>
  spawnSync(file, args, {
    encoding: "utf8",
    windowsHide: true
  });

const cleanOutput = (value) => (value || "").replace(/\u0000/g, "").replace(/\r/g, "");

const getAvailableDistros = () => {
  const list = runCapture("wsl", ["-l", "-q"]);
  if (list.status !== 0) {
    return [];
  }

  return cleanOutput(list.stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const resolveDistro = () => {
  if (process.env.WSL_DISTRO) {
    return process.env.WSL_DISTRO;
  }

  const distros = getAvailableDistros();
  const usable = distros.filter((name) => !/^docker-desktop(-data)?$/i.test(name));

  if (usable.includes("Ubuntu-24.04")) {
    return "Ubuntu-24.04";
  }
  if (usable.includes("Ubuntu")) {
    return "Ubuntu";
  }

  return usable[0] || null;
};

const hasFlag = (flag) => process.argv.slice(2).includes(flag);

if (hasFlag("--help") || hasFlag("-h")) {
  printHelp();
  process.exit(0);
}

if (process.platform !== "win32") {
  console.error("This helper is intended for Windows PowerShell/CMD. Run `aderyn . -o contracts/aderyn_report.md` directly on Linux/macOS.");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..", "..");
const repoRootWsl = toWslPath(repoRoot);

const precheck = run("wsl", ["-l", "-v"]);
if (precheck.status !== 0) {
  console.error("WSL is not available in this shell.");
  console.error("Run PowerShell as Administrator and execute: wsl --install -d Ubuntu-24.04");
  process.exit(precheck.status || 1);
}

const distro = resolveDistro();
if (!distro) {
  console.error("No usable WSL distro found.");
  console.error("Install one with: wsl --install -d Ubuntu-24.04");
  process.exit(1);
}

if (hasFlag("--install")) {
  const installCmd = "set -e; curl --proto '=https' --tlsv1.2 -LsSf https://github.com/cyfrin/aderyn/releases/latest/download/aderyn-installer.sh | bash";
  const installRun = run("wsl", ["-d", distro, "bash", "-lc", installCmd]);
  if (installRun.status !== 0) {
    console.error(`Failed to install Aderyn in WSL distro "${distro}".`);
    process.exit(installRun.status || 1);
  }
}

const aderynCmd = `cd "${repoRootWsl}" && aderyn . -o ${outputPath}`;
const aderynRun = run("wsl", ["-d", distro, "bash", "-lc", aderynCmd]);
if (aderynRun.status !== 0) {
  console.error(`Failed to run Aderyn in WSL distro "${distro}".`);
  console.error(`If this is your first run, execute: npm run aderyn:wsl -- --install`);
  process.exit(aderynRun.status || 1);
}
