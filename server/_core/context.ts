import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: Request;
  user: User | null;
  setCookies: string[];
};

export async function createContext({ req }: { req: Request }): Promise<TrpcContext> {
  let user: User | null = null;
  const setCookies: string[] = [];

  try {
    user = await sdk.authenticateRequest(req.headers.get("cookie"));
  } catch {
    user = null;
  }

  return { req, user, setCookies };
}
