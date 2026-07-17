const mongoose = require('mongoose');

// Tracks a student's allocation lifecycle: request -> allocated / waitlisted -> vacated
// Also doubles as the record for room-swap requests between two students.
const allocationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', default: null },
    preferredRoomType: {
      type: String,
      enum: ['single', 'double', 'triple', 'dormitory'],
    },
    preferredFloor: { type: Number, default: null },
    status: {
      type: String,
      enum: ['pending', 'waitlisted', 'allocated', 'swap_requested', 'vacated', 'rejected'],
      default: 'pending',
    },
    waitlistPosition: { type: Number, default: null },
    // Populated only for swap requests
    swapWithStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    swapWithRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    allocatedAt: { type: Date, default: null },
    vacatedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Allocation', allocationSchema);