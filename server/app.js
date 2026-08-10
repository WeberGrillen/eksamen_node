import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit'
import session from 'express-session';
import middlewareRouter from './routers/middlewareRouters.js';
import sessionRouter from  './routers/sessionRouter.js';
import authRouter from './routers/authRouter.js';
import recipeRouter from './routers/recipeRouter.js';
import cors from 'cors';

// App setup
const app = express();
const PORT = process.env.PORT ?? 8080;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// Express middleware 
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 50, 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56,
}))
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));


// Routers
app.use(middlewareRouter);
app.use(sessionRouter);
app.use(authRouter);
app.use(recipeRouter);


// 404
app.get('/{*splat}', (req, res) => {
    res.send(`<div><h1>404</h1><h3>Page - ${req.path} - doesn't exist</h3></div>`
    );
});

app.all('/{*splat}', (req, res)  => {
    res.send({ errorMessage: `The route for ${req.path} and the HTTP method ${req.method} does not exist` });
});



// Database + Server start
app.listen(PORT, () => {
    console.log('Server started on port: ', PORT);
});