import crypto from "node:crypto";
import type { BranchId, JwtSessionClaims, RbacProfile } from "./types.js";

export class HttpAuthError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpAuthError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const padLen = (4 - (input.length % 4)) % 4;
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return Buffer.from(normalized, "base64");
}

export function signSessionJwt(
  profile: RbacProfile,
  secret: string,
  ttlSec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): { token: string; claims: JwtSessionClaims } {
  const header = { alg: "HS256", typ: "JWT" };
  const claims: JwtSessionClaims = {
    sub: profile.userId,
    partnerId: profile.partnerId,
    roleKey: profile.roleKey,
    allowedBranchIds: [...profile.allowedBranchIds],
    canViewChainAll: profile.canViewChainAll,
    canViewFinancials: profile.canViewFinancials,
    canManagePricing: profile.canManagePricing,
    iat: nowSec,
    exp: nowSec + ttlSec,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const token = `${signingInput}.${base64UrlEncode(signature)}`;
  return { token, claims };
}

export function verifySessionJwt(
  token: string,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): JwtSessionClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new HttpAuthError(401, "INVALID_TOKEN_FORMAT", "Malformed Bearer JWT token.");
  }

  const [encodedHeader, encodedPayload, encodedSig] = parts as [string, string, string];
  let parsedHeader: { alg?: string; typ?: string };
  try {
    parsedHeader = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8"));
  } catch {
    throw new HttpAuthError(401, "INVALID_TOKEN_HEADER", "Unable to decode JWT header.");
  }

  // Explicitly reject alg:none or algorithm confusion attacks
  if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
    throw new HttpAuthError(401, "UNSUPPORTED_TOKEN_ALG", "Only HS256 JWT tokens are accepted.");
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const actualSig = base64UrlDecode(encodedSig);

  if (
    expectedSig.length !== actualSig.length ||
    !crypto.timingSafeEqual(expectedSig, actualSig)
  ) {
    throw new HttpAuthError(401, "INVALID_TOKEN_SIGNATURE", "JWT signature verification failed.");
  }

  let claims: JwtSessionClaims;
  try {
    claims = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as JwtSessionClaims;
  } catch {
    throw new HttpAuthError(401, "INVALID_TOKEN_PAYLOAD", "Unable to parse JWT claims.");
  }

  if (!claims.sub || !Array.isArray(claims.allowedBranchIds) || claims.allowedBranchIds.length === 0) {
    throw new HttpAuthError(401, "INVALID_TOKEN_CLAIMS", "JWT is missing required RBAC claims.");
  }

  if (typeof claims.exp !== "number" || nowSec >= claims.exp) {
    throw new HttpAuthError(401, "TOKEN_EXPIRED", "Session JWT has expired.");
  }

  return claims;
}

export function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new HttpAuthError(
      401,
      "MISSING_AUTHORIZATION",
      "Authorization Bearer token is required.",
    );
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!match || !match[1]) {
    throw new HttpAuthError(
      401,
      "INVALID_AUTHORIZATION_SCHEME",
      "Expected header format: Authorization: Bearer <token>.",
    );
  }
  return match[1].trim();
}

const KNOWN_BRANCH_IDS: ReadonlySet<string> = new Set([
  "br_mykhe",
  "br_songhan",
  "br_anthuong",
  "stay_h11",
]);

/**
 * Enforces strict server-side user_id x branch_id scoping.
 * Never trusts client query params — rejects cross-branch or unauthorized "all" requests with 403.
 */
export function resolveScopedBranches(
  claims: JwtSessionClaims,
  requestedBranchId: string | null | undefined,
): BranchId[] {
  const normalized = requestedBranchId?.trim();

  if (!normalized) {
    return [...claims.allowedBranchIds];
  }

  if (normalized === "all") {
    if (!claims.canViewChainAll) {
      throw new HttpAuthError(
        403,
        "FORBIDDEN_BRANCH_SCOPE",
        `User ${claims.sub} (${claims.roleKey}) is not authorized to query chain-wide 'all' branches.`,
        {
          userId: claims.sub,
          requestedBranchId: "all",
          allowedBranchIds: claims.allowedBranchIds,
        },
      );
    }
    return [...claims.allowedBranchIds];
  }

  if (!KNOWN_BRANCH_IDS.has(normalized)) {
    throw new HttpAuthError(
      400,
      "INVALID_BRANCH_ID",
      `Unknown branchId '${normalized}'.`,
    );
  }

  if (!claims.allowedBranchIds.includes(normalized as BranchId)) {
    throw new HttpAuthError(
      403,
      "FORBIDDEN_BRANCH_SCOPE",
      `User ${claims.sub} (${claims.roleKey}) does not have permission to access branch '${normalized}'.`,
      {
        userId: claims.sub,
        requestedBranchId: normalized,
        allowedBranchIds: claims.allowedBranchIds,
      },
    );
  }

  return [normalized as BranchId];
}
