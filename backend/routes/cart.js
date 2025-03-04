import express from 'express';
import Cart from '../models/Cart.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Product from '../models/Product.js'
const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

    // ✅ If the cart does not exist, create a new one
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body; // ✅ Quantity passed from frontend
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });

    // ✅ If no cart exists, create a new one
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // ✅ Check if product already exists in the cart
    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity; // ✅ Increase quantity if product exists
    } else {
      cart.items.push({ productId, quantity }); // ✅ Add as new product if not in cart
    }

    await cart.save();
    res.json(cart); // ✅ Return updated cart

  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart" });
  }
});


router.delete('/:productId', authMiddleware, async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  cart.items = cart.items.filter(item => item.productId.toString() !== req.params.productId);
  await cart.save();
  res.json(cart);
});

export default router;
