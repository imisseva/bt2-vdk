const coap = require('coap');
const state = require('../utils/state');

let lastLdrValue = -1; // Lưu giá trị số để chống nhiễu

const listen = (io) => { // Nhận đối tượng io từ app.js
    const server = coap.createServer();

    server.on('request', (req, res) => {
        const path = req.url.split('?')[0]; 
        res.setOption('Content-Format', 'text/plain');

        if (path === '/sensor' || path === 'sensor') {
            req.on('data', (chunk) => {
                const dataStr = chunk.toString();
                
                // Trích xuất con số từ chuỗi "Gia tri LDR: 1234"
                const match = dataStr.match(/\d+/);
                if (match) {
                    const currentVal = parseInt(match[0], 10);
                    // Lọc Spam thông minh: Chống nhiễu phần cứng (biến thiên < 50 đơn vị thì bỏ qua)
                    if (Math.abs(currentVal - lastLdrValue) > 50) {
                        console.log(`[CoAP Server] Dữ liệu cảm biến mới: ${dataStr}`);
                        lastLdrValue = currentVal;
                    }
                }
                
                // PHÁT TRỰC TIẾP DỮ LIỆU LÊN FRONTEND QUA WEBSOCKET
                if (io) {
                    io.emit('sensor_data', dataStr);
                }
            });
            res.end('ACK');
        } 
        else if (path === '/command') {
            const cmd = state.getCommand();
            if (cmd) {
                if (cmd === 'auto' || cmd === 'manual') {
                    console.log(`[CoAP Server] Đã điều hướng ESP sang chế độ: ${cmd.toUpperCase()}`);
                } else {
                    console.log(`[CoAP Server] Trả lệnh thao tác rèm cho ESP: ${cmd.toUpperCase()}`);
                }
                res.end(cmd);
            } else {
                res.end('none');
            }
        } 
        else if (path === '/status' || path === 'status') {
            req.on('data', (chunk) => {
                const statusStr = chunk.toString();
                console.log(`[CoAP Server] Trạng thái rèm thực tế: ${statusStr}`);
                if (io) {
                    io.emit('curtain_status', statusStr); // Phát tín hiệu để Frontend tắt Loading
                }
            });
            res.end('ACK');
        }
        else {
            res.end('Unknown Path');
        }
    });

    server.listen(5683, '0.0.0.0', () => {
        console.log('CoAP Listener đang chạy trên cổng 5683 (UDP) IP 0.0.0.0');
    });
};

module.exports = { listen };