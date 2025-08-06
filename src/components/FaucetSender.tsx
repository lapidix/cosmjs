import type { AccountData, Coin } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import type { ChainInfo } from "@keplr-wallet/types";
import React, {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import styles from "../styles/FaucetSender.module.css";

export interface FaucetSenderProps {
  faucetAddress: string;
  rpcUrl: string;
  chainId?: string;
}

const getTestnetChainInfo = (): ChainInfo => ({
  chainId: "theta-testnet-001",
  chainName: "theta-testnet-001",
  rpc: "https://rpc.sentry-01.theta-testnet.polypore.xyz/",
  rest: "https://rest.sentry-01.theta-testnet.polypore.xyz/",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "cosmos",
    bech32PrefixAccPub: "cosmos" + "pub",
    bech32PrefixValAddr: "cosmos" + "valoper",
    bech32PrefixValPub: "cosmos" + "valoperpub",
    bech32PrefixConsAddr: "cosmos" + "valcons",
    bech32PrefixConsPub: "cosmos" + "valconspub",
  },
  currencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
      coinGeckoId: "cosmos",
    },
    {
      coinDenom: "THETA",
      coinMinimalDenom: "theta",
      coinDecimals: 0,
    },
    {
      coinDenom: "LAMBDA",
      coinMinimalDenom: "lambda",
      coinDecimals: 0,
    },
    {
      coinDenom: "RHO",
      coinMinimalDenom: "rho",
      coinDecimals: 0,
    },
    {
      coinDenom: "EPSILON",
      coinMinimalDenom: "epsilon",
      coinDecimals: 0,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "ATOM",
      coinMinimalDenom: "uatom",
      coinDecimals: 6,
      coinGeckoId: "cosmos",
      gasPriceStep: {
        low: 1,
        average: 1,
        high: 1,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "ATOM",
    coinMinimalDenom: "uatom",
    coinDecimals: 6,
    coinGeckoId: "cosmos",
  },
  coinType: 118,
  features: ["stargate", "ibc-transfer", "no-legacy-stdTx"],
});

export const FaucetSender: React.FC<FaucetSenderProps> = ({
  faucetAddress,
  rpcUrl,
  chainId = "theta-testnet-001", // Default value for testnet
}) => {
  const [denom, setDenom] = useState<string>("uatom");
  const [faucetBalance, setFaucetBalance] = useState<string>("Loading...");
  const [myAddress, setMyAddress] = useState<string>("Click first");
  const [myBalance, setMyBalance] = useState<string>("Click first");
  const [toSend, setToSend] = useState<string>("0");
  const [client, setClient] = useState<StargateClient | null>(null);

  const updateFaucetBalance = useCallback(
    async (client: StargateClient) => {
      try {
        const balances: readonly Coin[] = await client.getAllBalances(
          faucetAddress
        );
        if (balances.length > 0) {
          const first: Coin = balances[0];
          setDenom(first.denom);
          setFaucetBalance(first.amount);
        } else {
          setFaucetBalance("0");
        }
      } catch (error) {
        console.error("Failed to fetch faucet balance:", error);
        setFaucetBalance("Error");
      }
    },
    [faucetAddress]
  );

  const updateUserBalance = async (address: string) => {
    if (!client) return;

    try {
      const balances = await client.getAllBalances(address);
      if (balances.length > 0) {
        const sameToken = balances.find((coin) => coin.denom === denom);
        if (sameToken) {
          setMyBalance(sameToken.amount);
        } else if (balances[0]) {
          setMyBalance(`${balances[0].amount} ${balances[0].denom}`);
        } else {
          setMyBalance("0");
        }
      } else {
        setMyBalance("0");
      }
    } catch (error) {
      console.error("Failed to fetch user balance:", error);
      setMyBalance("Error");
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.keplr) {
        alert("You need to install or unlock Keplr");
        return;
      }

      // Suggest the testnet chain to Keplr
      await window.keplr.experimentalSuggestChain(getTestnetChainInfo());

      await window.keplr.enable(chainId);
      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length > 0) {
        const address = accounts[0].address;
        setMyAddress(address);
        await updateUserBalance(address);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet.");
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const newClient = await StargateClient.connect(rpcUrl);
        setClient(newClient);
        await updateFaucetBalance(newClient);
      } catch (error) {
        console.error("Failed to connect to RPC:", error);
        setFaucetBalance("RPC Error");
      }
    };

    const timeoutId = setTimeout(init, 500);
    return () => clearTimeout(timeoutId);
  }, [rpcUrl, faucetAddress, updateFaucetBalance]);

  // Input change handler
  const onToSendChanged = (e: ChangeEvent<HTMLInputElement>) => {
    setToSend(e.currentTarget.value);
  };

  const onSendClicked = async () => {
    // Detect Keplr
    const { keplr } = window;
    if (!keplr) {
      alert("You need to install Keplr");
      return;
    }

    try {
      // Suggest the testnet chain to Keplr
      await keplr.experimentalSuggestChain(getTestnetChainInfo());

      // Create the signing client
      const offlineSigner = window.keplr!.getOfflineSigner(chainId);
      const signingClient = await SigningStargateClient.connectWithSigner(
        rpcUrl,
        offlineSigner
      );

      // Get the address and balance of your user
      const account: AccountData = (await offlineSigner.getAccounts())[0];
      setMyAddress(account.address);

      const userBalance = await signingClient.getBalance(
        account.address,
        denom
      );
      setMyBalance(userBalance.amount);

      // Submit the transaction to send tokens to the faucet
      const sendResult = await signingClient.sendTokens(
        account.address,
        faucetAddress,
        [
          {
            denom: denom,
            amount: toSend,
          },
        ],
        {
          amount: [{ denom: "uatom", amount: "500" }],
          gas: "200000",
        }
      );

      // Print the result to the console
      console.log(sendResult);

      // Update the balance in the user interface
      const updatedUserBalance = await signingClient.getBalance(
        account.address,
        denom
      );
      const updatedFaucetBalance = await signingClient.getBalance(
        faucetAddress,
        denom
      );

      setMyBalance(updatedUserBalance.amount);
      setFaucetBalance(updatedFaucetBalance.amount);

      alert(`Transaction successful! TX Hash: ${sendResult.transactionHash}`);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert(`Transaction failed: ${error}`);
    }
  };

  const onConnectWallet = async () => {
    await connectWallet();
  };

  const onRefreshBalance = async () => {
    if (!client) return;

    if (myAddress !== "Click first") {
      await updateUserBalance(myAddress);
    }
    await updateFaucetBalance(client);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cosmos Testnet Transfer</h1>
      <div className={styles.description}>Send tokens back to the faucet</div>

      <fieldset className={styles.card}>
        <legend>Faucet</legend>
        <p>
          <span>Address:</span>
          <span className={styles.addressText}>{faucetAddress}</span>
        </p>
        <p>
          <span>Balance:</span>
          <span className={styles.balanceText}>{faucetBalance}</span>
          <button
            className={styles.refreshButton}
            onClick={onRefreshBalance}
            title="Refresh balance">
            🔄
          </button>
        </p>
      </fieldset>

      <fieldset className={styles.card}>
        <legend>My Account</legend>
        <p>
          <span>Address:</span>
          <span className={styles.addressText}>{myAddress}</span>
          {myAddress === "Click first" && (
            <button className={styles.connectButton} onClick={onConnectWallet}>
              Connect Wallet
            </button>
          )}
        </p>
        <p>
          <span>Balance:</span>
          <span className={styles.balanceText}>{myBalance}</span>
          {myAddress !== "Click first" && (
            <button
              className={styles.refreshButton}
              onClick={onRefreshBalance}
              title="Refresh balance">
              🔄
            </button>
          )}
        </p>
      </fieldset>

      <fieldset className={styles.card}>
        <legend>Send</legend>
        <p>Send tokens to faucet:</p>
        <div className={styles.inputGroup}>
          <input
            className={styles.input}
            value={toSend}
            type="number"
            min="0"
            step="1000"
            onChange={onToSendChanged}
          />
          <span className={styles.denom}>{denom}</span>
          <button
            className={styles.button}
            onClick={onSendClicked}
            disabled={myAddress === "Click first"}>
            Send to Faucet
          </button>
        </div>
      </fieldset>
    </div>
  );
};
