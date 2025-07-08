const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const bookingsFile = './bookings.json';

app.get('/api/bookings', (req, res) => {
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));
  }
  res.json(bookings);
});

app.post('/api/bookings/request', async (req, res) => {
  const { date, name, phone, email, notes } = req.body;

  if (!date || !name || !email) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  // 🔄 Always load the most recent bookings
  let bookings = [];
  if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));
  }

  const existing = bookings.find(b => b.date === date);
  if (existing?.status === 'blocked') {
    return res.json({ success: false, message: 'This date is blocked and cannot be booked.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'New Booking Request',
      text: `Date: ${date}\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nNotes: ${notes}`
    });

    // Remove existing non-blocked booking for the date
    bookings = bookings.filter(b => !(b.date === date && b.status !== 'blocked'));

    // Add the new booking request
    bookings.push({ date, status: 'requested', name, phone, email, notes });

    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
    res.json({ success: true });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.post('/api/admin/set-status', (req, res) => {
  const { date, status, password } = req.body;
  if (password !== ADMIN_PASS) return res.status(403).json({ success: false, message: 'Wrong password' });

  let data = [];
  if (fs.existsSync(BOOKINGS_FILE)) {
    data = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
  }

  // Remove existing entry for this date (if any)
  data = data.filter(entry => entry.date !== date);

  // Add new status
  data.push({ date, status });
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

app.get('/api/bookings/all', (req, res) => {
  let data = [];
  if (fs.existsSync(BOOKINGS_FILE)) {
    data = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
  }

  // Normalize: ensure all entries have a 'status' field
  const events = data.map(entry => ({
    title: entry.status?.charAt(0).toUpperCase() + entry.status?.slice(1) || 'Booking',
    start: entry.date,
    status: entry.status || 'booked',
    backgroundColor: getColor(entry.status),
    borderColor: getColor(entry.status)
  }));

  function getColor(status) {
    return {
      booked: '#ff4d4d',
      requested: '#ffd966',
      blocked: '#999',
      available: '#4caf50'
    }[status] || '#ccc';
  }

  res.json(events);
});

app.listen(PORT, () => console.log(`Server listening at port ${PORT}`));
