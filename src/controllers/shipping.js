// controllers/shipping.controller.js
const ShippingService = require("../services/shipping");

class ShippingController {
  /**
   * POST /api/shipping/fee
   * Tính phí ship dựa trên tên phường
   */
  static async calculateFee(req, res) {
    try {
      const { wardName } = req.body;

      if (!wardName) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp tên phường",
          error: "wardName is required",
        });
      }

      const result = ShippingService.calculateShippingFee(wardName);

      res.status(200).json({
        success: true,
        ward: result.ward,
        normalizedWard: result.normalizedWard,
        shippingFee: result.shippingFee,
        isDefaultFee: result.isDefaultFee,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể tính phí vận chuyển",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/shipping/rates
   * Lấy danh sách tất cả phường và giá ship
   */
  static async getAllRates(req, res) {
    try {
      const result = ShippingService.getAllShippingRates();

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể lấy bảng giá",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/shipping/validate
   * Kiểm tra phường có hợp lệ không
   */
  static async validateWard(req, res) {
    try {
      const { wardName } = req.body;

      if (!wardName) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp tên phường",
          error: "wardName is required",
        });
      }

      const isValid = ShippingService.isValidWard(wardName);

      res.status(200).json({
        success: true,
        wardName,
        isValid,
        message: isValid
          ? "Phường hợp lệ"
          : "Phường không có trong danh sách, sẽ áp dụng phí mặc định",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Không thể xác thực phường",
        error: error.message,
      });
    }
  }
}

module.exports = ShippingController;
