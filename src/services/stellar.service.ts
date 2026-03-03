import { Horizon, Keypair, rpc } from "@stellar/stellar-sdk";
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
}

export const stellarService = new StellarService();
