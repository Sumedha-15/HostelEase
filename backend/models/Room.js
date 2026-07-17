const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true, min: 0 },
    roomType: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory'],
      required: true,
    },
    capacity: { type: Number, required: true, min: 1 },
    occupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Base monthly fee for this room type; used by the fee engine
    monthlyRent: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['active', 'under_maintenance', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

roomSchema.virtual('vacantSeats').get(function vacantSeats() {
  const occupants = this.occupants || [];
  return this.capacity - occupants.length;
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
