import { AccountAddress } from '@aptos-labs/ts-sdk';
import { submitTransaction } from './moveClient.js';
import { modules } from '../config/movement.js';
import { TransactionResult, getErrorMessage } from '../types/index.js';

export async function completeFloor(
  playerAddress: string,
  enemiesKilled: number,
  xpEarned: number
): Promise<TransactionResult> {
  try {
    const player = AccountAddress.fromString(playerAddress);
    const result = await submitTransaction(
      `${modules.dungeon}::complete_floor`,
      [],
      [player, enemiesKilled, xpEarned]
    );
    return result;
  } catch (error) {
    return handleError(error);
  }
}

export async function completeBossFloor(
  playerAddress: string,
  xpEarned: number
): Promise<TransactionResult> {
  try {
    const player = AccountAddress.fromString(playerAddress);
    const result = await submitTransaction(
      `${modules.dungeon}::complete_boss_floor`,
      [],
      [player, xpEarned]
    );
    return result;
  } catch (error) {
    return handleError(error);
  }
}

export async function exitDungeonSuccess(
  playerAddress: string
): Promise<TransactionResult> {
  try {
    const player = AccountAddress.fromString(playerAddress);
    const result = await submitTransaction(
      `${modules.dungeon}::exit_dungeon_success`,
      [],
      [player]
    );
    return result;
  } catch (error) {
    return handleError(error);
  }
}

export async function playerDied(
  playerAddress: string
): Promise<TransactionResult> {
  try {
    const player = AccountAddress.fromString(playerAddress);
    const result = await submitTransaction(
      `${modules.dungeon}::player_died`,
      [],
      [player]
    );
    return result;
  } catch (error) {
    return handleError(error);
  }
}

export async function startBossEncounter(
  playerAddress: string
): Promise<TransactionResult> {
  try {
    const player = AccountAddress.fromString(playerAddress);
    const result = await submitTransaction(
      `${modules.dungeon}::start_boss_encounter`,
      [],
      [player]
    );
    return result;
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): TransactionResult {
  const message = error instanceof Error ? error.message : 'Unknown error';

  // Extract Move error codes from message
  const errorCodeMatch = message.match(/Move abort.*?(\d+)/);
  if (errorCodeMatch) {
    const code = parseInt(errorCodeMatch[1], 10);
    return {
      success: false,
      error: getErrorMessage(code),
      errorCode: `E_${code}`,
    };
  }

  return {
    success: false,
    error: message,
  };
}
