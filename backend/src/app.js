require('dotenv').config();
const express = require('express');
const cors = require('cors');
const coapListener = require('./listeners/coap-listener');
const curtainRoutes = require('./routes/curtain-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sử dụng Routes
app.use('/api/curtain', curtainRoutes);

app.get('/', (req, res) => {
    res.send('Backend rèm cửa đã sẵn sàng!');
});

// Chạy CoAP Server
coapListener.listen();

// Chạy Express Server
app.listen(PORT, () => {
    console.log(`HTTP API chạy tại: http://localhost:${PORT}`);
});