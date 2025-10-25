const express = require("express");
const PaymentController = require("../controllers/payment");
const router = express.Router();

// Tạo link thanh toán từ giỏ hàng
router.post("/create", PaymentController.createPayment);

// Webhook từ PayOS (không cần authentication)
router.post("/webhook", PaymentController.handleWebhook);

// Kiểm tra trạng thái thanh toán
router.get("/status/:orderCode", PaymentController.getPaymentStatus);

// Hủy thanh toán
router.post("/cancel/:orderCode", PaymentController.cancelPayment);

// Lấy danh sách đơn hàng của user
router.get("/orders/:userId", PaymentController.getUserOrders);

router.get("/orders/paid/all", PaymentController.getAllPaidOrders);

module.exports = router;
