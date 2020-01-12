const express = require('express');
const ErrorResponse = require('./utils/errorResponse');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.use(express.json());

app.all('*', (req, res, next) => {
  next(new ErrorResponse(`${req.originalUrl} not found in the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;