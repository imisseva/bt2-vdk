const coap = require('coap');

const listen = () => {
    const server = coap.createServer();

    server.on('request', (req, res) => {
        const path = req.url;
        console.log(`[CoAP Server] Nhận request từ rèm: ${path}`);

        // Đọc dữ liệu từ ESP8266 gửi lên (ví dụ giá trị LDR)
        req.on('data', (chunk) => {
            console.log(`[CoAP Data]: ${chunk.toString()}`);
        });

        res.setOption('Content-Format', 'text/plain');
        res.end('ACK: Server đã nhận tin!');
    });

    server.listen(5683, () => {
        console.log('CoAP Listener đang chạy trên cổng 5683 (UDP)');
    });
};

module.exports = { listen };