const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, slow down.' }
});
app.use('/api', limiter);

app.use('/api', require('./routes/lookup'));
app.use('/api', require('./routes/history'));

app.listen(PORT, () => {
  console.log(`IPulse backend running on http://localhost:${PORT}`);
});