import express from "express";
import cors from "cors";
import http from "http";
import { env } from "./config/env.js";
import { registerRoutes } from "./http/routes.js";
import { attachWebSocketServer } from "./ws/server.js";
const app = express();
const corsOrigin = env.CORS_ORIGIN === "*" ? true : [env.CORS_ORIGIN];
app.use(cors({
    origin: corsOrigin,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
registerRoutes(app);
const server = http.createServer(app);
attachWebSocketServer(server);
server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`Server listening on 0.0.0.0:${env.PORT}`);
});
//# sourceMappingURL=index.js.map