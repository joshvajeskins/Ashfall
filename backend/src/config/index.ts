import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  movementRpcUrl: process.env.MOVEMENT_RPC_URL || 'https://testnet.movementnetwork.xyz/v1',
  serverPrivateKey: process.env.SERVER_PRIVATE_KEY || '',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export function validateConfig(): void {
  const required = ['serverPrivateKey', 'contractAddress'] as const;
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing config values: ${missing.join(', ')}`);
    console.warn('Server will start but transactions will fail.');
  }
}
