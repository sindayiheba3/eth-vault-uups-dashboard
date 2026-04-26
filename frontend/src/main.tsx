import React from "react";
import ReactDOM from "react-dom/client";
import {
  WagmiConfig,
  configureChains,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
  useBalance,
  useNetwork
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { InjectedConnector } from "wagmi/connectors/injected";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { formatEther, parseEther } from "viem";
import { vaultAbi } from "./abi/vaultAbi";
import "./styles.css";

const vaultAddress = (import.meta.env.VITE_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const chainId = 11155111; // Sepolia chain ID
const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
const selectedChain = sepolia;

const { chains, publicClient, webSocketPublicClient } = configureChains([selectedChain], [
  jsonRpcProvider({
    rpc: () => ({
      http: rpcUrl
    })
  })
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors: [new InjectedConnector({ chains })],
  publicClient,
  webSocketPublicClient
});

const queryClient = new QueryClient();

function Dashboard() {
      // Withdraw and claim contract writes
      const withdrawWrite = useContractWrite({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "withdraw"
      });

      const claimWrite = useContractWrite({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "claimRewards"
      });
    // Diagnostics for debugging
    const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [amount, setAmount] = React.useState("0.005");
  const [withdrawAmount, setWithdrawAmount] = React.useState("0.001");
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  const [hasInjectedWallet, setHasInjectedWallet] = React.useState<boolean>(false);
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connectAsync, connectors, isLoading: isConnecting, pendingConnector, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  React.useEffect(() => {
    setHasInjectedWallet(typeof (window as any).ethereum !== "undefined");

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const hasVaultAddress = vaultAddress !== "0x0000000000000000000000000000000000000000";
  const canQueryChain = isOnline && hasVaultAddress;
  const isCorrectNetwork = !isConnected || chain?.id === selectedChain.id;

  const walletBalance = useBalance({
    address,
    watch: false,
    enabled: Boolean(address) && canQueryChain
  });

  const principalRead = useContractRead({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "principalOf",
    args: address ? [address] : undefined,
    enabled: Boolean(address) && canQueryChain,
    watch: false
  });

  const rewardRead = useContractRead({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "accruedRewardOf",
    args: address ? [address] : undefined,
    enabled: Boolean(address) && canQueryChain,
    watch: false
  });

  const depositWrite = useContractWrite({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "deposit",
    value: amount ? parseEther(amount) : undefined
  });

  const txReceipt = useWaitForTransaction({
    hash: depositWrite.data?.hash
  });

  const withdrawReceipt = useWaitForTransaction({
    hash: withdrawWrite.data?.hash
  });

  const claimReceipt = useWaitForTransaction({
    hash: claimWrite.data?.hash
  });

  const isPending = depositWrite.isLoading || txReceipt.isLoading;
  const success = txReceipt.isSuccess;
  const hasError = depositWrite.isError || txReceipt.isError;

  const principalRaw = principalRead.data ? BigInt(principalRead.data as bigint) : 0n;
  const rewardsRaw = rewardRead.data ? BigInt(rewardRead.data as bigint) : 0n;
  const principal = Number(formatEther(principalRaw)).toFixed(6);
  const rewards = Number(formatEther(rewardsRaw)).toFixed(6);
  const walletFormatted = walletBalance.data ? `${Number(walletBalance.data.formatted).toFixed(4)} ETH` : "-";
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";

  const amountValue = Number(amount);
  const withdrawAmountValue = Number(withdrawAmount);
  let withdrawAmountWei: bigint | undefined;
  if (withdrawAmount) {
    try {
      withdrawAmountWei = parseEther(withdrawAmount);
    } catch {
      withdrawAmountWei = undefined;
    }
  }

  let depositDisabledReason = "";
  if (!isOnline) {
    depositDisabledReason = "You are offline.";
  } else if (!hasVaultAddress) {
    depositDisabledReason = "Vault address is not configured.";
  } else if (!isCorrectNetwork) {
    depositDisabledReason = `Switch wallet to ${selectedChain.name}.`;
  } else if (!Number.isFinite(amountValue) || amountValue <= 0) {
    depositDisabledReason = "Enter an amount greater than 0.";
  } else if (isPending) {
    depositDisabledReason = "Transaction is pending.";
  }
  const isDepositDisabled = depositDisabledReason.length > 0;

  let withdrawDisabledReason = "";
  if (!isOnline) {
    withdrawDisabledReason = "You are offline.";
  } else if (!hasVaultAddress) {
    withdrawDisabledReason = "Vault address is not configured.";
  } else if (!isCorrectNetwork) {
    withdrawDisabledReason = `Switch wallet to ${selectedChain.name}.`;
  } else if (principalRaw === 0n) {
    withdrawDisabledReason = "No principal available to withdraw.";
  } else if (!Number.isFinite(withdrawAmountValue) || withdrawAmountValue <= 0) {
    withdrawDisabledReason = "Enter a withdraw amount greater than 0.";
  } else if (!withdrawAmountWei) {
    withdrawDisabledReason = "Withdraw amount is invalid.";
  } else if (withdrawAmountWei > principalRaw) {
    withdrawDisabledReason = "Withdraw amount exceeds your principal.";
  } else if (withdrawWrite.isLoading || withdrawReceipt.isLoading) {
    withdrawDisabledReason = "Withdraw transaction is pending.";
  }
  const isWithdrawDisabled = withdrawDisabledReason.length > 0;

  let claimDisabledReason = "";
  if (!isOnline) {
    claimDisabledReason = "You are offline.";
  } else if (!hasVaultAddress) {
    claimDisabledReason = "Vault address is not configured.";
  } else if (!isCorrectNetwork) {
    claimDisabledReason = `Switch wallet to ${selectedChain.name}.`;
  } else if (rewardsRaw === 0n) {
    claimDisabledReason = "No rewards available yet.";
  } else if (claimWrite.isLoading || claimReceipt.isLoading) {
    claimDisabledReason = "Claim transaction is pending.";
  }
  const isClaimDisabled = claimDisabledReason.length > 0;

  return (
    <div className="vault-app">
      <div className="bg-orb orb-left" />
      <div className="bg-orb orb-right" />
      <div className="dashboard-shell">
        <aside className="status-rail">
          <p className="rail-tag">Sepolia Control Surface</p>
          <h1>ETH Vault Operations</h1>
          <p className="subtitle">Distinct dashboard skin for UUPS vault reads and writes.</p>
          <p className="theme-pill">Canvas v3 active</p>

          <button className="secondary diagnostics-toggle" onClick={() => setShowDiagnostics((v) => !v)}>
            {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
          </button>

          {showDiagnostics && (
            <div className="diagnostics">
              <div><strong>Diagnostics (Sepolia Only)</strong></div>
              <div>Network: Sepolia (ID: 11155111)</div>
              <div>Vault Address: {vaultAddress}</div>
              <div>RPC URL: https://ethereum-sepolia-rpc.publicnode.com</div>
              <div>Deposit Tx Hash: {depositWrite.data?.hash || "-"}</div>
              <div>Tx Receipt Status: {txReceipt.status}</div>
              <div>Tx Receipt Error: {txReceipt.error?.name || "-"}</div>
              <div>Tx Receipt Error Message: {txReceipt.error?.message || "-"}</div>
            </div>
          )}

          {!isOnline && <p className="err">You are offline. Reconnect internet to query Sepolia RPC.</p>}
          {!hasVaultAddress && <p className="err">Set VITE_VAULT_ADDRESS in your frontend .env file.</p>}
          {!isConnected && !hasInjectedWallet && (
            <p className="err">MetaMask (or another injected wallet) is not detected in this browser.</p>
          )}

          {!isConnected && hasInjectedWallet && (
            <div className="stack">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={async () => {
                    try {
                      await connectAsync({ connector });
                    } catch {
                      // Connection errors are surfaced through wagmi state below.
                    }
                  }}
                  disabled={!connector.ready || isConnecting}
                >
                  {isConnecting && pendingConnector?.id === connector.id ? "Connecting..." : `Connect ${connector.name}`}
                </button>
              ))}
            </div>
          )}

          {!isConnected && connectError && <p className="err">Wallet connect failed. Install/enable MetaMask and try again.</p>}
          {isConnected && !isCorrectNetwork && <p className="err">Switch wallet network to {selectedChain.name}.</p>}
        </aside>

        <main className="workspace">
          {isConnected && (
            <>
              <div className="wallet-strip">
                <div className="wallet-pill">
                  <span>Wallet</span>
                  <strong>{shortAddress}</strong>
                </div>
                <div className={`network-pill ${isCorrectNetwork ? "online" : "offline"}`}>
                  {isCorrectNetwork ? `${selectedChain.name} Ready` : "Wrong Network"}
                </div>
              </div>

              <div className="metrics">
                <article>
                  <span>Wallet Balance</span>
                  <strong>{walletFormatted}</strong>
                </article>
                <article>
                  <span>Vault Principal</span>
                  <strong>{principal} ETH</strong>
                </article>
                <article>
                  <span>Accrued Rewards</span>
                  <strong>{rewards} ETH</strong>
                </article>
              </div>

              <div className="content-grid">
                <section className="actions-panel">
                  <div className="actions-head">
                    <h2>Vault Actions</h2>
                    <span>Secure contract calls on Sepolia</span>
                  </div>

                  <label htmlFor="amount">Deposit Amount (ETH)</label>
                  <input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.10" />

                  <label htmlFor="withdrawAmount">Withdraw Amount (ETH)</label>
                  <input
                    id="withdrawAmount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.01"
                  />

                  <div className="stack action-buttons">
                    <button onClick={() => depositWrite.write?.()} disabled={isDepositDisabled}>
                      {isPending ? "Pending..." : "Deposit"}
                    </button>
                    <button
                      onClick={() => withdrawAmountWei && withdrawWrite.write?.({ args: [withdrawAmountWei] })}
                      disabled={isWithdrawDisabled}
                    >
                      {withdrawWrite.isLoading || withdrawReceipt.isLoading ? "Withdrawing..." : "Withdraw"}
                    </button>
                    <button onClick={() => claimWrite.write?.()} disabled={isClaimDisabled}>
                      {claimWrite.isLoading || claimReceipt.isLoading ? "Claiming..." : "Claim Rewards"}
                    </button>
                    <button className="secondary" onClick={() => disconnect()}>
                      Disconnect
                    </button>
                  </div>
                </section>

                <section className="feature-grid">
                  <article className="feature-card">
                    <h3>Deposit Engine</h3>
                    <p>Push ETH into the vault with input and network checks before write execution.</p>
                  </article>
                  <article className="feature-card">
                    <h3>Smart Withdraw</h3>
                    <p>Withdraw principal with guardrails that block invalid or oversized requests.</p>
                  </article>
                  <article className="feature-card">
                    <h3>Reward Claims</h3>
                    <p>Track accrued rewards and claim the moment rewards become available.</p>
                  </article>
                </section>
              </div>

              {isDepositDisabled && <p className="err">Deposit disabled: {depositDisabledReason}</p>}
              {isWithdrawDisabled && <p className="err">Withdraw disabled: {withdrawDisabledReason}</p>}
              {isClaimDisabled && <p className="err">Claim disabled: {claimDisabledReason}</p>}

              {success && <p className="ok">Deposit confirmed on-chain.</p>}
              {withdrawReceipt.isSuccess && <p className="ok">Withdraw confirmed on-chain.</p>}
              {claimReceipt.isSuccess && <p className="ok">Rewards claim confirmed on-chain.</p>}
              {hasError && (
                <p className="err">
                  Transaction failed. Check wallet/network and retry.<br />
                  {txReceipt.error?.name === "TransactionNotFoundError" && (
                    <span className="warning-note">Transaction not found. Ensure you are on the correct network and RPC. See diagnostics above.</span>
                  )}
                </p>
              )}
              {withdrawReceipt.isError && <p className="err">Withdraw failed. Check amount, vault liquidity, and network.</p>}
              {claimReceipt.isError && <p className="err">Claim rewards failed. Ensure rewards are available and retry.</p>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </WagmiConfig>
  </React.StrictMode>
);
