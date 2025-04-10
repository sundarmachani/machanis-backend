import express, { json } from 'express';
import { connect } from 'mongoose';
import { config } from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import stripeRoutes from './routes/stripe.js';
import uploadRoutes from './routes/upload.js'
import userRoutes from './routes/users.js';
import client from 'prom-client';

config();

const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({ timeout: 5000 });
const allowedOrigins = ["http://localhost:5173", "https://machanis.vercel.app"];

const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'statusCode'],
});

app.use((req, res, next) => {
    res.on('finish', () => {
        httpRequestCounter.labels(req.method, req.path, res.statusCode).inc();
    });
    next();
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // Allow cookies and authentication headers
}));

app.options("*", cors());

app.use(express.json());

const connectDB = async () => {
    try {
        await connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        process.exit(1);
    }
};

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', stripeRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
