// Dungeon transaction service
// Server-authorized functions use Shinami Invisible Wallets via backend API
// All gas is sponsored - users never pay for dungeon actions

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Helper to ensure /api prefix for Next.js API routes
const getApiUrl = (path: string) => `${API_BASE}/api${path}`;

export interface ExitDungeonResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  itemsClaimed?: {
    weapons: number;
    armors: number;
    accessories: number;
    gold: number;
  };
}

export interface CompleteBossResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  xpAwarded?: number;
}

/**
 * Exit dungeon successfully - claims pending loot to stash
 * This calls a backend endpoint that has server authorization
 */
export async function exitDungeonSuccess(
  playerAddress: string
): Promise<ExitDungeonResponse> {
  try {
    const response = await fetch(getApiUrl('/dungeon/exit-success'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exit dungeon',
    };
  }
}

/**
 * Complete boss floor - awards XP and emits boss defeated event
 * Server-authorized function
 */
export async function completeBossFloor(
  playerAddress: string,
  xpEarned: number
): Promise<CompleteBossResponse> {
  try {
    const response = await fetch(getApiUrl('/dungeon/complete-boss'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress, xpEarned }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete boss',
    };
  }
}

/**
 * Complete regular floor - advances floor and awards XP
 * Server-authorized function
 */
export async function completeFloor(
  playerAddress: string,
  enemiesKilled: number,
  xpEarned: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch(getApiUrl('/dungeon/complete-floor'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress, enemiesKilled, xpEarned }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete floor',
    };
  }
}

/**
 * Report player death - burns all pending loot and equipped items
 * Server-authorized function
 */
export async function reportPlayerDeath(
  playerAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch(getApiUrl('/dungeon/player-died'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report death',
    };
  }
}
