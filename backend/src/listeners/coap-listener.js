const coap = require('coap');
const state = require('../utils/state');

const listen = (io) => {
    const server = coap.createServer();

    server.on('request', (req, res) => {
        const path = req.url.split('?')[0].replace(/^\//, ''); 
        res.setOption('Content-Format', 'text/plain');

        if (path === 'sensor') { // Nhận dữ liệu khoảng cách từ cảm biến siêu âm
            req.on('data', (chunk) => {
                const distance = parseInt(chunk.toString());
                const maxLevel = 20; 
                let percent = Math.round(((maxLevel - distance) / maxLevel) * 100);
                percent = Math.max(0, Math.min(100, percent)); 

                state.setFoodLevel(percent);
                if (io) io.emit('food_level', percent);
                console.log(`[CoAP] Nhận dữ liệu Sensor: ${distance}cm -> ${percent}%`);
            });
            res.end('ACK');
        } 
        else if (path === 'command') {
            const cmd = state.getCommand();
            res.end(cmd || 'none');
        } 
        else if (path === 'status') {
            req.on('data', (chunk) => {
                const status = chunk.toString(); 
                if (io) io.emit('feed_status', status);
                console.log(`[CoAP] Trạng thái thiết bị: ${status}`);
            });
            res.end('ACK');
        }
        else {
            console.log(`[CoAP] Nhận yêu cầu lạ tới đường dẫn: /${path}`);
            res.end('Unknown Path');
        }
    });

    server.listen(5683, '0.0.0.0', () => {
        console.log('CoAP Listener cho Máy cho ăn chạy trên cổng 5683 (UDP) IP 0.0.0.0');
    });
};

module.exports = { listen };