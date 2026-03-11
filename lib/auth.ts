import jwt from "jsonwebtoken";

export type AuthPayload = { userId: number; schoolId: number; name?: string };

const SECRET = process.env.JWT_SECRET || "dev-secret";
const EXPIRES_IN = "12h";

export const signAuthToken = (payload: AuthPayload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

export const verifyAuthToken = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, SECRET) as AuthPayload;
  } catch (e) {
    return null;
  }
};

export const authCookieName = "auth_token";
