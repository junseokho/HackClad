import express from "express";
import cors from "cors";
import http from "http";
import { env } from "./config/env.js";
import { registerRoutes } from "./http/routes.js";
import { attachWebSocketServer } from "./ws/server.js";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN, credentials: false }));
app.use(express.json());

registerRoutes(app);

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`Server listening on :${env.PORT}`);
});
