import { Horizon, rpc } from "@stellar/stellar-sdk";
import { config } from "./index.js";

export const stellarConfig = {
  network: config.STELLAR_NETWORK,
  sorobanRpcUrl: config.SOROBAN_RPC_URL,
  horizonUrl: config.STELLAR_HORIZON_URL,
  serverSecretKey: config.STELLAR_SERVER_SECRET_KEY,
} as const;

export function getSorobanServer(): rpc.Server {
  return new rpc.Server(stellarConfig.sorobanRpcUrl, {
    allowHttp: config.NODE_ENV === "development" && stellarConfig.sorobanRpcUrl.startsWith("http://"),
  });
}

export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(stellarConfig.horizonUrl);
}
