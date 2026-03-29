import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/productRoutes/product.routes';
import categoryRoutes from './routes/category.routes';
import subcategoryRoutes from './routes/subcategory.routes';
import userRoutes from './routes/user.routes';
import rolesRouter from './routes/roles.routes';
import catalogRouter from './routes/catalogRoutes/catalog.routes';
import checkoutRouter from './routes/checkoutRoutes/checkout.routes';
import orderRouter from './routes/orderRoutes/order.routes';
import productImageRoutes from './routes/productImage.routes';
import companyRoutes from './routes/companyRoutes';

const app = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

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
app.use('/api/companies', companyRoutes);

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'API is running' });
});

export default app;
