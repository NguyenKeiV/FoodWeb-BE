const CartService = require("../services/cart");

class CartController {
  // Get user's cart
  static async getUserCart(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;
      const { page = 1, limit = 100 } = req.query;

      console.log("📋 getUserCart called:", { userId, page, limit });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Page phải là số nguyên dương",
        });
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Limit phải từ 1-100",
        });
      }

      const result = await CartService.getCartByUserId(
        userId,
        pageNum,
        limitNum
      );

      res.status(200).json({
        success: true,
        message: "Cart retrieved successfully",
        data: result.cartItems,
        total: result.total,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ getUserCart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart",
        error: error.message,
      });
    }
  }

  // Get cart summary
  static async getCartSummary(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;

      console.log("📊 getCartSummary called:", { userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
        });
      }

      const summary = await CartService.getCartSummary(userId);

      res.status(200).json({
        success: true,
        message: "Cart summary retrieved successfully",
        data: summary,
      });
    } catch (error) {
      console.error("❌ getCartSummary error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart summary",
        error: error.message,
      });
    }
  }

  // Add item to cart
  static async addToCart(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;
      const { food_id, quantity = 1 } = req.body;

      console.log("🛒 addToCart called:", {
        userId,
        food_id,
        quantity,
        body: req.body,
        params: req.params,
      });

      // Validation
      if (!userId) {
        console.error("❌ Missing userId");
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
          error: "Missing userId",
        });
      }

      if (!food_id) {
        console.error("❌ Missing food_id");
        return res.status(400).json({
          success: false,
          message: "Food ID không được để trống",
          error: "Missing food_id",
        });
      }

      const foodId = parseInt(food_id);
      if (isNaN(foodId)) {
        console.error("❌ Invalid food_id:", food_id);
        return res.status(400).json({
          success: false,
          message: "Food ID không hợp lệ",
          error: `Invalid food_id: ${food_id}`,
        });
      }

      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 1) {
        console.error("❌ Invalid quantity:", quantity);
        return res.status(400).json({
          success: false,
          message: "Số lượng phải là số nguyên dương",
          error: `Invalid quantity: ${quantity}`,
        });
      }

      // Call service
      const cartItem = await CartService.addToCart(userId, foodId, quantityNum);

      console.log("✅ Cart item added successfully:", cartItem.id);

      res.status(201).json({
        success: true,
        message: "Item added to cart successfully",
        data: cartItem.toJSON(),
      });
    } catch (error) {
      console.error("❌ addToCart error:", error.message);
      console.error("Error stack:", error.stack);

      // Determine status code based on error
      let statusCode = 500;
      if (
        error.message.includes("not found") ||
        error.message.includes("không tồn tại")
      ) {
        statusCode = 404;
      } else if (
        error.message.includes("Không đủ số lượng") ||
        error.message.includes("không được để trống") ||
        error.message.includes("không hợp lệ")
      ) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: "Failed to add item to cart",
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                name: error.name,
                stack: error.stack,
              }
            : undefined,
      });
    }
  }

  // Update cart item quantity
  static async updateCartItem(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;
      const { id } = req.params;
      const { quantity } = req.body;

      console.log("🔄 updateCartItem called:", { userId, id, quantity });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
        });
      }

      const cartItemId = parseInt(id);
      if (isNaN(cartItemId)) {
        return res.status(400).json({
          success: false,
          message: "Cart item ID không hợp lệ",
        });
      }

      if (quantity === undefined || quantity === null) {
        return res.status(400).json({
          success: false,
          message: "Số lượng không được để trống",
        });
      }

      const cartItem = await CartService.updateCartItem(
        cartItemId,
        userId,
        quantity
      );

      console.log("✅ Cart item updated:", cartItemId);

      res.status(200).json({
        success: true,
        message: "Cart item updated successfully",
        data: cartItem.toJSON(),
      });
    } catch (error) {
      console.error("❌ updateCartItem error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to update cart item",
        error: error.message,
      });
    }
  }

  // ✅ Remove single item from cart (CHỈ CỦA USER NÀY)
  static async removeFromCart(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;
      const { id } = req.params;

      console.log("🗑️ removeFromCart called:", { userId, id });

      // ✅ CRITICAL: Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
        });
      }

      const cartItemId = parseInt(id);
      if (isNaN(cartItemId)) {
        return res.status(400).json({
          success: false,
          message: "Cart item ID không hợp lệ",
        });
      }

      // ✅ Service sẽ kiểm tra user_id để đảm bảo chỉ xóa cart của user này
      const result = await CartService.removeFromCart(cartItemId, userId);

      console.log("✅ Cart item removed:", cartItemId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("❌ removeFromCart error:", error);
      const statusCode = error.message.includes("not found") ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Failed to remove item from cart",
        error: error.message,
      });
    }
  }

  // ✅ Clear entire cart (CHỈ CỦA USER CỤ THỂ)
  static async clearCart(req, res) {
    try {
      const userId = req.params.userId || req.user?.id;

      console.log("🗑️ clearCart called for userId:", userId);
      console.log("📋 Request details:", {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        params: req.params,
      });

      // ✅ CRITICAL: Validate userId trước khi xóa
      if (!userId) {
        console.error("❌ No userId provided");
        return res.status(400).json({
          success: false,
          message: "User ID không được để trống",
        });
      }

      console.log("🔄 Calling CartService.clearCart...");

      // ✅ Service sẽ CHỈ xóa cart của userId này
      const result = await CartService.clearCart(userId);

      console.log("✅ Cart cleared successfully:", result);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          deletedCount: result.deletedCount,
        },
      });
    } catch (error) {
      console.error("❌ clearCart error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to clear cart",
        error: error.message,
      });
    }
  }
}

module.exports = CartController;
