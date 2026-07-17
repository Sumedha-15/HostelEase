const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    hostStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    visitorName: { type: String, required: true, trim: true },
    idProofType: { type: String, enum: ['aadhaar', 'passport', 'driving_license', 'voter_id', 'other'], required: true },
    idProofNumber: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out', 'overstaying'],
      default: 'checked_in',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visitor', visitorSchema);
