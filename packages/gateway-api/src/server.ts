import { buildApp } from "./app.js";

export type ServerEnvironment = {
  PORT?: string;
  HOST?: string;
  NODE_ENV?: string;
  PBG_ALLOW_PUBLIC_POC_AUTH?: string;
  PBG_DISCUSSION_STATUS_URL?: string;
  PBG_DISCUSSION_SEEN_URL?: string;
};

export function resolveServerListenOptions(env: ServerEnvironment): { port: number; host: string } {
  const port = Number(env.PORT ?? "8787");
  const host = env.HOST ?? "localhost";

  if (
    env.NODE_ENV === "production" &&
    env.PBG_ALLOW_PUBLIC_POC_AUTH !== "true" &&
    (host === "0.0.0.0" || host === "::" || host === "")
  ) {
    throw new Error("Refusing to start seeded POC auth on a public production host");
  }

  return { port, host };
}

const isCliEntry = process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js");

if (isCliEntry) {
  const app = buildApp();

  try {
    await app.listen(resolveServerListenOptions(process.env));
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
