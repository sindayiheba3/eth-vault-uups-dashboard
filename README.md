STUDENT'S Name: SINDAYIHEBA Aphrodis
Reg Number: 25RP18149





# ETH Deposit Vault Examination Project

This workspace implements the requested integrated stack:
- UUPS upgradeable ETH vault (Hardhat + OpenZeppelin Upgrades)
- Aderyn audit report with Medium/High remediation
- Vite + React + Wagmi dashboard with transaction states
- Docker Compose for Anvil, frontend, exporter, Prometheus, Grafana
- Tenderly fork upgrade simulation script

## 1) Smart contract and proxy logic
Location: `contracts/`

### Key points
- UUPS pattern with `initialize()` and no constructor initialization.
- Security fix applied: implementation constructor calls `_disableInitializers()`.
- `deposit()` and `withdraw()` implemented.
- `rewardMultiplier` and block-time-based reward accrual included.

### Run
```bash
cd contracts
npm install
npm run build
npm run test
```

### Deploy to Sepolia
1. From repository root, enter `contracts/` once:
```bash
cd contracts
```
2. Copy `.env.example` to `.env` and set `PRIVATE_KEY` + `SEPOLIA_RPC_URL`:
```powershell
Copy-Item .env.example .env
```
3. Deploy:
```bash
npm run deploy:sepolia
```

If required values are missing, `npm run deploy:sepolia` now prints an explicit setup error before Hardhat runs.

## 2) Security auditing (Aderyn)
Report file: `contracts/aderyn_report.md`

Windows note: Aderyn CLI is not supported as a native Windows binary. Run it inside WSL.

Install WSL distro (one-time, in an elevated PowerShell):
```powershell
wsl --install -d Ubuntu-24.04
```

If WSL already exists, list available distros:
```powershell
wsl --list --online
```

Open Linux shell and install Aderyn:
```bash
wsl -d Ubuntu-24.04
npm install -g @cyfrin/aderyn
aderyn --version
```

Important shell note:
- `hash -r` and `/mnt/c/...` paths are Linux shell commands; run them only after entering WSL.
- In Windows PowerShell, do not run `aderyn` directly. Use the wrapper script below.

Run Aderyn from repository root (where `aderyn.toml` exists). From Linux shell:
```bash
cd /mnt/c/Users/Administrator/Downloads/eth-vault-uups-dashboard
aderyn . -o contracts/aderyn_report.md
```

If you are currently inside `contracts/contracts` in PowerShell, return to repo root first:
```bash
cd ..\..
```

PowerShell shortcut (no manual WSL shell needed):
```powershell
cd contracts
npm run aderyn:wsl -- --install
```
Use an elevated PowerShell for first-time WSL setup if Windows returns `E_ACCESSDENIED`.

If your distro is named `Ubuntu` instead of `Ubuntu-24.04`, the script auto-detects it.

After first install, scan only:
```powershell
cd contracts
npm run aderyn:wsl
```

Fixed findings documented in the report:
- High: Uninitialized implementation (fixed with `_disableInitializers()`).
- Medium: Reentrancy risk in withdrawal flow (fixed with `ReentrancyGuardUpgradeable` + `nonReentrant`).

## 3) Frontend integration (Wagmi)
Location: `frontend/`

### Features
- Wallet state using `useAccount`.
- Contract reads using `useContractRead` for principal and rewards.
- Deposit transaction with pending/success/error handling using `useContractWrite` and `useWaitForTransaction`.

### Run
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```


Sepolia defaults in `.env.example`:
- `VITE_CHAIN_ID=11155111`
- `VITE_RPC_URL` set to a public Sepolia RPC
- set `VITE_VAULT_ADDRESS` to your deployed proxy

## 4) DevOps and containerization
Run all services from workspace root:
```bash
docker compose up --build
```

If the frontend shows `ERR_EMPTY_RESPONSE` on `http://localhost:8545`, restart after forcing Anvil recreation:
```bash
docker compose down
docker compose up --build --force-recreate anvil frontend
```

Quick RPC check:
```bash
curl -X POST http://localhost:8545 \
	-H "Content-Type: application/json" \
	--data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Services:
- React dashboard: `http://localhost:5173`
- Anvil RPC: `http://localhost:8545`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin by default)

If port 3001 is also in use, set `GRAFANA_PORT` before running compose.

MetaMask note:
- Install MetaMask extension in your browser.
- Add Anvil network: RPC `http://localhost:8545`, Chain ID `31337`, Currency `ETH`.
- Import Anvil account private key (from container logs) for local testing.

## 5) Tenderly upgrade simulation (V1 -> V2)
1. Create a Tenderly fork and copy its RPC URL.
2. In `contracts/.env`, set:
```env
PRIVATE_KEY=0x...
TENDERLY_RPC_URL=https://rpc.tenderly.co/fork/<fork-id>
PROXY_ADDRESS=0x...  # deployed UUPS proxy
```
3. Run upgrade simulation:
```bash
cd contracts
npm run upgrade:tenderly
```

The script prints TEL before/after upgrade and throws if TEL changes. V2 doubles `rewardMultiplier` via `doubleRewardMultiplier()`.

## 6) Observability
Grafana dashboard is provisioned automatically from:
- `monitoring/grafana/dashboards/vault-observability.json`

Metrics:
- `vault_total_eth_locked`
- `vault_tx_success_rate`
# exam_brock
