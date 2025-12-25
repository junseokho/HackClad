import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth.js";

export type AuthedRequest = Request & {
  auth?: { userId: string; username: string; nickname: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  req.auth = payload;
  next();
}
