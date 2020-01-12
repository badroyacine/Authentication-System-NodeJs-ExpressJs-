const dotenv = require('dotenv');

// Uncaught Exception (that accurs in synchronous code)
process.on('uncaughtException', err =>{
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require('./app.js')

dotenv.config({path: './config.env'});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log('The server is listening...');
});

// Unhandled Rejected Promises (that accurs in asynchronous code witch were not previosly handled)
process.on('unhandledRejection', err => {
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  })
})