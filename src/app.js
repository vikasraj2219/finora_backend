const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

app.use(
  helmet({
    // Allow uploaded receipt images to be embedded/viewed cross-origin by the frontend.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Personal Finance API is healthy' });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
