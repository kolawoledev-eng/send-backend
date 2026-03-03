import {
  Horizon,
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { config } from "../config/index.js";
import { getHorizonServer, getSorobanServer, stellarConfig } from "../config/stellar.js";

export interface AccountBalance {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
}

export class StellarService {
  private horizon: Horizon.Server;
  private soroban: rpc.Server;

  constructor() {
    this.horizon = getHorizonServer();
    this.soroban = getSorobanServer();
  }

  getNetwork(): string {
    return stellarConfig.network;
  }

  async getAccountBalances(publicKey: string): Promise<AccountBalance[]> {
    try {
      const account = await this.horizon.loadAccount(publicKey);
      const balances: AccountBalance[] = [];

      for (const b of account.balances) {
        if (b.asset_type === "native") {
          balances.push({ assetCode: "XLM", balance: b.balance });
        } else if ("asset_code" in b && "asset_issuer" in b) {
          balances.push({
            assetCode: b.asset_code,
            assetIssuer: b.asset_issuer,
            balance: b.balance,
          });
        }
      }
      return balances;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return [];
      }
      throw e;
    }
  }

  async getAccountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizon.loadAccount(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  async getLatestLedger(): Promise<{ sequence: number }> {
    const ledger = await this.soroban.getLatestLedger();
    return { sequence: ledger.sequence };
  }

  async getHealth(): Promise<{ status: string }> {
    try {
      await this.soroban.getHealth();
      return { status: "healthy" };
    } catch (e) {
      return { status: "unhealthy" };
    }
  }

  /** Validate that a public key is a valid Stellar account id (G...) */
  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Activate a new account by sending startingBalance XLM from the distribution account.
   * Works on both testnet and mainnet. Falls back to Friendbot on testnet if no
   * distribution key is configured.
   */
  async fundNewAccount(publicKey: string, startingBalance = "1.5"): Promise<boolean> {
    if (!this.isValidPublicKey(publicKey)) return false;

    const distSecret = config.DISTRIBUTION_SECRET_KEY;
    if (distSecret) {
      try {
        const distKeypair = Keypair.fromSecret(distSecret);
        const networkPassphrase =
          stellarConfig.network === "public" ? Networks.PUBLIC : Networks.TESTNET;

        const sourceAccount = await this.horizon.loadAccount(distKeypair.publicKey());
        const tx = new TransactionBuilder(sourceAccount, {
          fee: BASE_FEE,
          networkPassphrase,
        })
          .addOperation(
            Operation.createAccount({
              destination: publicKey,
              startingBalance,
            })
          )
          .setTimeout(30)
          .build();

        tx.sign(distKeypair);
        await this.horizon.submitTransaction(tx);
        console.log(`[stellar] funded ${publicKey} with ${startingBalance} XLM`);
        return true;
      } catch (e) {
        console.error("[stellar] createAccount failed:", e);
      }
    }

    // Fallback: Friendbot on testnet
    if (stellarConfig.network === "testnet") {
      const url = `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`;
      const res = await fetch(url);
      return res.ok;
    }

    return false;
  }
}

export const stellarService = new StellarService();
