const validator = require('deep-email-validator');
const User = require('../models/User');

const checkEmail = async (req, res) => {
  const email = req.query.email
  if (!email) { res.status(400).json({ code: 202, message: 'Email argument is missing' }); return }

  const check = await User.findOne({ email: email })
  if (check) { res.status(403).json({ code: 205, message: 'Email already used'}); return }

  const result = await validator.validate(email);
  res.status(200).json(result.valid ? { code: 203, message: 'Email reachable' } : { code: 204, message: 'Email not reachable' });
};

const verifyEmail = async (req, res) => {
  const code = req.body.code
  const email = req.query.email
  if (!code) { res.status(400).json({ code: 202, message: 'Code argument is missing' }); return }
  if (!email) { res.status(400).json({ code: 202, message: 'Email argument is missing' }); return }

  const check = await User.findOne({ email: email })
  if (!check) { res.status(403).json({ code: 208, message: 'Email not associated with any account'}); return }

  User.findOneAndUpdate({ verificationCode: code }, { $set: { isVerified: true } }, (error, result) => {
    if (error || !result) res.status(200).json({code: 207, message: "Invalid verification Code" })
    else res.status(200).json({code: 206, message: "Email verified successfully" });
  });
}

module.exports = { checkEmail, verifyEmail };