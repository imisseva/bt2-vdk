require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // Thêm http module
const { Server } = require('socket.io'); // Thêm socket.io
const coapListener = require('./listeners/coap-listener');
const curtainRoutes = require('./routes/curtain-routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Khởi tạo HTTP server và Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' } // Cho phép Frontend (Next.js) gọi tới
});

io.on('connection', (socket) => {
    console.log('[Socket] Một người dùng vừa truy cập trang web!');
});

app.use('/api/curtain', curtainRoutes);

app.get('/', (req, res) => {
    res.send(`Backend rèm cửa đã sẵn sàng trên cổng ${PORT}!`);
});

// Chạy CoAP Server và truyền `io` vào để nó có thể phát dữ liệu
coapListener.listen(io);

// Chạy Express Server bằng biến `server` thay vì `app`
server.listen(PORT, () => {
    console.log(`HTTP API chạy tại: http://localhost:${PORT}`);
});