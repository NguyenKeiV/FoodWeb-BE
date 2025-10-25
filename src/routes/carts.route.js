const express = require("express");
const CartController = require("../controllers/carts");
const router = express.Router();

// ✅ Middleware để log tất cả requests
router.use((req, res, next) => {
  console.log("🔍 Cart Route:", {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
});

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// Otherwise Express will match /:userId first and treat "summary", "clear", "items" as userId

// Get cart summary for a user
router.get("/:userId/summary", CartController.getCartSummary);

// Clear entire cart - MUST be a specific path to avoid conflict
router.delete("/:userId/clear", CartController.clearCart);

// Update cart item quantity
router.put("/:userId/items/:id", CartController.updateCartItem);

// Remove single item from cart
router.delete("/:userId/items/:id", CartController.removeFromCart);

// Get all cart items for a user
router.get("/:userId", CartController.getUserCart);

// Add item to cart
router.post("/:userId", CartController.addToCart);

console.log("✅ Cart routes registered:");
console.log("  GET    /api/carts/:userId/summary");
console.log("  DELETE /api/carts/:userId/clear");
console.log("  PUT    /api/carts/:userId/items/:id");
console.log("  DELETE /api/carts/:userId/items/:id");
console.log("  GET    /api/carts/:userId");
console.log("  POST   /api/carts/:userId");

module.exports = router;
