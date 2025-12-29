import { Request, Response, NextFunction } from 'express';

// Basic player address validation
export function validatePlayerAddress(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { playerAddress } = req.body;

  if (!playerAddress) {
    res.status(400).json({
      success: false,
      error: 'Player address is required',
      errorCode: 'MISSING_PLAYER_ADDRESS',
    });
    return;
  }

  // Basic hex address validation
  if (typeof playerAddress !== 'string' || !playerAddress.startsWith('0x')) {
    res.status(400).json({
      success: false,
      error: 'Invalid player address format',
      errorCode: 'INVALID_ADDRESS_FORMAT',
    });
    return;
  }

  next();
}

// Request logging middleware
export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}
