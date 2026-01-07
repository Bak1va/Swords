"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const user_1 = __importDefault(require("./routes/user"));
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const LOBBY_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTH_BASE_URL = process.env.AUTH_BASE_URL || '';
const AUTH_REALM = process.env.AUTH_REALM || '';
const AUTH_API_ID = process.env.AUTH_API_ID || '';
const AUTH_API_SECRET = process.env.AUTH_API_SECRET || '';
const corsOptions = {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Mount user routes under /api
app.use('/api', user_1.default);
const lobbies = new Map();
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', lobbies: lobbies.size });
});
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
});
(0, socket_1.initSocket)(io);
httpServer.listen(PORT, () => {
    console.log(`Planning Poker server running on port ${PORT}`);
});
