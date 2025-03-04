import express from 'express';
import Order from '../models/Order.js';``
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';
import Product from '../models/Product.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).populate('items.productId');
        res.json(orders.reverse());
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders", error });
    }
});

router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const orders = await Order.find().populate('items.productId');
        orders.reverse();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { items, totalAmount } = req.body;
        console.log(req.body);
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Order must contain items" });
        }

        // Reduce stock for each product
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (product) {
              if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.name}` });
              }
              product.stock -= item.quantity;
              await product.save();
            }
          }

        // Create order
        const newOrder = new Order({
            userId: req.user.id,
            items,
            totalAmount,
            status: "Pending",
        });

        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

router.put('/:orderId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Order status is required." });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found." });
        }

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: "Failed to update order status", error });
    }
});

export default router;
