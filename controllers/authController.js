const catchAsync = require('./../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const crypto = require('crypto');

const signToken = id => {
  return jwt.sign({ id: id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    // Milliseconde
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    // The cookie can't be accessed or modified by the browser
    httpOnly: true
  };

  res.cookie('jwt', token, cookieOptions);
  
  // Remove the password from the response.
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })
}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password are provided in request
  if(!email || !password){
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // 2) check if user exists && password are correct
  const user = await User.findOne({email}).select('+password');

  if(!user || !(await user.correctPassword(password, user.password))){
    return next(new ErrorResponse('incorrect email or password', 401));
  }

  //3) if everything ok => send token to client
  const token = signToken(user._id); 
  res.status(200).json({
    status: 'success',
    token,
  });

});

exports.logout = (req, res) => {
  res.cookie('jwt', 'random_token', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    status: 'success',
  });
}

exports.forgotPassword = catchAsync(async(req, res, next) => {

  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if(!user){
    return next(new ErrorResponse('There is no user with is email', 404));
  }

  // 2) Generate the rendom reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) construct url to send to the user
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  try{
    res.status(200).json({
      status: 'success',
      resetURL
    });
  } catch(err){
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Error when sending the email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({ 
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if(!user){
    return next(new ErrorResponse('This token is invalid or expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  
  await user.save();

  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token
  });

});
