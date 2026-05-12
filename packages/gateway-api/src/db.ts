export interface GatewayDbConfig {
  connectionString?: string;
}

export interface GatewayDbPool {
  connectionString: string;
}

export function createPool(config: GatewayDbConfig = {}): GatewayDbPool {
  const connectionString = config.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return { connectionString };
}
