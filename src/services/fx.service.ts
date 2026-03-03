/**
 * FX rate service — NGN to USDC.
 * Replace with your licensed FX source or CBN rate.
 */
const DEFAULT_NGN_PER_USD = 1600;
const DEFAULT_FEE_PERCENT = 0.015; // 1.5%

export interface FXQuote {
  rate: number;
  feePercent: number;
}

export interface USDCAmounts {
  amountOut: string;
  feeAmount: string;
}

export async function getNGNtoUSDCRate(): Promise<FXQuote> {
  // TODO: const rate = await YourFXProvider.getRate('NGN', 'USD');
  return {
    rate: DEFAULT_NGN_PER_USD,
    feePercent: DEFAULT_FEE_PERCENT,
  };
}

export function calculateUSDC(
  amountNGN: number,
  rate: number,
  feePercent: number
): USDCAmounts {
  const usdcGross = amountNGN / rate;
  const feeAmount = usdcGross * feePercent;
  const amountOut = usdcGross - feeAmount;
  return {
    amountOut: amountOut.toFixed(2),
    feeAmount: feeAmount.toFixed(2),
  };
}
