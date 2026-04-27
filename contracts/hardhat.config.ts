import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY?.trim();
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL?.trim();
const tenderlyRpcUrl = process.env.TENDERLY_RPC_URL?.trim();

const selectedNetworkFromCli = (() => {
  const networkArgIndex = process.argv.findIndex((arg) => arg === "--network");
  if (networkArgIndex === -1) {
    return undefined;
  }

  return process.argv[networkArgIndex + 1]?.trim();
})();

const selectedNetwork = process.env.HARDHAT_NETWORK?.trim() || selectedNetworkFromCli;

if (selectedNetwork === "sepolia" && !sepoliaRpcUrl) {
  throw new Error("Missing SEPOLIA_RPC_URL. Copy contracts/.env.example to contracts/.env and set SEPOLIA_RPC_URL.");
}

if (selectedNetwork === "tenderly" && !tenderlyRpcUrl) {
  throw new Error("Missing TENDERLY_RPC_URL. Copy contracts/.env.example to contracts/.env and set TENDERLY_RPC_URL.");
}

const networks: HardhatUserConfig["networks"] = {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  hardhat: {}
};

if (sepoliaRpcUrl) {
  networks.sepolia = {
    url: sepoliaRpcUrl,
    timeout: 120000,
    accounts: privateKey ? [privateKey] : []
  };
}

if (tenderlyRpcUrl) {
  networks.tenderly = {
    url: tenderlyRpcUrl,
    accounts: privateKey ? [privateKey] : []
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks
};

export default config;
