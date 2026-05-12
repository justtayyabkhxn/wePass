// @ts-ignore
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET!;

export function signToken(payload: {
  userId: string;
  email: string;
}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}