import { Request, Response, NextFunction } from 'express';
import { BattleEngine } from '../services/battle-engine';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authorization required',
      hint: 'Include header: Authorization: Bearer YOUR_API_KEY',
    });
  }
  
  const apiKey = authHeader.slice(7);
  const agent = BattleEngine.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  (req as any).agent = agent;
  next();
}
