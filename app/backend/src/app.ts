import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/productRoutes/product.routes';
import cookieParser from 'cookie-parser';
import categoryRoutes from './routes/category.routes';
import subcategoryRoutes from './routes/subcategory.routes';
import userRoutes from './routes/user.routes';
import rolesRouter from './routes/roles.routes';
import catalogRouter from './routes/catalogRoutes/catalog.routes';
import checkoutRouter from './routes/checkoutRoutes/checkout.routes';
import orderRouter from './routes/orderRoutes/order.routes';
import productImageRoutes from './routes/productImage.routes';

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

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/catalog', catalogRouter);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/roles', rolesRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', orderRouter);
app.use('/api/product-images', productImageRoutes);

app.get('/', (_, res) => res.status(200).send({ message: 'Welcome to Express + TS server' }));

export default app;
