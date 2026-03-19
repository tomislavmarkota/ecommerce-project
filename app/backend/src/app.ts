import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import googleRoutes from './routes/google.routes';
import productRoutes from './routes/product.routes';
import cookieParser from 'cookie-parser';
import categoryRoutes from './routes/category.routes';
import subcategoryRoutes from './routes/subcategory.routes';
import userRoutes from './routes/user.routes';
import rolesRouter from './routes/roles.routes';
import catalogRouter from './routes/catalog.routes';
import checkoutRouter from './routes/checkout.routes';
import orderRouter from './routes/order.routes';

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleRoutes);
app.use('/api/products', productRoutes);
app.use('/api/catalog', catalogRouter);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/roles', rolesRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', orderRouter);

app.get('/', (_, res) => res.status(200).send({ message: 'Welcome to Express + TS server' }));

export default app;
