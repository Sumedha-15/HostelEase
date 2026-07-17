const Visitor = require('../models/Visitor');
const FeeRecord = require('../models/FeeRecord');
const { isDefaulter } = require('../utils/feeCalculator');

// @route POST /api/visitors/checkin  (admin/warden at the gate)
// Blocks check-in if the host student is a fee defaulter beyond the grace period -
// this is the cross-module rule linking the fee system to the visitor system.
const checkInVisitor = async (req, res, next) => {
  try {
    const { hostStudentId, room, visitorName, idProofType, idProofNumber, purpose, phone } = req.body;

    const feeRecords = await FeeRecord.find({ student: hostStudentId });
    if (isDefaulter(feeRecords, 14)) {
      return res.status(403).json({
        message: 'Visitor check-in blocked: host student has overdue fees beyond the grace period. Clear dues first.',
      });
    }

    const visitor = await Visitor.create({
      hostStudent: hostStudentId,
      room,
      visitorName,
      idProofType,
      idProofNumber,
      purpose,
      phone,
      approvedBy: req.user._id,
    });

    res.status(201).json(visitor);
  } catch (err) {
    next(err);
  }
};

// @route POST /api/visitors/:id/checkout  (admin/warden)
const checkOutVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor record not found' });
    if (visitor.checkOutTime) return res.status(400).json({ message: 'Visitor already checked out' });

    visitor.checkOutTime = new Date();
    visitor.status = 'checked_out';
    await visitor.save();
    res.json(visitor);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/visitors?status=&hostStudent=  (admin/warden)
// Refreshes the 'overstaying' flag for any visitor still checked in past the
// configured threshold before returning the list.
const listVisitors = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.hostStudent) filter.hostStudent = req.query.hostStudent;

    const visitors = await Visitor.find(filter)
      .populate('hostStudent', 'name studentId')
      .populate('room', 'roomNumber')
      .sort({ checkInTime: -1 });

    const overstayHours = Number(process.env.VISITOR_OVERSTAY_HOURS) || 12;
    const refreshed = await Promise.all(
      visitors.map(async (v) => {
        if (v.status === 'checked_in') {
          const hoursIn = (Date.now() - new Date(v.checkInTime).getTime()) / (1000 * 60 * 60);
          if (hoursIn >= overstayHours) {
            v.status = 'overstaying';
            await v.save();
          }
        }
        return v;
      })
    );

    res.json(refreshed);
  } catch (err) {
    next(err);
  }
};
const myVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find({
      hostStudent: req.user._id,
    })
      .populate("room", "roomNumber")
      .sort({ checkInTime: -1 });

    res.json(visitors);
  } catch (err) {
    next(err);
  }
};
module.exports = {
  checkInVisitor,
  checkOutVisitor,
  listVisitors,
  myVisitors,
};