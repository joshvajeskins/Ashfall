/**
 * Combat Service - Handles on-chain combat transactions
 *
 * Flow:
 * 1. Server starts combat (invisible wallet) - spawns enemy on-chain
 * 2. Player attacks (user wallet + gas sponsor) - player's turn
 * 3. Server executes enemy attack (invisible wallet) - enemy's turn
 * 4. Repeat until combat ends
 */

import { MODULES } from '@/lib/contract';

const API_BASE = '';

export interface CombatStartResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  // On-chain combat state
  enemyIntent?: number;
  enemyHealth?: number;
  enemyMaxHealth?: number;
  // Already in combat indicator
  alreadyInCombat?: boolean;
  combatState?: { enemyHealth: number; enemyMaxHealth: number; turn: number; isActive: boolean };
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
  newIntent?: number;
  enemyIntent?: number; // On-chain intent for next turn
  combatActive?: boolean;
  error?: string;
}

export interface PlayerDefendResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface PlayerHeavyAttackResponse {
  success: boolean;
  txHash?: string;
  damage?: number;
  wasCrit?: boolean;
  enemyKilled?: boolean;
  manaUsed?: number;
  error?: string;
}

export interface PlayerHealResponse {
  success: boolean;
  txHash?: string;
  amountHealed?: number;
  newHealth?: number;
  manaUsed?: number;
  error?: string;
}

// Enemy intent types
export const ENEMY_INTENT = {
  ATTACK: 0,
  HEAVY_ATTACK: 1,
  DEFEND: 2,
} as const;

export type EnemyIntentType = typeof ENEMY_INTENT[keyof typeof ENEMY_INTENT];

export function getIntentLabel(intent: number): string {
  switch (intent) {
    case ENEMY_INTENT.ATTACK:
      return '⚔️ Attack';
    case ENEMY_INTENT.HEAVY_ATTACK:
      return '💥 Heavy Attack';
    case ENEMY_INTENT.DEFEND:
      return '🛡️ Defend';
    default:
      return '❓ Unknown';
  }
}

// Mana costs
export const MANA_COSTS = {
  HEAVY_ATTACK: 20,
  HEAL: 30,
} as const;

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
 * @param roomId - Room ID for enemy health persistence on flee
 */
export async function startCombat(
  playerAddress: string,
  enemyType: keyof typeof ENEMY_TYPES | number,
  floor: number,
  roomId: number = 0
): Promise<CombatStartResponse> {
  try {
    const enemyTypeNum = typeof enemyType === 'number'
      ? enemyType
      : ENEMY_TYPES[enemyType];

    const response = await fetch(`${API_BASE}/api/combat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerAddress, enemyType: enemyTypeNum, floor, roomId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        alreadyInCombat: data.alreadyInCombat,
        combatState: data.combatState,
      };
    }

    return data;
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
        function: `${MODULES.combat}::player_attack`,
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
        function: `${MODULES.combat}::flee_combat`,
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

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Extract error message from JSON response
      const errorMessage = data.error || `HTTP ${response.status}`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute enemy attack',
    };
  }
}

/**
 * Build player defend transaction - Returns data for signing
 * No mana cost, reduces next incoming damage by 50%
 */
export async function buildPlayerDefendTransaction(
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
    const response = await fetch(`${API_BASE}/api/sponsor-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: playerAddress,
        function: `${MODULES.combat}::player_defend`,
        typeArguments: [],
        functionArguments: [],
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
      error: error instanceof Error ? error.message : 'Failed to build defend transaction',
    };
  }
}

/**
 * Build player heavy attack transaction - Returns data for signing
 * Costs 20 mana, deals 1.5x damage
 */
export async function buildPlayerHeavyAttackTransaction(
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
        function: `${MODULES.combat}::player_heavy_attack`,
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
      error: error instanceof Error ? error.message : 'Failed to build heavy attack transaction',
    };
  }
}

/**
 * Build player heal transaction - Returns data for signing
 * Costs 30 mana, heals 30% of max HP
 */
export async function buildPlayerHealTransaction(
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
    const response = await fetch(`${API_BASE}/api/sponsor-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: playerAddress,
        function: `${MODULES.combat}::player_heal`,
        typeArguments: [],
        functionArguments: [],
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
      error: error instanceof Error ? error.message : 'Failed to build heal transaction',
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
