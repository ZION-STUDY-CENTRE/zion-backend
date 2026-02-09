require('dotenv').config();
console.log("Current Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
const express = require('express');
const cloudinaryConfig = require('./config/cloudinary'); 
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const dns = require('dns');
const http = require('http');
const emailRoutes = require('./routes/emailRoutes');
const { initializeSocket } = require('./config/socket');
const { setIO } = require('./config/ioInstance');

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
cloudinaryConfig();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Set io instance for controllers
setIO(io);

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:19006',
  'http://localhost:19007',
  'https://zionstudycentrewebsiteui.vercel.app',
  'https://zionstudycentre.com.ng',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/assignment-submissions', require('./routes/assignmentSubmissionRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/files', require('./routes/fileResourceRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

app.get('/', (req, res) => {
  res.send('Zion Study Centre API is running');
});

// Start Server
server.listen(PORT, () => {
  console.log(`✨ Server running on port ${PORT}`);
  console.log(`🔌 Socket.io initialized`);
});
