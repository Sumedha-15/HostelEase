const FeeRecord = require('../models/FeeRecord');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const {
  computeTotal,
  calculateLateFine,
  deriveStatus,
  isDefaulter,
} = require('../utils/feeCalculator');

// @route POST /api/fees/generate (admin/warden)
const generateFeeRecord = async (req, res, next) => {
  try {
    const {
      studentId,
      roomId,
      billingCycle,
      messCharges,
      otherCharges,
      dueDate,
    } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const roomRent = room.monthlyRent;
    const totalAmount = computeTotal({
      roomRent,
      messCharges,
      otherCharges,
      lateFine: 0,
    });

    const record = await FeeRecord.create({
      student: studentId,
      room: roomId,
      billingCycle,
      roomRent,
      messCharges: messCharges || 0,
      otherCharges: otherCharges || 0,
      lateFine: 0,
      totalAmount,
      dueDate,
      status: 'unpaid',
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/fees/me (student)
const myFeeRecords = async (req, res, next) => {
  try {
    const records = await FeeRecord.find({
      student: req.user._id,
    }).sort({ createdAt: -1 });

    const refreshed = await Promise.all(
      records.map(refreshRecordDerivedFields)
    );

    res.json(refreshed);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/fees (admin/warden)
const listFeeRecords = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.billingCycle) filter.billingCycle = req.query.billingCycle;

    const records = await FeeRecord.find(filter)
      .populate('student', 'name studentId email')
      .populate('room', 'roomNumber');

    const refreshed = await Promise.all(
      records.map(refreshRecordDerivedFields)
    );

    res.json(refreshed);
  } catch (err) {
    next(err);
  }
};

// Recalculate late fine and status
async function refreshRecordDerivedFields(record) {
  const lateFine = calculateLateFine(record.dueDate);

  const totalAmount = computeTotal({
    roomRent: record.roomRent,
    messCharges: record.messCharges,
    otherCharges: record.otherCharges,
    lateFine,
  });

  const status = deriveStatus({
    totalAmount,
    amountPaid: record.amountPaid,
    dueDate: record.dueDate,
  });

  if (
    record.lateFine !== lateFine ||
    record.totalAmount !== totalAmount ||
    record.status !== status
  ) {
    record.lateFine = lateFine;
    record.totalAmount = totalAmount;
    record.status = status;
    await record.save();
  }

  return record;
}

// @route POST /api/fees/:id/pay (admin/warden)
const recordPayment = async (req, res, next) => {
  try {
    const { amount, method, transactionRef } = req.body;

    const record = await FeeRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: 'Fee record not found',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: 'Payment amount must be positive',
      });
    }

    const payment = await Payment.create({
      feeRecord: record._id,
      student: record.student,
      amount,
      method,
      transactionRef,
      recordedBy: req.user._id,
    });

    record.amountPaid += amount;

    await refreshRecordDerivedFields(record);

    res.status(201).json({
      message: 'Payment recorded',
      payment,
      feeRecord: record,
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/fees/defaulters (admin/warden)
const listDefaulters = async (req, res, next) => {
  try {
    const gracePeriodDays =
      Number(req.query.gracePeriodDays) || 14;

    const records = await FeeRecord.find().populate(
      'student',
      'name studentId email'
    );

    const byStudent = {};

    records.forEach((record) => {
      const key = String(record.student._id);

      if (!byStudent[key]) {
        byStudent[key] = {
          student: record.student,
          records: [],
        };
      }

      byStudent[key].records.push(record);
    });

    const defaulters = Object.values(byStudent)
      .filter((entry) =>
        isDefaulter(entry.records, gracePeriodDays)
      )
      .map((entry) => ({
        student: entry.student,
        outstandingBalance: entry.records.reduce(
          (sum, record) =>
            sum +
            Math.max(
              record.totalAmount - record.amountPaid,
              0
            ),
          0
        ),
      }));

    res.json(defaulters);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateFeeRecord,
  myFeeRecords,
  listFeeRecords,
  recordPayment,
  listDefaulters,
};