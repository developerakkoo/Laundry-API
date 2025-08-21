const { Schema, model } = require('mongoose');

const DeliveryAgentPayoutSchema = new Schema(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'deliveryAgent', required: true },

    // Billing window (inclusive start, exclusive end)
    periodStart: { type: Date, required: true },
    periodEnd:   { type: Date, required: true },

    // Orders included in this payout
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order', required: true }],
    orderCount: { type: Number, default: 0 },
    totalCompensation: { type: Number, default: 0 }, // sum of priceDetails.deliveryBoyCompensation

    // Bill meta
    billNo: { type: String, unique: true, sparse: true }, // e.g. "MCT-2025-08-AGT123"
    notes: { type: String },

    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'CANCELLED'],
      default: 'PENDING',
    },

    // Payment info (when marked paid)
    payment: {
      mode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'OTHER'], default: 'OTHER' },
      txRef: { type: String },
      paidAt: { type: Date },
      paidBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    },
  },
  { timestamps: true }
);

// Prevent duplicate payouts per agent & period window
DeliveryAgentPayoutSchema.index(
  { agent: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

module.exports = model('DeliveryAgentPayout', DeliveryAgentPayoutSchema);
