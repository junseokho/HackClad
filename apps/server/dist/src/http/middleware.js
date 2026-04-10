import { verifyToken } from "./auth.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? "";
    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token)
        return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(token);
    if (!payload)
        return res.status(401).json({ error: "Unauthorized" });
    req.auth = payload;
    next();
}
//# sourceMappingURL=middleware.js.map