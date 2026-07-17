const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const FeeRecord = require('../models/FeeRecord');

// @route GET /api/dashboard/occupancy  (admin/warden)
// Real-time occupancy % broken down by hostel, and by room type overall.
const occupancySummary = async (req, res, next) => {
  try {
    const hostels = await Hostel.find();
    const rooms = await Room.find();

    const perHostel = hostels.map((hostel) => {
      const hostelRooms = rooms.filter((r) => String(r.hostel) === String(hostel._id));
      const totalCapacity = hostelRooms.reduce((sum, r) => sum + r.capacity, 0);
      const totalOccupied = hostelRooms.reduce((sum, r) => sum + r.occupants.length, 0);
      return {
        hostel: hostel.name,
        totalRooms: hostelRooms.length,
        totalCapacity,
        totalOccupied,
        vacantSeats: totalCapacity - totalOccupied,
        occupancyRate: totalCapacity ? Number(((totalOccupied / totalCapacity) * 100).toFixed(1)) : 0,
      };
    });

    const roomTypeBreakdown = {};
    rooms.forEach((r) => {
      if (!roomTypeBreakdown[r.roomType]) {
        roomTypeBreakdown[r.roomType] = { capacity: 0, occupied: 0 };
      }
      roomTypeBreakdown[r.roomType].capacity += r.capacity;
      roomTypeBreakdown[r.roomType].occupied += r.occupants.length;
    });

    const overallCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const overallOccupied = rooms.reduce((sum, r) => sum + r.occupants.length, 0);

    res.json({
      overall: {
        totalCapacity: overallCapacity,
        totalOccupied: overallOccupied,
        occupancyRate: overallCapacity ? Number(((overallOccupied / overallCapacity) * 100).toFixed(1)) : 0,
      },
      perHostel,
      roomTypeBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/dashboard/summary  (admin/warden)
// A single snapshot combining counts across every module - what the admin
// landing page renders.
const dashboardSummary = async (req, res, next) => {
  try {
    const [openComplaints, criticalComplaints, activeVisitors, overdueFees] = await Promise.all([
      Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] }, priority: 'critical' }),
      Visitor.countDocuments({ status: { $in: ['checked_in', 'overstaying'] } }),
      FeeRecord.countDocuments({ status: 'overdue' }),
    ]);

    res.json({ openComplaints, criticalComplaints, activeVisitors, overdueFees });
  } catch (err) {
    next(err);
  }
};

module.exports = { occupancySummary, dashboardSummary };
