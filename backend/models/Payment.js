const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    feeRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer'],
      required: true,
    },
    transactionRef: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
