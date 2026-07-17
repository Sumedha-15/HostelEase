const mongoose = require('mongoose');

// One FeeRecord per student per billing cycle (e.g. "2026-Odd-Sem").
// amountPaid is a derived cache updated whenever a Payment is recorded against it.
const feeRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    billingCycle: { type: String, required: true, trim: true }, // e.g. "2026-Odd-Sem"
    roomRent: { type: Number, required: true, min: 0 },
    messCharges: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    lateFine: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue'],
      default: 'unpaid',
    },
  },
  { timestamps: true }
);

feeRecordSchema.index({ student: 1, billingCycle: 1 }, { unique: true });

feeRecordSchema.virtual('balance').get(function balance() {
  return Math.max(this.totalAmount - this.amountPaid, 0);
});

feeRecordSchema.set('toJSON', { virtuals: true });
feeRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
