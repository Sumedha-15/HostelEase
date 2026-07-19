const User = require('../models/User');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, '-password')
      .populate('currentRoom', 'roomNumber roomType')
      .sort({ name: 1 });

    res.json(users);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
};