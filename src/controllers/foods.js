const FoodService = require("../services/food");
const path = require("path");
const fs = require("fs");

class FoodController {
  // Helper function để xóa file upload nếu có lỗi
  static deleteUploadedFile(file) {
    if (file) {
      const filePath = path.join(__dirname, "../uploads/foods", file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  // Get all foods with pagination
  static async getAllFoods(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Validate pagination parameters
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

      const result = await FoodService.getAllFoods(pageNum, limitNum);

      res.status(200).json({
        success: true,
        message: "Foods retrieved successfully",
        data: result.foods,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve foods",
        error: error.message,
      });
    }
  }

  // Get food by ID
  static async getFoodById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      const foodId = parseInt(id);
      if (isNaN(foodId)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
        });
      }

      const food = await FoodService.getFoodById(foodId);

      res.status(200).json({
        success: true,
        message: "Food retrieved successfully",
        data: food.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Food not found" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Failed to retrieve food",
        error: error.message,
      });
    }
  }

  // Get foods by category
  static async getFoodsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!category || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category không được để trống",
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

      const result = await FoodService.getFoodsByCategory(
        category.trim(),
        pageNum,
        limitNum
      );

      res.status(200).json({
        success: true,
        message: "Foods retrieved successfully",
        data: result.foods,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve foods",
        error: error.message,
      });
    }
  }

  // Create new food (WITH IMAGE UPLOAD)
  static async createFood(req, res) {
    try {
      const foodData = { ...req.body };

      // Validate required fields
      if (!foodData.name || !foodData.name.trim()) {
        FoodController.deleteUploadedFile(req.file);
        return res.status(400).json({
          success: false,
          message: "Tên món ăn không được để trống",
        });
      }

      if (!foodData.price) {
        FoodController.deleteUploadedFile(req.file);
        return res.status(400).json({
          success: false,
          message: "Giá không được để trống",
        });
      }

      // Nếu có upload file ảnh
      if (req.file) {
        // Tạo URL để truy cập ảnh
        const imageUrl = `/uploads/foods/${req.file.filename}`;
        foodData.img = imageUrl;
      }

      const food = await FoodService.createFood(foodData);

      res.status(201).json({
        success: true,
        message: "Food created successfully",
        data: food.toJSON(),
      });
    } catch (error) {
      // Nếu có lỗi, xóa file đã upload
      FoodController.deleteUploadedFile(req.file);

      res.status(400).json({
        success: false,
        message: "Failed to create food",
        error: error.message,
      });
    }
  }

  // Update food (WITH IMAGE UPLOAD)
  static async updateFood(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      const foodId = parseInt(id);
      if (isNaN(foodId)) {
        FoodController.deleteUploadedFile(req.file);
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
        });
      }

      const updateData = { ...req.body };

      // Lấy thông tin food cũ để xóa ảnh cũ nếu cần
      const oldFood = await FoodService.getFoodById(foodId);

      // Nếu có upload file ảnh mới
      if (req.file) {
        // Xóa ảnh cũ nếu tồn tại
        if (oldFood.img) {
          const oldImagePath = path.join(__dirname, "..", oldFood.img);
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
            } catch (err) {
              console.error("Error deleting old image:", err);
            }
          }
        }

        // Cập nhật đường dẫn ảnh mới
        const imageUrl = `/uploads/foods/${req.file.filename}`;
        updateData.img = imageUrl;
      }

      const food = await FoodService.updateFood(foodId, updateData);

      res.status(200).json({
        success: true,
        message: "Food updated successfully",
        data: food.toJSON(),
      });
    } catch (error) {
      // Nếu có lỗi, xóa file mới đã upload
      FoodController.deleteUploadedFile(req.file);

      const statusCode = error.message === "Food not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to update food",
        error: error.message,
      });
    }
  }

  // Update food quantity
  static async updateQuantity(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      // Validate ID
      const foodId = parseInt(id);
      if (isNaN(foodId)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
        });
      }

      // Validate quantity
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({
          success: false,
          message: "Số lượng không được để trống",
        });
      }

      const food = await FoodService.updateQuantity(foodId, quantity);

      res.status(200).json({
        success: true,
        message: "Food quantity updated successfully",
        data: food.toJSON(),
      });
    } catch (error) {
      const statusCode = error.message === "Food not found" ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: "Failed to update quantity",
        error: error.message,
      });
    }
  }

  // Delete food
  static async deleteFood(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      const foodId = parseInt(id);
      if (isNaN(foodId)) {
        return res.status(400).json({
          success: false,
          message: "ID không hợp lệ",
        });
      }

      // Lấy thông tin food để xóa ảnh
      const food = await FoodService.getFoodById(foodId);

      // Xóa ảnh nếu tồn tại
      if (food.img) {
        const imagePath = path.join(__dirname, "..", food.img);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (err) {
            console.error("Error deleting image:", err);
            // Tiếp tục xóa food trong database dù ảnh không xóa được
          }
        }
      }

      const result = await FoodService.deleteFood(foodId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const statusCode = error.message === "Food not found" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: "Failed to delete food",
        error: error.message,
      });
    }
  }

  // Search foods
  static async searchFoods(req, res) {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q || !q.trim()) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được để trống",
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

      const result = await FoodService.searchFoods(q.trim(), pageNum, limitNum);

      res.status(200).json({
        success: true,
        message: "Foods searched successfully",
        data: result.foods,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to search foods",
        error: error.message,
      });
    }
  }
}

module.exports = FoodController;
