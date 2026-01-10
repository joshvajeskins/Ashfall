/**
 * Combat Service - Handles on-chain combat transactions
 *
 * Flow:
 * 1. Server starts combat (invisible wallet) - spawns enemy on-chain
 * 2. Player attacks (user wallet + gas sponsor) - player's turn
 * 3. Server executes enemy attack (invisible wallet) - enemy's turn
 * 4. Repeat until combat ends
 */

const API_BASE = '';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x2b633f672b485166e89bb90903962d5ad26bbf70ce079ed484bae518d89d2dc5';

export interface CombatStartResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface PlayerAttackResponse {
  success: boolean;
  txHash?: string;
  damage?: number;
  wasCrit?: boolean;
  enemyKilled?: boolean;
  error?: string;
}

export interface EnemyAttackResponse {
  success: boolean;
  txHash?: string;
  damage?: number;
  playerKilled?: boolean;
  error?: string;
}

// Enemy type mapping
export const ENEMY_TYPES = {
  skeleton: 0,
  zombie: 1,
  ghoul: 2,
  vampire: 3,
  lich: 4,
  boss: 5,
} as const;

/**
 * Start combat - Server-authorized (invisible wallet)
 */
export async function startCombat(
  playerAddress: string,
  enemyType: keyof typeof ENEMY_TYPES | number,
  floor: number
): Promise<CombatStartResponse> {
  try {
    const enemyTypeNum = typeof enemyType === 'number'
      ? enemyType
      : ENEMY_TYPES[enemyType];

    const response = await fetch(`${API_BASE}/api/combat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress, enemyType: enemyTypeNum, floor }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start combat',
    };
  }
}

/**
 * Build player attack transaction - Returns data for signing
 * The player's wallet signs this, gas is sponsored
 */
export async function buildPlayerAttackTransaction(
  playerAddress: string
): Promise<{
  success: boolean;
  hash?: string;
  rawTxnHex?: string;
  feePayerAddress?: string;
  feePayerAuthenticatorHex?: string;
  sponsored?: boolean;
  error?: string;
}> {
  try {
    // Generate a random seed for crit calculation
    const seed = Math.floor(Math.random() * 1000000);

    const response = await fetch(`${API_BASE}/api/sponsor-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: playerAddress,
        function: `${CONTRACT_ADDRESS}::combat::player_attack`,
        typeArguments: [],
        functionArguments: [seed],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build attack transaction',
    };
  }
}

/**
 * Build flee transaction - Returns data for signing
 * The player's wallet signs this, gas is sponsored
 */
export async function buildFleeTransaction(
  playerAddress: string
): Promise<{
  success: boolean;
  hash?: string;
  rawTxnHex?: string;
  feePayerAddress?: string;
  feePayerAuthenticatorHex?: string;
  sponsored?: boolean;
  error?: string;
}> {
  try {
    // Generate a random seed for flee calculation
    const seed = Math.floor(Math.random() * 1000000);

    const response = await fetch(`${API_BASE}/api/sponsor-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: playerAddress,
        function: `${CONTRACT_ADDRESS}::combat::flee_combat`,
        typeArguments: [],
        functionArguments: [seed],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build flee transaction',
    };
  }
}

/**
 * Execute enemy attack - Server-authorized (invisible wallet)
 */
export async function executeEnemyAttack(
  playerAddress: string
): Promise<EnemyAttackResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/combat/enemy-attack`, {
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
      error: error instanceof Error ? error.message : 'Failed to execute enemy attack',
    };
  }
}

/**
 * Submit a signed sponsored transaction
 */
export async function submitSignedTransaction(
  rawTxnHex: string,
  signatureHex: string,
  sender: string,
  feePayerAddress?: string,
  feePayerAuthenticatorHex?: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/submit-sponsored`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawTxnHex,
        signatureHex,
        sender,
        feePayerAddress,
        feePayerAuthenticatorHex,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, txHash: data.hash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit transaction',
    };
  }
}
