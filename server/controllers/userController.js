const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');

// --- Admin ---

const listUsers = asyncHandler(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query).filter().search(['name', 'email']).sort().limitFields().paginate();
  const users = await features.query;
  const total = await User.countDocuments();

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: features.pagination,
    data: users.map((u) => u.toSafeObject()),
  });
});

const updateUser = asyncHandler(async (req, res, next) => {
  const { role, isDeactivated, name, phone } = req.body;
  const update = {};
  if (role !== undefined) update.role = role;
  if (isDeactivated !== undefined) update.isDeactivated = isDeactivated;
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;

  const user = await User.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({ success: true, data: user.toSafeObject() });
});

// --- Self ---

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;

  const user = await User.findByIdAndUpdate(req.user.id, update, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: user.toSafeObject() });
});

const updateThemePreference = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { themePreference: req.body.themePreference },
    { new: true, runValidators: true }
  );
  res.status(200).json({ success: true, data: { themePreference: user.themePreference } });
});

const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (req.body.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses.push(req.body);
  await user.save();

  res.status(201).json({ success: true, data: user.toSafeObject() });
});

const updateAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) return next(new AppError('Address not found.', 404));

  if (req.body.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  Object.assign(address, req.body);
  await user.save();

  res.status(200).json({ success: true, data: user.toSafeObject() });
});

const deleteAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) return next(new AppError('Address not found.', 404));

  address.deleteOne();
  await user.save();

  res.status(200).json({ success: true, data: user.toSafeObject() });
});

module.exports = {
  listUsers,
  updateUser,
  updateProfile,
  updateThemePreference,
  addAddress,
  updateAddress,
  deleteAddress,
};
