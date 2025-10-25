const express = require("express");
const router = express.Router();

const usersRoute = require("./users.route");
const foodsRoute = require("./foods.route");
const cartsRoute = require("./carts.route");
const shippingRoute = require("./shipping.route");
const paymentRoute = require("./payment.route");

router.use("/users", usersRoute);
router.use("/foods", foodsRoute);
router.use("/carts", cartsRoute);
router.use("/shipping", shippingRoute);
router.use("/payment", paymentRoute);
module.exports = router;
