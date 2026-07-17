require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const FeeRecord = require('../models/FeeRecord');
const Complaint = require('../models/Complaint');
const { computeTotal } = require('../utils/feeCalculator');

async function seed() {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Hostel.deleteMany({}),
    Room.deleteMany({}),
    Allocation.deleteMany({}),
    FeeRecord.deleteMany({}),
    Complaint.deleteMany({}),
  ]);

  console.log('Creating users...');
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@hostelease.com',
    password: 'admin123',
    role: 'admin',
  });

  const warden = await User.create({
    name: 'Mr. R. Sharma',
    email: 'warden@hostelease.com',
    password: 'warden123',
    role: 'warden',
  });

  const hostel = await Hostel.create({
    name: 'Aravalli Boys Hostel',
    genderCategory: 'male',
    totalFloors: 4,
    warden: warden._id,
    address: 'Block C, University Campus',
  });

  console.log('Creating rooms...');
  const room101 = await Room.create({
    hostel: hostel._id,
    roomNumber: '101',
    floor: 1,
    roomType: 'double',
    capacity: 2,
    monthlyRent: 5000,
  });
  const room102 = await Room.create({
    hostel: hostel._id,
    roomNumber: '102',
    floor: 1,
    roomType: 'single',
    capacity: 1,
    monthlyRent: 8000,
  });
  await Room.create({
    hostel: hostel._id,
    roomNumber: '201',
    floor: 2,
    roomType: 'triple',
    capacity: 3,
    monthlyRent: 4000,
  });

  const student1 = await User.create({
    name: 'Aman Kumar',
    email: 'aman@student.com',
    password: 'student123',
    role: 'student',
    studentId: 'STU1001',
    gender: 'male',
    phone: '9876543210',
    guardianPhone: '9876500000',
    currentRoom: room101._id,
  });

  const student2 = await User.create({
    name: 'Rohit Verma',
    email: 'rohit@student.com',
    password: 'student123',
    role: 'student',
    studentId: 'STU1002',
    gender: 'male',
    phone: '9876543211',
    guardianPhone: '9876500001',
    currentRoom: room102._id,
  });

  room101.occupants.push(student1._id);
  await room101.save();
  room102.occupants.push(student2._id);
  await room102.save();

  console.log('Creating allocations...');
  await Allocation.create({
    student: student1._id,
    room: room101._id,
    preferredRoomType: 'double',
    status: 'allocated',
    allocatedAt: new Date(),
  });
  await Allocation.create({
    student: student2._id,
    room: room102._id,
    preferredRoomType: 'single',
    status: 'allocated',
    allocatedAt: new Date(),
  });

  console.log('Creating fee records (one overdue, one paid)...');
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 30); // 30 days overdue -> defaulter

  const totalOverdue = computeTotal({ roomRent: 5000, messCharges: 2000, otherCharges: 0, lateFine: 0 });
  await FeeRecord.create({
    student: student1._id,
    room: room101._id,
    billingCycle: '2026-Odd-Sem',
    roomRent: 5000,
    messCharges: 2000,
    totalAmount: totalOverdue,
    amountPaid: 0,
    dueDate: overdueDate,
    status: 'unpaid',
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 20);
  const totalPaid = computeTotal({ roomRent: 8000, messCharges: 2000, otherCharges: 0, lateFine: 0 });
  await FeeRecord.create({
    student: student2._id,
    room: room102._id,
    billingCycle: '2026-Odd-Sem',
    roomRent: 8000,
    messCharges: 2000,
    totalAmount: totalPaid,
    amountPaid: totalPaid,
    dueDate: futureDate,
    status: 'paid',
  });

  console.log('Creating a sample complaint...');
  await Complaint.create({
    student: student1._id,
    room: room101._id,
    category: 'electrical',
    description: 'Ceiling fan in room 101 is making a loud noise and running slowly.',
    priority: 'medium',
    status: 'open',
  });

  console.log('\nSeed complete. Sample logins:');
  console.log('  Admin   -> admin@hostelease.com / admin123');
  console.log('  Warden  -> warden@hostelease.com / warden123');
  console.log('  Student -> aman@student.com / student123 (has an overdue fee -> defaulter)');
  console.log('  Student -> rohit@student.com / student123 (fully paid)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
