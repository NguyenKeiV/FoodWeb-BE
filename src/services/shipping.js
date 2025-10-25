// services/shipping.service.js

class ShippingService {
  // Bảng giá ship cố định cho từng phường TP. Thủ Đức
  static shippingRates = {
    "Hiệp Phú": 10000,
    "Tăng Nhơn Phú A": 10000,
    "Tăng Nhơn Phú B": 10000,
    "Phước Long A": 10000,
    "Phước Long B": 10000,

    "Bình Thọ": 15000,
    "Linh Chiểu": 15000,
    "Linh Tây": 15000,
    "Trường Thọ": 15000,
    "Phước Bình": 15000,
    "Tân Phú": 15000,
    "Trường Thạnh": 15000,

    "Linh Trung": 20000,
    "Linh Đông": 20000,
    "Tam Bình": 20000,
    "Tam Phú": 20000,
    "Bình Chiểu": 20000,
    "Long Bình": 20000,
    "Linh Xuân": 20000,

    "Long Thạnh Mỹ": 25000,
    "Phú Hữu": 25000,
    "Thảo Điền": 25000,
    "An Phú": 25000,
    "An Khánh": 25000,
    "Bình Trưng Đông": 25000,
    "Bình Trưng Tây": 25000,
    "Thạnh Mỹ Lợi": 25000,

    "Cát Lái": 30000,
    "An Lợi Đông": 30000,
    "Thủ Thiêm": 30000,
    "Long Trường": 30000,
    "Long Phước": 30000,
    "Hiệp Bình Phước": 30000,
    "Hiệp Bình Chánh": 30000,
  };

  static DEFAULT_SHIPPING_FEE = 20000;

  /**
   * Chuẩn hóa tên phường - bỏ chữ "Phường " ở đầu
   */
  static normalizeWardName(wardName) {
    if (!wardName) return "";

    // Trim và bỏ chữ "Phường " (case-insensitive)
    const normalized = wardName.trim().replace(/^(Phường|phường)\s+/i, "");
    return normalized;
  }

  /**
   * Tính phí ship dựa trên tên phường
   */
  static calculateShippingFee(wardName) {
    try {
      if (!wardName || !wardName.trim()) {
        throw new Error("Tên phường không được để trống");
      }

      // Chuẩn hóa tên phường
      const normalizedWard = this.normalizeWardName(wardName);

      // Tìm phí ship trong bảng giá
      const shippingFee =
        this.shippingRates[normalizedWard] || this.DEFAULT_SHIPPING_FEE;

      return {
        success: true,
        ward: wardName,
        normalizedWard,
        shippingFee,
        isDefaultFee: !this.shippingRates[normalizedWard],
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả các phường và giá ship
   */
  static getAllShippingRates() {
    return {
      success: true,
      rates: this.shippingRates,
      defaultFee: this.DEFAULT_SHIPPING_FEE,
    };
  }

  /**
   * Kiểm tra xem phường có trong danh sách không
   */
  static isValidWard(wardName) {
    const normalizedWard = this.normalizeWardName(wardName);
    return this.shippingRates.hasOwnProperty(normalizedWard);
  }
}

module.exports = ShippingService;
