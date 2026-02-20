import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import ticketingRoutes from './routes/tickets.js';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware (ORDER MATTERS)
app.use(cors());
app.use(express.json()); // required for req.body
app.use(morgan('dev'));

// Serve frontend later
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (modular)
app.use('/api', ticketingRoutes);

// Health check route
app.get('/', (req, res) => {
    res.send('Ticketing System API is running.');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});