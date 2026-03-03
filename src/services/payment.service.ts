/**
 * NGN payment collection — integrate Paystack, Flutterwave, or direct bank API.
 * Stub: implement with your licensed payment provider.
 */
export interface InitiateNGNPaymentParams {
  userId: string;
  amountNGN: number;
  transactionId: string;
  email?: string;
}

export interface InitiateNGNPaymentResult {
  accountNumber?: string;
  bank?: string;
  paymentUrl?: string;
  reference: string;
}

/**
 * Create virtual account or payment reference for user to pay NGN.
 * Webhook from provider will call anchorPlatformService.notifyFundsReceived.
 */
export async function initiateNGNPayment(
  params: InitiateNGNPaymentParams
): Promise<InitiateNGNPaymentResult> {
  // TODO: Paystack.createVirtualAccount({ customer: params.userId, amount: params.amountNGN, metadata: { stellar_transaction_id: params.transactionId } })
  return {
    reference: `tx_${params.transactionId}_${Date.now()}`,
    paymentUrl: undefined,
  };
}

/**
 * Handle webhook from Paystack/Flutterwave when NGN is received.
 * Verify signature, then call anchorPlatformService.notifyFundsReceived.
 */
export async function handlePaymentWebhook(
  body: { metadata?: { stellar_transaction_id?: string }; amount?: number; status?: string }
): Promise<{ ok: boolean }> {
  if (body.status !== "success" || !body.metadata?.stellar_transaction_id) {
    return { ok: false };
  }
  // TODO: Verify webhook signature, then:
  // await anchorPlatformService.notifyFundsReceived({ transactionId: body.metadata.stellar_transaction_id, amountNGN: body.amount });
  return { ok: true };
}
