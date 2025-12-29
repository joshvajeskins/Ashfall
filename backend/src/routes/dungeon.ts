import { Router, Request, Response } from 'express';
import { validatePlayerAddress } from '../middleware/auth.js';
import * as dungeonService from '../services/dungeonService.js';
import type {
  CompleteFloorRequest,
  CompleteBossRequest,
  ExitSuccessRequest,
  PlayerDiedRequest,
} from '../types/index.js';

const router = Router();

// POST /api/dungeon/complete-floor
router.post(
  '/complete-floor',
  validatePlayerAddress,
  async (req: Request<object, object, CompleteFloorRequest>, res: Response) => {
    const { playerAddress, enemiesKilled, xpEarned } = req.body;

    if (typeof enemiesKilled !== 'number' || typeof xpEarned !== 'number') {
      res.status(400).json({
        success: false,
        error: 'enemiesKilled and xpEarned must be numbers',
        errorCode: 'INVALID_PARAMS',
      });
      return;
    }

    const result = await dungeonService.completeFloor(
      playerAddress,
      enemiesKilled,
      xpEarned
    );
    res.status(result.success ? 200 : 400).json(result);
  }
);

// POST /api/dungeon/complete-boss
router.post(
  '/complete-boss',
  validatePlayerAddress,
  async (req: Request<object, object, CompleteBossRequest>, res: Response) => {
    const { playerAddress, xpEarned } = req.body;

    if (typeof xpEarned !== 'number') {
      res.status(400).json({
        success: false,
        error: 'xpEarned must be a number',
        errorCode: 'INVALID_PARAMS',
      });
      return;
    }

    const result = await dungeonService.completeBossFloor(playerAddress, xpEarned);
    res.status(result.success ? 200 : 400).json(result);
  }
);

// POST /api/dungeon/exit-success
router.post(
  '/exit-success',
  validatePlayerAddress,
  async (req: Request<object, object, ExitSuccessRequest>, res: Response) => {
    const { playerAddress } = req.body;
    const result = await dungeonService.exitDungeonSuccess(playerAddress);
    res.status(result.success ? 200 : 400).json(result);
  }
);

// POST /api/dungeon/player-died
router.post(
  '/player-died',
  validatePlayerAddress,
  async (req: Request<object, object, PlayerDiedRequest>, res: Response) => {
    const { playerAddress } = req.body;
    const result = await dungeonService.playerDied(playerAddress);
    res.status(result.success ? 200 : 400).json(result);
  }
);

// POST /api/dungeon/start-boss
router.post(
  '/start-boss',
  validatePlayerAddress,
  async (req: Request<object, object, ExitSuccessRequest>, res: Response) => {
    const { playerAddress } = req.body;
    const result = await dungeonService.startBossEncounter(playerAddress);
    res.status(result.success ? 200 : 400).json(result);
  }
);

export default router;
