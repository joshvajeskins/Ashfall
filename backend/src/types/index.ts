export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  errorCode?: string;
}

export interface CompleteFloorRequest {
  playerAddress: string;
  enemiesKilled: number;
  xpEarned: number;
}

export interface CompleteBossRequest {
  playerAddress: string;
  xpEarned: number;
}

export interface ExitSuccessRequest {
  playerAddress: string;
}

export interface PlayerDiedRequest {
  playerAddress: string;
}

export interface AddLootRequest {
  playerAddress: string;
  floor: number;
  itemType: 'weapon' | 'armor' | 'accessory';
  rarity: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  version: string;
  serverAccountConfigured: boolean;
}

// Error codes from Move contracts
export const ErrorCodes = {
  E_NOT_IN_DUNGEON: 1,
  E_ALREADY_IN_DUNGEON: 2,
  E_UNAUTHORIZED: 3,
  E_INVALID_FLOOR: 4,
  E_CHARACTER_DEAD: 5,
  E_NO_CHARACTER: 6,
  E_RUN_NOT_ACTIVE: 7,
} as const;

export function getErrorMessage(code: number): string {
  const messages: Record<number, string> = {
    [ErrorCodes.E_NOT_IN_DUNGEON]: 'Player is not in dungeon',
    [ErrorCodes.E_ALREADY_IN_DUNGEON]: 'Player is already in a dungeon',
    [ErrorCodes.E_UNAUTHORIZED]: 'Server is not authorized',
    [ErrorCodes.E_INVALID_FLOOR]: 'Invalid floor number',
    [ErrorCodes.E_CHARACTER_DEAD]: 'Character is dead',
    [ErrorCodes.E_NO_CHARACTER]: 'No character found',
    [ErrorCodes.E_RUN_NOT_ACTIVE]: 'Dungeon run is not active',
  };
  return messages[code] || `Unknown error: ${code}`;
}
