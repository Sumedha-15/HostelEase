const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    genderCategory: { type: String, enum: ['male', 'female', 'co-ed'], required: true },
    totalFloors: { type: Number, required: true, min: 1 },
    warden: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    address: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hostel', hostelSchema);
