import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config/index.js";
const jwksClient = new JwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
});

export interface SocialPayload {
  providerUserId: string;
  email: string | null;
}

export async function verifyAppleIdToken(idToken: string): Promise<SocialPayload> {
  const decoded = jwt.decode(idToken, { complete: true }) as { header: { kid: string }; payload: { sub: string; email?: string } } | null;
  if (!decoded?.header?.kid) {
    throw new Error("Invalid Apple token");
  }
  const key = await jwksClient.getSigningKey(decoded.header.kid);
  const publicKey = key.getPublicKey();
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ["RS256"],
    audience: config.APPLE_CLIENT_ID || undefined,
    issuer: "https://appleid.apple.com",
  }) as { sub: string; email?: string };
  return {
    providerUserId: payload.sub,
    email: payload.email ?? null,
  };
}

export async function verifyGoogleIdToken(idToken: string): Promise<SocialPayload> {
  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID || undefined);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID || undefined,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error("Invalid Google token");
  }
  return {
    providerUserId: payload.sub,
    email: payload.email ?? null,
  };
}

export function issueAuthToken(userId: string): string {
  return jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyAuthToken(token: string): { userId: string } {
  const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
  if (!payload.userId) {
    throw new Error("Invalid token payload");
  }
  return { userId: payload.userId };
}
