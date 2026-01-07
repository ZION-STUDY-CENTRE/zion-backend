const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');
const emailRoutes = require('./routes/emailRoutes');

// Fix for ESERVFAIL DNS Timeout on some networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (error) {
  console.log("Could not set custom DNS servers");
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log('MongoDB Connection Error:', err.code);
    if (err.code === 'ESERVFAIL') {
      console.log("---------------------------------------------------");
      console.log("DNS CONNECTION ERROR DETECTED");
      console.log("Try changing your MONGO_URI in .env to the 'Standard Connection String' format.");
      console.log("Format: mongodb://<user>:<password>@<shard-address>...");
      console.log("---------------------------------------------------");
    }
  });

// Start Automation Scripts
const startAutomation = require('./utils/automation');
startAutomation();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/programs', require('./routes/programRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/email', emailRoutes); 

app.get('/', (req, res) => {
  res.send('Zion Study Centre API is running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
