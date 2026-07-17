const Room = require('../models/Room');
const Hostel = require('../models/Hostel');

// @route POST /api/hostels  (admin)
const createHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.create(req.body);
    res.status(201).json(hostel);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/hostels
const listHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find().populate('warden', 'name email');
    res.json(hostels);
  } catch (err) {
    next(err);
  }
};

// @route POST /api/rooms  (admin/warden)
const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/rooms?hostel=&roomType=&status=&onlyVacant=true
const listRooms = async (req, res, next) => {
  try {
    const { hostel, roomType, status, onlyVacant } = req.query;
    const filter = {};
    if (hostel) filter.hostel = hostel;
    if (roomType) filter.roomType = roomType;
    if (status) filter.status = status;

    let rooms = await Room.find(filter).populate('hostel', 'name genderCategory').populate('occupants', 'name studentId');

    if (onlyVacant === 'true') {
      rooms = rooms.filter((r) => r.occupants.length < r.capacity);
    }

    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/rooms/:id
const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('hostel', 'name genderCategory')
      .populate('occupants', 'name studentId email');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

// @route PATCH /api/rooms/:id  (admin/warden) - e.g. change status, rent
const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

module.exports = { createHostel, listHostels, createRoom, listRooms, getRoom, updateRoom };
