import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import userRouter from './routes/user';
import { initSocket } from './socket';

dotenv.config();

const app = express();

const PORT: number = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const LOBBY_TTL = 24 * 60 * 60 * 1000; // 24 hours

const AUTH_BASE_URL = process.env.AUTH_BASE_URL || '';
const AUTH_REALM = process.env.AUTH_REALM || '';
const AUTH_API_ID = process.env.AUTH_API_ID || '';
const AUTH_API_SECRET = process.env.AUTH_API_SECRET || '';

const corsOptions = {
  origin: CORS_ORIGIN === '*' ? true : (CORS_ORIGIN.split(',') as string[]),
  methods: ['GET', 'POST']
};
app.use(cors(corsOptions));
app.use(express.json());

// Mount user routes under /api
app.use('/api', userRouter);

type User = {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
};

type Lobby = {
  id: string;
  host: string;
  users: User[];
  currentStory: string | null;
  votesRevealed: boolean;
  createdAt: number;
};

const lobbies: Map<string, Lobby> = new Map();

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', lobbies: lobbies.size });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

initSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});
