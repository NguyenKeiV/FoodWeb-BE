const { db, transaction } = require("../config/database");
const { Op } = require("sequelize");

class CartService {
  // Get Cart model from database instance
  static get CartModel() {
    return db.Cart;
  }

  static get FoodModel() {
    return db.Food;
  }

  static get UserModel() {
    return db.User;
  }

  // Get all cart items for a user
  static async getCartByUserId(userId, page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: cartItems } = await this.CartModel.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: this.FoodModel,
            as: "food",
            attributes: ["id", "name", "img", "price", "quantity", "category"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      // Calculate total
      const total = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price_at_add) * item.quantity;
      }, 0);

      return {
        cartItems: cartItems.map((item) => item.toJSON()),
        total: parseFloat(total.toFixed(2)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
          offset,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get cart item by ID
  static async getCartItemById(id) {
    try {
      const cartItem = await this.CartModel.findByPk(id, {
        include: [
          {
            model: this.FoodModel,
            as: "food",
            attributes: ["id", "name", "img", "price", "quantity", "category"],
          },
        ],
      });

      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      return cartItem;
    } catch (error) {
      throw error;
    }
  }

  // Add item to cart
  static async addToCart(userId, foodId, quantity = 1) {
    try {
      console.log("🛒 Adding to cart:", { userId, foodId, quantity });

      // Validate inputs first
      if (!userId) {
        throw new Error("User ID không được để trống");
      }

      if (!foodId) {
        throw new Error("Food ID không được để trống");
      }

      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 1) {
        throw new Error("Số lượng phải là số nguyên dương");
      }

      // Validate user exists
      const user = await this.UserModel.findByPk(userId);
      if (!user) {
        console.error("❌ User not found:", userId);
        throw new Error("Người dùng không tồn tại");
      }

      console.log("✅ User found:", user.username);

      // Validate food exists and has stock
      const food = await this.FoodModel.findByPk(foodId);
      if (!food) {
        console.error("❌ Food not found:", foodId);
        throw new Error("Sản phẩm không tồn tại");
      }

      console.log("✅ Food found:", food.name, "Stock:", food.quantity);

      if (food.quantity < quantityNum) {
        throw new Error(`Không đủ số lượng. Chỉ còn ${food.quantity} món`);
      }

      // Check if item already in cart
      let cartItem = await this.CartModel.findOne({
        where: {
          user_id: userId,
          food_id: foodId,
        },
      });

      if (cartItem) {
        console.log("📦 Item already in cart, increasing quantity");

        // ALWAYS increase quantity (no error for duplicate)
        const newQuantity = cartItem.quantity + quantityNum;

        // Only check stock availability
        if (food.quantity < newQuantity) {
          throw new Error(`Không đủ số lượng. Chỉ còn ${food.quantity} món`);
        }

        await cartItem.update({
          quantity: newQuantity,
          price_at_add: food.price,
        });

        console.log(
          "✅ Cart item updated: +",
          quantityNum,
          "-> Total:",
          newQuantity
        );
      } else {
        console.log("➕ Creating new cart item");

        cartItem = await this.CartModel.create({
          user_id: userId,
          food_id: foodId,
          quantity: quantityNum,
          price_at_add: food.price,
        });

        console.log("✅ Cart item created:", cartItem.id);
      }

      // Return cart item with food details
      const result = await this.getCartItemById(cartItem.id);
      console.log("✅ Add to cart successful");
      return result;
    } catch (error) {
      console.error("❌ CartService.addToCart error:", error.message);
      throw error;
    }
  }

  // Update cart item quantity
  static async updateCartItem(id, userId, quantity) {
    try {
      const cartItem = await this.CartModel.findOne({
        where: {
          id,
          user_id: userId,
        },
        include: [
          {
            model: this.FoodModel,
            as: "food",
          },
        ],
      });

      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 1) {
        throw new Error("Số lượng phải là số nguyên dương");
      }

      // Check stock
      if (cartItem.food.quantity < quantityNum) {
        throw new Error(
          `Không đủ số lượng. Chỉ còn ${cartItem.food.quantity} món`
        );
      }

      await cartItem.update({ quantity: quantityNum });
      return await this.getCartItemById(cartItem.id);
    } catch (error) {
      throw error;
    }
  }

  // ✅ HARD DELETE: Remove single item from cart (CHỈ CỦA USER NÀY)
  static async removeFromCart(id, userId) {
    try {
      console.log("🗑️ CartService.removeFromCart:", { id, userId });

      // ✅ CRITICAL: Phải có WHERE điều kiện user_id để không xóa nhầm cart người khác!
      const cartItem = await this.CartModel.findOne({
        where: {
          id: id,
          user_id: userId, // ← QUAN TRỌNG: Chỉ tìm cart item CỦA USER NÀY
        },
      });

      if (!cartItem) {
        console.error("❌ Cart item not found or not owned by user");
        throw new Error("Cart item not found");
      }

      console.log("🗑️ Deleting cart item (HARD DELETE)...");

      // ✅ HARD DELETE: force: true để xóa vĩnh viễn
      await cartItem.destroy({ force: true });

      console.log("✅ Cart item permanently deleted from database");

      return { message: "Item removed from cart successfully" };
    } catch (error) {
      console.error("❌ removeFromCart error:", error);
      throw error;
    }
  }

  // ✅ HARD DELETE: Clear all cart items (CHỈ CỦA USER CỤ THỂ)
  static async clearCart(userId) {
    try {
      console.log("🗑️ CartService.clearCart for userId:", userId);

      if (!userId) {
        throw new Error("User ID không được để trống");
      }

      // ✅ CRITICAL: Phải có WHERE user_id để CHỈ xóa cart của user này
      // KHÔNG được xóa toàn bộ bảng carts!
      const deletedCount = await this.CartModel.destroy({
        where: {
          user_id: userId, // ← QUAN TRỌNG: CHỈ xóa cart của user này!
        },
        force: true, // ← HARD DELETE: Xóa vĩnh viễn, không soft delete
      });

      console.log(
        `✅ Permanently deleted ${deletedCount} items from user ${userId}'s cart`
      );

      return {
        message: "Cart cleared successfully",
        deletedCount,
      };
    } catch (error) {
      console.error("❌ clearCart error:", error);
      throw error;
    }
  }

  // Get cart summary (total items and total price)
  static async getCartSummary(userId) {
    try {
      const cartItems = await this.CartModel.findAll({
        where: { user_id: userId },
        include: [
          {
            model: this.FoodModel,
            as: "food",
            attributes: ["name", "img", "price"],
          },
        ],
      });

      const totalItems = cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalPrice = cartItems.reduce((sum, item) => {
        return sum + parseFloat(item.price_at_add) * item.quantity;
      }, 0);

      return {
        totalItems,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        itemCount: cartItems.length,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CartService;
