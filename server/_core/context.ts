import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { authenticateRequest } from "./session";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: User | null;
};

export async function createContext(opts: { req: Request; res: Response }): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}
