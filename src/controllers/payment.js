const PayOSService = require("../services/payos");
const CartService = require("../services/cart"); // ✅ Import CartService
const { db, transaction } = require("../config/database");
const { Op } = require("sequelize");

class PaymentController {
  /**
   * POST /api/payment/create
   * Tạo link thanh toán PayOS từ giỏ hàng
   */
  static async createPayment(req, res) {
    try {
      const { userId, amount, items, shippingAddress, shippingFee } = req.body;

      // Validate
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId là bắt buộc",
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Giỏ hàng trống",
        });
      }

      // ✅ DÙNG amount TỪ CLIENT (đã bao gồm phí ship)
      let totalAmount = amount;

      // Nếu client không truyền amount, tính lại
      if (!totalAmount) {
        const itemsTotal = items.reduce((total, item) => {
          return (
            total +
            parseFloat(item.price_at_add || item.price) *
              parseInt(item.quantity)
          );
        }, 0);

        const shippingCost = parseFloat(shippingFee || 0);
        totalAmount = itemsTotal + shippingCost;
      }

      if (totalAmount < 1000) {
        return res.status(400).json({
          success: false,
          message: "Số tiền tối thiểu là 1,000 VNĐ",
        });
      }

      console.log("💰 Payment amount breakdown:", {
        itemsTotal: items.reduce(
          (t, i) =>
            t + parseFloat(i.price_at_add || i.price) * parseInt(i.quantity),
          0
        ),
        shippingFee: shippingFee || 0,
        totalAmount: totalAmount,
      });

      // Generate order code
      const orderCode = PayOSService.generateOrderCode();

      // Tạo đơn hàng trong database trước
      let order = null;
      if (db.Order) {
        try {
          order = await db.Order.create({
            order_code: orderCode.toString(),
            user_id: userId,
            amount: totalAmount,
            description: `Đơn hàng #${orderCode}`,
            items: items,
            payment_status: "PENDING",
            payment_method: "PAYOS",
            shipping_address: shippingAddress || null,
            shipping_fee: shippingFee || 0,
          });
          console.log("✅ Order created:", orderCode, "Amount:", totalAmount);
        } catch (dbError) {
          console.error("⚠️ Failed to create order:", dbError.message);
        }
      }

      // Format items cho PayOS
      const payosItems = items.map((item) => ({
        name: item.food?.name || item.name || "Sản phẩm",
        quantity: parseInt(item.quantity),
        price: parseInt(item.price_at_add || item.price),
      }));

      // Thêm phí ship vào items nếu có
      if (shippingFee && parseFloat(shippingFee) > 0) {
        payosItems.push({
          name: "Phí vận chuyển",
          quantity: 1,
          price: parseInt(shippingFee),
        });
      }

      // Tạo payment link với PayOS
      const paymentResult = await PayOSService.createPaymentLink({
        orderCode,
        amount: parseInt(totalAmount),
        description: `DH #${orderCode}`,
        items: payosItems,
        returnUrl: `${
          process.env.FRONTEND_URL || "https://food-web-2k52.vercel.app"
        }`,
        cancelUrl: `${
          process.env.FRONTEND_URL || "https://food-web-2k52.vercel.app"
        }`,
      });

      console.log("✅ Payment link created:", paymentResult.paymentUrl);

      res.status(200).json({
        success: true,
        message: "Tạo link thanh toán thành công",
        data: {
          paymentUrl: paymentResult.paymentUrl,
          orderCode: paymentResult.orderCode,
          qrCode: paymentResult.qrCode,
          amount: totalAmount,
        },
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({
        success: false,
        message: "Không thể tạo link thanh toán",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/payment/webhook
   * Nhận webhook từ PayOS
   */
  static async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      const signature = req.headers["x-payos-signature"];

      console.log("📨 Webhook received:", {
        code: webhookData.code,
        success: webhookData.success,
        orderCode: webhookData.data?.orderCode,
      });

      // Xác minh chữ ký
      const isValid = PayOSService.verifyWebhookSignature(
        webhookData,
        signature
      );

      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return res.status(401).json({
          success: false,
          message: "Chữ ký không hợp lệ",
        });
      }

      const { code, success, data } = webhookData;

      if (!data || !data.orderCode) {
        console.error("❌ Invalid webhook data");
        return res.status(400).json({
          success: false,
          message: "Dữ liệu webhook không hợp lệ",
        });
      }

      const { orderCode, amount, status, transactionDateTime } = data;

      // Cập nhật trạng thái đơn hàng
      if (db.Order) {
        const order = await db.Order.findOne({
          where: { order_code: orderCode.toString() },
        });

        if (order) {
          await order.update({
            payment_status:
              status === "PAID"
                ? "PAID"
                : status === "CANCELLED"
                ? "CANCELLED"
                : "FAILED",
            paid: status === "PAID",
            paid_at:
              status === "PAID" && transactionDateTime
                ? new Date(transactionDateTime)
                : null,
            transaction_data: webhookData,
          });

          console.log(`✅ Order ${orderCode} updated: ${status}`);

          // ✅ CHỈ XÓA CART KHI THANH TOÁN THÀNH CÔNG
          if (status === "PAID") {
            try {
              console.log(
                `🗑️ Calling CartService.clearCart for user: ${order.user_id}`
              );

              const result = await CartService.clearCart(order.user_id);

              console.log(`✅ CartService.clearCart result:`, result);
              console.log(`✅ Deleted ${result.deletedCount} items from cart`);

              // ✅ Verify: Kiểm tra lại cart đã trống chưa
              if (db.Cart) {
                const remainingItems = await db.Cart.count({
                  where: { user_id: order.user_id },
                });

                if (remainingItems > 0) {
                  console.error(
                    `⚠️ WARNING: Cart still has ${remainingItems} items after clearCart!`
                  );
                } else {
                  console.log(
                    `✅ VERIFIED: Cart is completely empty for user ${order.user_id}`
                  );
                }
              }
            } catch (clearError) {
              console.error(
                "❌ CartService.clearCart failed:",
                clearError.message
              );
              console.error("Error stack:", clearError.stack);
            }
          }
        } else {
          console.warn(`⚠️ Order ${orderCode} not found in database`);
        }
      }

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi xử lý webhook",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/payment/status/:orderCode
   * Kiểm tra trạng thái thanh toán
   */
  static async getPaymentStatus(req, res) {
    try {
      const { orderCode } = req.params;

      if (!orderCode) {
        return res.status(400).json({
          success: false,
          message: "orderCode là bắt buộc",
        });
      }

      // Lấy từ database trước
      if (db.Order) {
        const order = await db.Order.findOne({
          where: { order_code: orderCode.toString() },
        });

        if (order) {
          return res.status(200).json({
            success: true,
            data: {
              orderCode: order.order_code,
              status: order.payment_status,
              amount: parseFloat(order.amount),
              paid: order.paid,
              paidAt: order.paid_at,
              items: order.items,
              userId: order.user_id,
            },
          });
        }
      }

      // Nếu không có trong DB, kiểm tra với PayOS
      const paymentStatus = await PayOSService.getPaymentStatus(orderCode);

      res.status(200).json({
        success: true,
        data: paymentStatus,
      });
    } catch (error) {
      console.error("Get payment status error:", error);
      res.status(500).json({
        success: false,
        message: "Không thể lấy trạng thái thanh toán",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/payment/cancel/:orderCode
   * Hủy thanh toán
   */
  static async cancelPayment(req, res) {
    try {
      const { orderCode } = req.params;
      const { reason } = req.body;

      if (!orderCode) {
        return res.status(400).json({
          success: false,
          message: "orderCode là bắt buộc",
        });
      }

      const result = await PayOSService.cancelPayment(orderCode, reason);

      // Cập nhật database
      if (db.Order) {
        await db.Order.update(
          { payment_status: "CANCELLED" },
          { where: { order_code: orderCode.toString() } }
        );
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Cancel payment error:", error);
      res.status(500).json({
        success: false,
        message: "Không thể hủy thanh toán",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/payment/orders/:userId
   * Lấy danh sách đơn hàng của user
   */
  static async getUserOrders(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId là bắt buộc",
        });
      }

      if (!db.Order) {
        return res.status(503).json({
          success: false,
          message: "Order service not available",
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows: orders } = await db.Order.findAndCountAll({
        where: { user_id: userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      res.status(200).json({
        success: true,
        data: orders.map((order) => order.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách đơn hàng",
        error: error.message,
      });
    }
  }

  /**
   * ✅ NEW API
   * GET /api/payment/orders/paid/all
   * Lấy toàn bộ đơn hàng đã thanh toán thành công
   */
  static async getAllPaidOrders(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      if (!db.Order) {
        return res.status(503).json({
          success: false,
          message: "Order service not available",
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows: orders } = await db.Order.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]], // Hoặc dùng "paid_at" nếu muốn
      });

      res.status(200).json({
        success: true,
        data: orders.map((order) => order.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get all paid orders error:", error);
      res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách đơn hàng đã thanh toán",
        error: error.message,
      });
    }
  }
}

module.exports = PaymentController;
