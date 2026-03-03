import { config } from "../config/index.js";

const FLW_BASE = "https://api.flutterwave.com/v3";
const FLW_TIMEOUT_MS = 20_000;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

function flwFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FLW_TIMEOUT_MS) });
}

export interface FlwVirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  orderRef: string;
  flwRef: string;
  amount: number;
  expiresAt?: string;
}

/**
 * Create a Flutterwave charge via bank transfer (virtual account).
 * Returns temporary virtual account details for the user to pay into.
 */
export async function createBankTransferCharge(params: {
  txRef: string;
  amountNGN: number;
  email: string;
  stellarPublicKey: string;
  fullName?: string;
}): Promise<FlwVirtualAccount> {
  const body = {
    tx_ref: params.txRef,
    amount: params.amountNGN,
    email: params.email,
    currency: "NGN",
    fullname: params.fullName || "Wallet User",
    meta: { stellar_public_key: params.stellarPublicKey },
  };

  const res = await flwFetch(`${FLW_BASE}/charges?type=bank_transfer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    status: string;
    message: string;
    meta?: {
      authorization?: {
        transfer_account?: string;
        transfer_bank?: string;
        account_expiration?: string;
        transfer_note?: string;
        transfer_reference?: string;
        transfer_amount?: number;
        mode?: string;
      };
    };
  };

  if (data.status !== "success" || !data.meta?.authorization) {
    throw new Error(data.message || "Failed to create bank transfer charge");
  }

  const auth = data.meta.authorization;
  return {
    accountNumber: auth.transfer_account ?? "",
    bankName: auth.transfer_bank ?? "",
    accountName: auth.transfer_note ?? "Flutterwave",
    orderRef: params.txRef,
    flwRef: auth.transfer_reference ?? "",
    amount: auth.transfer_amount ?? params.amountNGN,
    expiresAt: auth.account_expiration,
  };
}

/**
 * Initialize a Flutterwave Standard (hosted checkout) payment.
 * Returns a link the user can open (card, bank, USSD, etc).
 */
export async function createPaymentLink(params: {
  txRef: string;
  amountNGN: number;
  email: string;
  stellarPublicKey: string;
  redirectUrl: string;
}): Promise<string> {
  const body = {
    tx_ref: params.txRef,
    amount: params.amountNGN,
    currency: "NGN",
    redirect_url: params.redirectUrl,
    customer: { email: params.email },
    customizations: {
      title: "Buy USDC",
      description: "NGN to USDC deposit",
    },
    meta: { stellar_public_key: params.stellarPublicKey },
  };

  const res = await flwFetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    status: string;
    message: string;
    data?: { link?: string };
  };

  if (data.status !== "success" || !data.data?.link) {
    throw new Error(data.message || "Failed to create payment link");
  }
  return data.data.link;
}

/**
 * Verify a transaction with Flutterwave by its transaction ID.
 */
export async function verifyTransaction(flwTxId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  txRef: string;
}> {
  const res = await flwFetch(`${FLW_BASE}/transactions/${flwTxId}/verify`, {
    headers: headers(),
  });
  const data = (await res.json()) as {
    status: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      tx_ref?: string;
    };
  };
  return {
    status: data.data?.status ?? "unknown",
    amount: data.data?.amount ?? 0,
    currency: data.data?.currency ?? "NGN",
    txRef: data.data?.tx_ref ?? "",
  };
}

/**
 * Create a permanent virtual account via Flutterwave.
 * Requires BVN for live environment.
 */
export async function createPermanentVirtualAccount(params: {
  email: string;
  bvn: string;
  txRef: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  narration?: string;
}): Promise<{
  accountNumber: string;
  bankName: string;
  accountName: string;
  flwRef: string;
  orderRef: string;
}> {
  const body = {
    email: params.email,
    bvn: params.bvn,
    tx_ref: params.txRef,
    is_permanent: true,
    firstname: params.firstName || "Wallet",
    lastname: params.lastName || "User",
    phonenumber: params.phoneNumber || "",
    narration: params.narration || "Wallet Funding",
  };

  const res = await flwFetch(`${FLW_BASE}/virtual-account-numbers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    status: string;
    message: string;
    data?: {
      account_number?: string;
      bank_name?: string;
      account_name?: string;
      flw_ref?: string;
      order_ref?: string;
    };
  };

  if (data.status !== "success" || !data.data?.account_number) {
    throw new Error(data.message || "Failed to create virtual account");
  }

  return {
    accountNumber: data.data.account_number,
    bankName: data.data.bank_name ?? "",
    accountName: data.data.account_name ?? "",
    flwRef: data.data.flw_ref ?? "",
    orderRef: data.data.order_ref ?? "",
  };
}

/**
 * Validate Flutterwave webhook signature.
 */
export function verifyWebhookSignature(secretHash: string, headerHash: string): boolean {
  return secretHash === headerHash;
}
