import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { registerAuthRoutes } from "./_core/authRoutes";
import { createContext } from "./_core/context";

export async function createApp(): Promise<Express> {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
