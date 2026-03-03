import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { config } from "../config/index.js";
import { stellarConfig, getHorizonServer } from "../config/stellar.js";

const USDC_ISSUER =
  config.USDC_ISSUER ?? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

/**
 * Send USDC from the distribution account to a user's Stellar wallet.
 * Returns the transaction hash on success.
 */
export async function sendUSDC(params: {
  destinationPublicKey: string;
  amountUSDC: string;
}): Promise<string> {
  const secretKey = config.DISTRIBUTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error("DISTRIBUTION_SECRET_KEY not configured");
  }

  const distributionKeypair = Keypair.fromSecret(secretKey);
  const horizon = getHorizonServer();
  const networkPassphrase =
    stellarConfig.network === "public" ? Networks.PUBLIC : Networks.TESTNET;

  const usdcAsset = new Asset("USDC", USDC_ISSUER);
  const sourceAccount = await horizon.loadAccount(
    distributionKeypair.publicKey()
  );

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationPublicKey,
        asset: usdcAsset,
        amount: params.amountUSDC,
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(distributionKeypair);

  const result = await horizon.submitTransaction(tx);
  return (result as { hash: string }).hash;
}
