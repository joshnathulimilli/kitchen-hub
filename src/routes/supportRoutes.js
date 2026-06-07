const express = require('express');
const { createSupportTicket, getMySupportTickets, getSupportTickets, updateSupportTicketStatus } = require('../controllers/supportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('admin', 'vendor', 'customer', 'Support access is limited to customers, vendors, and admins.'),
  createSupportTicket
);
router.get(
  '/my',
  protect,
  authorize('admin', 'vendor', 'customer', 'Support access is limited to customers, vendors, and admins.'),
  getMySupportTickets
);
router.get('/manage', protect, authorize('admin'), getSupportTickets);
router.put('/:id/status', protect, authorize('admin'), updateSupportTicketStatus);

module.exports = router;
