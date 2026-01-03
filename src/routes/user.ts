import { Router, Request, Response } from 'express';
import { getKeycloakUserInfo } from '../keycloak';

const router = Router();

// GET /me - returns the userinfo for the bearer token
router.get('/me', async (req: Request, res: Response) => {
  try {
    const auth = req.header('authorization') || req.header('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const token = auth.split(' ')[1];
    const user = await getKeycloakUserInfo(token);
    return res.json({ user });
  } catch (err: any) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err.message || 'failed' });
  }
});

export default router;
