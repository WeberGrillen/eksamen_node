import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit'
import session from 'express-session';
import middlewareRouter from './routers/middlewareRouters.js';
import sessionRouter from  './routers/sessionRouter.js';
import authRouter from './routers/authRouter.js';
import recipeRouter from './routers/recipeRouter.js';
import profileRouter from './routers/userRouter.js';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import likeSocket from './sockets/likeSocket.js';
import followSocket from './sockets/followSocket.js';

// App setup
const app = express();
const PORT = process.env.PORT ?? 8080;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// Express middleware 
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
});
app.use(sessionMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 300, 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56,
}))
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: (req) => req.path === '/me',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
}));




// Routers
app.use(middlewareRouter);
app.use(sessionRouter);
app.use(authRouter);
app.use(recipeRouter);
app.use(profileRouter);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

io.engine.use(sessionMiddleware);

likeSocket(io);
followSocket(io);


app.get('/api/{*splat}', (req, res) => {
    res.status(404).send({
        data: { errorMessage: `${req.method} ${req.path} does not exist` }
    });
});

app.get('/{*splat}', (req, res) => {
    res.status(404).send(`<div><h1>404</h1><h3>Page - ${req.path} - doesn't exist</h3></div>`);
});

app.all('/{*splat}', (req, res) => {
    res.status(404).send({
        data: { errorMessage: `${req.method} ${req.path} does not exist` }
    });
});



// Database + Server start
server.listen(PORT, () => {
    console.log('Server started on port: ', PORT);
});