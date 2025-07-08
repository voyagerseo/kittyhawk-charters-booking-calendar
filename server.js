const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let bookings = [];
const bookingsFile = './bookings.json';
if (fs.existsSync(bookingsFile)) {
  bookings = JSON.parse(fs.readFileSync(bookingsFile));
}

app.get('/api/bookings', (req, res) => res.json(bookings));

app.post('/api/bookings/request', async (req, res) => {
  const { date, name, email, notes } = req.body;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'New Booking Request',
      text: `Date: ${date}\nName: ${name}\nEmail: ${email}\nNotes: ${notes}`
    });

    bookings.push({ date, title: 'Booked' });
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => console.log(`Server listening at port ${PORT}`));
