require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedSystemTypes } = require('./services/type.service');

const PORT = process.env.PORT || 5100;

const startServer = async () => {
  try {
    await connectDB();
    // Idempotent — ensures income/expense/transfer/adjustment/opening_balance always
    // exist in the Type collection, even on a brand-new database, with no manual
    // migration step.
    await seedSystemTypes();
    app.listen(PORT, () => {
      console.log(`Personal Finance API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
