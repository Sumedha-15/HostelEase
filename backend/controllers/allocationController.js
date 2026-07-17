const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const User = require('../models/User');
const { canSwap } = require('../utils/allocationEngine');

// @route POST /api/allocations/request  (student)
// Student submits a room request with optional preferences. This NO LONGER
// auto-allocates a room — it just creates a 'pending' request that an
// admin/warden must review and manually allocate a specific (available) room to.
const requestAllocation = async (req, res, next) => {
  try {
    const { preferredRoomType, preferredFloor, hostelId } = req.body;
    const student = req.user;

    const existingActive = await Allocation.findOne({
      student: student._id,
      status: { $in: ['pending', 'waitlisted', 'allocated'] },
    });
    if (existingActive) {
      return res.status(409).json({ message: `You already have an allocation in status '${existingActive.status}'` });
    }

    const allocation = await Allocation.create({
      student: student._id,
      preferredRoomType,
      preferredFloor,
      hostel: hostelId || null,
      status: 'pending',
    });

    res.status(201).json({ message: 'Room request submitted. Waiting for admin approval.', allocation });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/:id/allocate  (admin/warden)
// Admin picks a specific room for a pending/waitlisted request. Only allowed
// if that room actually has a free seat.
const allocateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.body;
    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: 'Request not found' });
    if (!['pending', 'waitlisted'].includes(allocation.status)) {
      return res.status(400).json({ message: `This request is already '${allocation.status}'` });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.status !== 'active') {
      return res.status(400).json({ message: 'Room is not active' });
    }
    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: 'Room is already full' });
    }

    room.occupants.push(allocation.student);
    await room.save();

    allocation.room = room._id;
    allocation.status = 'allocated';
    allocation.allocatedAt = new Date();
    allocation.waitlistPosition = null;
    await allocation.save();

    await User.findByIdAndUpdate(allocation.student, { currentRoom: room._id });

    res.json({ message: 'Room allocated successfully', allocation });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/:id/reject  (admin/warden)
const rejectAllocation = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: 'Request not found' });
    if (!['pending', 'waitlisted'].includes(allocation.status)) {
      return res.status(400).json({ message: `This request is already '${allocation.status}'` });
    }
    allocation.status = 'rejected';
    await allocation.save();
    res.json({ message: 'Request rejected', allocation });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/allocations  (admin/warden) filter by status
const listAllocations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const allocations = await Allocation.find(filter)
      .populate('student', 'name studentId email gender')
      .populate('room', 'roomNumber floor roomType')
      .sort({ waitlistPosition: 1, createdAt: 1 });
    res.json(allocations);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/allocations/me  (student)
const myAllocation = async (req, res, next) => {
  try {
    const allocation = await Allocation.findOne({
      student: req.user._id,
      status: { $in: ['pending', 'waitlisted', 'allocated', 'swap_requested'] },
    })
      .populate('room', 'roomNumber floor roomType monthlyRent')
      .sort({ createdAt: -1 });
    res.json(allocation || { message: 'No active allocation found' });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/:id/vacate  (admin/warden)
const vacateAllocation = async (req, res, next) => {
  try {
    const allocation = await Allocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });
    if (allocation.status !== 'allocated') {
      return res.status(400).json({ message: 'Only an allocated record can be vacated' });
    }

    await Room.findByIdAndUpdate(allocation.room, { $pull: { occupants: allocation.student } });
    await User.findByIdAndUpdate(allocation.student, { currentRoom: null });

    allocation.status = 'vacated';
    allocation.vacatedAt = new Date();
    await allocation.save();

    res.json({ message: 'Room vacated', allocation });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/swap  (student) body: { targetStudentId }
// Initiates a swap request between the requester and another allocated student.
const requestSwap = async (req, res, next) => {
  try {
    const { targetStudentId } = req.body;
    const myAlloc = await Allocation.findOne({ student: req.user._id, status: 'allocated' });
    const theirAlloc = await Allocation.findOne({ student: targetStudentId, status: 'allocated' });

    const check = canSwap(myAlloc, theirAlloc);
    if (!check.ok) return res.status(400).json({ message: check.reason });

    myAlloc.status = 'swap_requested';
    myAlloc.swapWithStudent = targetStudentId;
    myAlloc.swapWithRoom = theirAlloc.room;
    await myAlloc.save();

    res.status(201).json({ message: 'Swap request created, awaiting warden approval', allocation: myAlloc });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/:id/approve-swap  (admin/warden)
const approveSwap = async (req, res, next) => {
  try {
    const requesterAlloc = await Allocation.findById(req.params.id);
    if (!requesterAlloc || requesterAlloc.status !== 'swap_requested') {
      return res.status(400).json({ message: 'No pending swap request found for this allocation' });
    }
    const targetAlloc = await Allocation.findOne({ student: requesterAlloc.swapWithStudent, status: 'allocated' });
    if (!targetAlloc) {
      return res.status(400).json({ message: 'Target allocation is no longer valid' });
    }

    const requesterOldRoom = requesterAlloc.room;
    const targetOldRoom = targetAlloc.room;

    // Swap room references
    requesterAlloc.room = targetOldRoom;
    targetAlloc.room = requesterOldRoom;
    requesterAlloc.status = 'allocated';
    requesterAlloc.swapWithStudent = null;
    requesterAlloc.swapWithRoom = null;
    await requesterAlloc.save();
    await targetAlloc.save();

    // Update room occupant lists
    await Room.findByIdAndUpdate(requesterOldRoom, { $pull: { occupants: requesterAlloc.student } });
    await Room.findByIdAndUpdate(targetOldRoom, { $pull: { occupants: targetAlloc.student } });
    await Room.findByIdAndUpdate(requesterOldRoom, { $push: { occupants: targetAlloc.student } });
    await Room.findByIdAndUpdate(targetOldRoom, { $push: { occupants: requesterAlloc.student } });

    // Update users' currentRoom
    await User.findByIdAndUpdate(requesterAlloc.student, { currentRoom: targetOldRoom });
    await User.findByIdAndUpdate(targetAlloc.student, { currentRoom: requesterOldRoom });

    res.json({ message: 'Room swap approved and completed', requesterAlloc, targetAlloc });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestAllocation,
  allocateRoom,
  rejectAllocation,
  listAllocations,
  myAllocation,
  vacateAllocation,
  requestSwap,
  approveSwap,
};
   await Room.findByIdAndUpdate(allocation.room, { $pull: { occupants: allocation.student } });
    await User.findByIdAndUpdate(allocation.student, { currentRoom: null });

    allocation.status = 'vacated';
    allocation.vacatedAt = new Date();
    await allocation.save();

    res.json({ message: 'Room vacated', allocation });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/swap  (student) body: { targetStudentId }
// Initiates a swap request between the requester and another allocated student.
const requestSwap = async (req, res, next) => {
  try {
    const { targetStudentId } = req.body;
    const myAlloc = await Allocation.findOne({ student: req.user._id, status: 'allocated' });
    const theirAlloc = await Allocation.findOne({ student: targetStudentId, status: 'allocated' });

    const check = canSwap(myAlloc, theirAlloc);
    if (!check.ok) return res.status(400).json({ message: check.reason });

    myAlloc.status = 'swap_requested';
    myAlloc.swapWithStudent = targetStudentId;
    myAlloc.swapWithRoom = theirAlloc.room;
    await myAlloc.save();

    res.status(201).json({ message: 'Swap request created, awaiting warden approval', allocation: myAlloc });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/allocations/:id/approve-swap  (admin/warden)
const approveSwap = async (req, res, next) => {
  try {
    const requesterAlloc = await Allocation.findById(req.params.id);
    if (!requesterAlloc || requesterAlloc.status !== 'swap_requested') {
      return res.status(400).json({ message: 'No pending swap request found for this allocation' });
    }
    const targetAlloc = await Allocation.findOne({ student: requesterAlloc.swapWithStudent, status: 'allocated' });
    if (!targetAlloc) {
      return res.status(400).json({ message: 'Target allocation is no longer valid' });
    }

    const requesterOldRoom = requesterAlloc.room;
    const targetOldRoom = targetAlloc.room;

    // Swap room references
    requesterAlloc.room = targetOldRoom;
    targetAlloc.room = requesterOldRoom;
    requesterAlloc.status = 'allocated';
    requesterAlloc.swapWithStudent = null;
    requesterAlloc.swapWithRoom = null;
    await requesterAlloc.save();
    await targetAlloc.save();

    // Update room occupant lists
    await Room.findByIdAndUpdate(requesterOldRoom, { $pull: { occupants: requesterAlloc.student } });
    await Room.findByIdAndUpdate(targetOldRoom, { $pull: { occupants: targetAlloc.student } });
    await Room.findByIdAndUpdate(requesterOldRoom, { $push: { occupants: targetAlloc.student } });
    await Room.findByIdAndUpdate(targetOldRoom, { $push: { occupants: requesterAlloc.student } });

    // Update users' currentRoom
    await User.findByIdAndUpdate(requesterAlloc.student, { currentRoom: targetOldRoom });
    await User.findByIdAndUpdate(targetAlloc.student, { currentRoom: requesterOldRoom });

    res.json({ message: 'Room swap approved and completed', requesterAlloc, targetAlloc });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestAllocation,
  allocateRoom,
  rejectAllocation,
  listAllocations,
  myAllocation,
  vacateAllocation,
  requestSwap,
  approveSwap,
};