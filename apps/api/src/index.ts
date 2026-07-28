import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbConnect from '../lib/mongodb';
import productRoutes from './routes/products';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
dbConnect().then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Express API! Try visiting /api/products');
});
app.use('/api/products', productRoutes);

// Start server
app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});
