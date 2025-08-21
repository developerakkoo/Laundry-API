const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getRevenueAnalytics
} = require("../controllers/dashboard.controller");

// Dashboard statistics
router.get("/dashboard-stats", getDashboardStats);

// Get all orders with filters
router.get("/", getOrders);

// Get order by ID
router.get("/:orderId", getOrderById);

// Update order status
router.patch("/:orderId/status", updateOrderStatus);

// Revenue analytics
router.get("/analytics/revenue", getRevenueAnalytics);

module.exports = {dashRoute: router};