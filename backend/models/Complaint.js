const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    category: {
      type: String,
      enum: ['electrical', 'plumbing', 'wifi', 'cleanliness', 'furniture', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Used to auto-escalate priority if left unresolved past the configured window
    lastEscalatedAt: { type: Date, default: Date.now },
    resolutionNotes: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    // 1-5 rating the student gives after resolution
    studentRating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
