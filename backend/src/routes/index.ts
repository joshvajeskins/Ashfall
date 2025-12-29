import { Router } from 'express';
import dungeonRoutes from './dungeon.js';

const router = Router();

router.use('/dungeon', dungeonRoutes);

export default router;
