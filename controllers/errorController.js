const ErrorResponse = require('../utils/errorResponse');

const handleCastErrorDB = err => {
  message = `${err.value} is not a valid value for ${err.path}`;
  return new ErrorResponse(message, 400);
}

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  message = `Duplicate value for ${value}. Please use other one.`
  return new ErrorResponse(message, 400);
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid inputs. ${errors.join('. ')}`;
  return new ErrorResponse(message, 400);
}

const handleJWTError = () => new ErrorResponse('Invalid token, please login again.', 401)
const handleJWTExpiredError = () => new ErrorResponse('Your token has expired, please login again', 401)

const sendErrorProd = (err, res) => {
  if(err.isOperational){
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Unexpected error !',
    });
  }
}

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if(error.name === "CastError") error = handleCastErrorDB(error);

  // Mongoose duplicate key
  if(error.code === 11000) error = handleDuplicateFieldsDB(error);

  // Mongoose validation error
  if(error.name === "ValidationError") error = handleValidationErrorDB(error);

  //Invalid JWT
  if(error.name === "JsonWebTokenError") error = handleJWTError();

  //JWT expired
  if(error.name === "TokenExpiredError") error = handleJWTExpiredError();

  sendErrorProd(error, res);
};