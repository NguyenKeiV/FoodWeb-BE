const { db, transaction } = require("../config/database");
const { Op } = require("sequelize");

class FoodService {
  // Get Food model from database instance
  static get FoodModel() {
    return db.Food;
  }

  // Get all foods with pagination
  static async getAllFoods(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: foods } = await this.FoodModel.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      return {
        foods: foods.map((food) => food.toJSON()),
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

  // Get food by ID
  static async getFoodById(id) {
    try {
      const food = await this.FoodModel.findByPk(id);
      if (!food) {
        throw new Error("Food not found");
      }
      return food;
    } catch (error) {
      throw error;
    }
  }

  // Get foods by category
  static async getFoodsByCategory(category, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: foods } = await this.FoodModel.findAndCountAll({
        where: { category },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      return {
        foods: foods.map((food) => food.toJSON()),
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

  // Create new food
  static async createFood(foodData) {
    try {
      const { name, quantity, img, price, category } = foodData;

      // Validate required fields
      if (!name || !name.trim()) {
        throw new Error("Tên món ăn không được để trống");
      }

      if (price === undefined || price === null || price === "") {
        throw new Error("Giá không được để trống");
      }

      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("Giá phải là số và không được âm");
      }

      // Create food using transaction
      const food = await transaction(async (t) => {
        return await this.FoodModel.create(
          {
            name: name.trim(),
            quantity: quantity ? parseInt(quantity) : 0,
            img: img || null,
            price: priceNum,
            category: category ? category.trim() : null,
          },
          { transaction: t }
        );
      });

      return food;
    } catch (error) {
      // Xử lý validation errors từ Sequelize
      if (error.name === "SequelizeValidationError") {
        const messages = error.errors.map((e) => e.message).join(", ");
        throw new Error(messages);
      }
      throw error;
    }
  }

  // Update food
  static async updateFood(id, updateData) {
    try {
      const food = await this.getFoodById(id);

      // Validate dữ liệu update
      const validatedData = {};

      if (updateData.name !== undefined) {
        if (!updateData.name.trim()) {
          throw new Error("Tên món ăn không được để trống");
        }
        validatedData.name = updateData.name.trim();
      }

      if (updateData.price !== undefined) {
        const priceNum = parseFloat(updateData.price);
        if (isNaN(priceNum) || priceNum < 0) {
          throw new Error("Giá phải là số và không được âm");
        }
        validatedData.price = priceNum;
      }

      if (updateData.quantity !== undefined) {
        const quantityNum = parseInt(updateData.quantity);
        if (isNaN(quantityNum) || quantityNum < 0) {
          throw new Error("Số lượng phải là số nguyên và không được âm");
        }
        validatedData.quantity = quantityNum;
      }

      if (updateData.category !== undefined) {
        validatedData.category = updateData.category
          ? updateData.category.trim()
          : null;
      }

      if (updateData.img !== undefined) {
        validatedData.img = updateData.img || null;
      }

      await food.update(validatedData);
      return food;
    } catch (error) {
      if (error.name === "SequelizeValidationError") {
        const messages = error.errors.map((e) => e.message).join(", ");
        throw new Error(messages);
      }
      throw error;
    }
  }

  // Update food quantity
  static async updateQuantity(id, quantity) {
    try {
      const food = await this.getFoodById(id);

      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        throw new Error("Số lượng phải là số nguyên và không được âm");
      }

      await food.update({ quantity: quantityNum });
      return food;
    } catch (error) {
      throw error;
    }
  }

  // Delete food (soft delete if enabled, otherwise hard delete)
  static async deleteFood(id) {
    try {
      const food = await this.getFoodById(id);
      await food.destroy();
      return { message: "Food deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Search foods by name
  static async searchFoods(searchTerm, page = 1, limit = 10) {
    try {
      if (!searchTerm || !searchTerm.trim()) {
        throw new Error("Từ khóa tìm kiếm không được để trống");
      }

      const offset = (page - 1) * limit;

      const { count, rows: foods } = await this.FoodModel.findAndCountAll({
        where: {
          name: {
            [Op.like]: `%${searchTerm.trim()}%`,
          },
        },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      return {
        foods: foods.map((food) => food.toJSON()),
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
}

module.exports = FoodService;
