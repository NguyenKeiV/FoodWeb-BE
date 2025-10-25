const crypto = require("crypto");
const { env } = require("../config/env");

class PayOSService {
  static PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

  static get config() {
    return {
      clientId: env.PAYOS.CLIENT_ID,
      apiKey: env.PAYOS.API_KEY,
      checksumKey: env.PAYOS.CHECKSUM_KEY,
    };
  }

  /**
   * Tạo chữ ký cho PayOS
   * Format: amount=xxx&cancelUrl=xxx&description=xxx&orderCode=xxx&returnUrl=xxx
   */
  static createSignature(data) {
    const { amount, cancelUrl, description, orderCode, returnUrl } = data;

    // Sắp xếp theo alphabet
    const sortedData = {
      amount,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    };

    const signatureString = Object.keys(sortedData)
      .sort()
      .map((key) => `${key}=${sortedData[key]}`)
      .join("&");

    const signature = crypto
      .createHmac("sha256", this.config.checksumKey)
      .update(signatureString)
      .digest("hex");

    console.log("🔐 Signature String:", signatureString);
    console.log("🔐 Signature:", signature);

    return signature;
  }

  /**
   * Tạo payment request với PayOS
   */
  static async createPaymentLink(orderData) {
    try {
      const { orderCode, amount, description, returnUrl, cancelUrl, items } =
        orderData;

      // Validate credentials
      if (
        !this.config.clientId ||
        !this.config.apiKey ||
        !this.config.checksumKey
      ) {
        throw new Error(
          "PayOS credentials chưa được cấu hình. Kiểm tra file .env"
        );
      }

      // Validate required fields
      if (!orderCode || !amount) {
        throw new Error("orderCode và amount là bắt buộc");
      }

      if (amount < 1000) {
        throw new Error("Số tiền tối thiểu là 1,000 VNĐ");
      }

      // Chuẩn bị data
      const paymentData = {
        orderCode: parseInt(orderCode),
        amount: parseInt(amount),
        description: description
          ? description.substring(0, 25)
          : `DH ${orderCode}`, // Max 25 ký tự
        returnUrl:
          returnUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}`,
        cancelUrl:
          cancelUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}`,
      };

      // Thêm items nếu có
      if (items && Array.isArray(items)) {
        paymentData.items = items;
      }

      // Tạo signature
      const signature = this.createSignature(paymentData);

      const requestBody = {
        ...paymentData,
        signature,
      };

      console.log("🚀 PayOS Request:", {
        url: this.PAYOS_API_URL,
        body: { ...requestBody, signature: signature.substring(0, 20) + "..." },
      });

      // Gọi API PayOS
      const response = await fetch(this.PAYOS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.config.clientId,
          "x-api-key": this.config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      console.log("📥 PayOS Response:", {
        status: response.status,
        code: result.code,
        success: result.success,
      });

      // Xử lý lỗi
      if (!response.ok || result.code !== "00") {
        const errorMessage = result.desc || result.message || "PayOS API Error";
        console.error("❌ PayOS Error:", {
          status: response.status,
          code: result.code,
          message: errorMessage,
        });
        throw new Error(errorMessage);
      }

      // Kiểm tra response structure
      if (!result.data) {
        throw new Error("PayOS trả về dữ liệu không hợp lệ");
      }

      const paymentUrl = result.data.checkoutUrl || result.data.paymentLinkUrl;

      if (!paymentUrl) {
        throw new Error("Không tìm thấy URL thanh toán");
      }

      console.log("✅ Payment link created:", paymentUrl);

      return {
        success: true,
        paymentUrl: paymentUrl,
        orderCode: result.data.orderCode || orderCode,
        qrCode: result.data.qrCode || null,
      };
    } catch (error) {
      console.error("💥 PayOS createPaymentLink error:", error);
      throw error;
    }
  }

  /**
   * Xác minh webhook signature từ PayOS
   */
  static verifyWebhookSignature(webhookData, receivedSignature) {
    try {
      // PayOS webhook data format
      const { code, desc, data, success } = webhookData;

      if (!data) {
        console.error("❌ Webhook missing data field");
        return false;
      }

      // Tạo signature string theo format của PayOS
      const signaturePayload = {
        code,
        desc,
        success,
        data: JSON.stringify(data),
      };

      const signatureString = Object.keys(signaturePayload)
        .sort()
        .map((key) => `${key}=${signaturePayload[key]}`)
        .join("&");

      const calculatedSignature = crypto
        .createHmac("sha256", this.config.checksumKey)
        .update(signatureString)
        .digest("hex");

      const isValid = calculatedSignature === receivedSignature;

      console.log("🔍 Verify webhook:", {
        received: receivedSignature?.substring(0, 20) + "...",
        calculated: calculatedSignature?.substring(0, 20) + "...",
        match: isValid,
      });

      return isValid;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false;
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  static async getPaymentStatus(orderCode) {
    try {
      const url = `${this.PAYOS_API_URL}/${orderCode}`;

      console.log("🔍 Getting payment status for:", orderCode);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-client-id": this.config.clientId,
          "x-api-key": this.config.apiKey,
        },
      });

      const result = await response.json();

      if (!response.ok || result.code !== "00") {
        throw new Error(result.desc || "Không thể lấy trạng thái thanh toán");
      }

      return {
        success: true,
        status: result.data.status,
        amount: result.data.amount,
        orderCode: result.data.orderCode,
        transactionDateTime: result.data.transactionDateTime,
      };
    } catch (error) {
      console.error("PayOS getPaymentStatus error:", error);
      throw error;
    }
  }

  /**
   * Hủy thanh toán
   */
  static async cancelPayment(orderCode, cancellationReason) {
    try {
      const url = `${this.PAYOS_API_URL}/${orderCode}/cancel`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.config.clientId,
          "x-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          cancellationReason: cancellationReason || "Hủy thanh toán",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.code !== "00") {
        throw new Error(result.desc || "Không thể hủy thanh toán");
      }

      return {
        success: true,
        message: "Hủy thanh toán thành công",
      };
    } catch (error) {
      console.error("PayOS cancelPayment error:", error);
      throw error;
    }
  }

  /**
   * Generate unique order code
   */
  static generateOrderCode() {
    return Date.now(); // Unix timestamp
  }
}

module.exports = PayOSService;
