const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentId,
      gender,
      phone,
      guardianPhone,
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'name, email and password are required' });
    }

    if (role === 'student' && !studentId) {
      return res
        .status(400)
        .json({ message: 'studentId is required for student accounts' });
    }

    const existing = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      studentId,
      gender,
      phone,
      guardianPhone,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'email and password are required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: 'This account has been deactivated' });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  getMe,
};
