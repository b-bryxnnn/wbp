import { SignJWT, jwtVerify } from "jose";

export type AuthPayload = { userId: number; schoolId: number; name?: string };

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");
const EXPIRES_IN = "12h";

export const signAuthToken = async (payload: AuthPayload): Promise<string> => {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRES_IN)
    .setIssuedAt()
    .sign(SECRET);
};

export const verifyAuthToken = async (token: string): Promise<AuthPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
};

export const authCookieName = "auth_token";
