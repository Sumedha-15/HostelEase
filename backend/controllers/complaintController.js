const Complaint = require('../models/Complaint');

const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'];

// @route POST /api/complaints  (student)
const createComplaint = async (req, res, next) => {
  try {
    const { category, description, priority } = req.body;
    const room = req.user.currentRoom;
    if (!room) {
      return res.status(400).json({ message: 'You must be allocated a room before filing a complaint' });
    }

    const complaint = await Complaint.create({
      student: req.user._id,
      room,
      category,
      description,
      priority: priority || 'medium',
    });
    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/complaints/me  (student)
const myComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ student: req.user._id }).sort({ createdAt: -1 });
    const escalated = await Promise.all(complaints.map(applyEscalationIfDue));
    res.json(escalated);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/complaints  (admin/warden) filter by status/category/priority
const listComplaints = async (req, res, next) => {
  try {
    const filter = {};
    ['status', 'category', 'priority'].forEach((key) => {
      if (req.query[key]) filter[key] = req.query[key];
    });
    const complaints = await Complaint.find(filter)
      .populate('student', 'name studentId')
      .populate('room', 'roomNumber')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });
    const escalated = await Promise.all(complaints.map(applyEscalationIfDue));
    res.json(escalated);
  } catch (err) {
    next(err);
  }
};

// If a complaint has sat 'open' longer than COMPLAINT_ESCALATION_HOURS since
// it was last escalated, bump its priority one level (capped at 'critical').
async function applyEscalationIfDue(complaint) {
  if (['resolved', 'closed'].includes(complaint.status)) return complaint;

  const escalationHours = Number(process.env.COMPLAINT_ESCALATION_HOURS) || 48;
  const hoursSinceEscalation = (Date.now() - new Date(complaint.lastEscalatedAt).getTime()) / (1000 * 60 * 60);

  if (hoursSinceEscalation >= escalationHours) {
    const currentIndex = PRIORITY_ORDER.indexOf(complaint.priority);
    const nextIndex = Math.min(currentIndex + 1, PRIORITY_ORDER.length - 1);
    if (nextIndex !== currentIndex) {
      complaint.priority = PRIORITY_ORDER[nextIndex];
      complaint.lastEscalatedAt = new Date();
      await complaint.save();
    }
  }
  return complaint;
}

// @route PATCH /api/complaints/:id  (admin/warden) - assign, change status/notes
const updateComplaint = async (req, res, next) => {
  try {
    const { status, assignedTo, resolutionNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (status === 'resolved') complaint.resolvedAt = new Date();

    await complaint.save();
    res.json(complaint);
  } catch (err) {
    next(err);
  }
};

// @route POST /api/complaints/:id/rate  (student) - rate after resolution
const rateComplaint = async (req, res, next) => {
  try {
    const { rating } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, student: req.user._id });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'You can only rate a resolved complaint' });
    }
    complaint.studentRating = rating;
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, myComplaints, listComplaints, updateComplaint, rateComplaint };
