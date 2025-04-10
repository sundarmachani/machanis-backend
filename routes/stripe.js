import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// ✅ Step 1: Create Checkout Session & Save Order
router.post("/", async (req, res) => {
  try {
    const { items, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required to place an order" });
    }

    let totalAmount = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        console.error(`Product not found: ${item.productId}`);
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      });
    }

    // ✅ Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    // ✅ Save Order with correct totalAmount
    const newOrder = new Order({
      userId,
      items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
      totalAmount,
      status: "Pending",
      sessionId: session.id,
    });

    await newOrder.save();

    // ✅ Delete the user's cart after checkout
    await Cart.findOneAndDelete({ userId });

    res.json({ url: session.url });

  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/confirm-payment", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const order = await Order.findOne({ sessionId });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          if (product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await product.save();
          } else {
            console.warn(`Not enough stock for product ID: ${item.productId}`);
          }
        }
      }

      // ✅ Update Order Status
      order.status = "Paid";
      await order.save();

      return res.json({ success: true, message: "Payment successful, stock updated" });
    } else {
      return res.status(400).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
