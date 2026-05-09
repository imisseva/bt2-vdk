const coap = require('coap');
const state = require('../utils/state');

const listen = (io) => {
    const server = coap.createServer();

    server.on('request', (req, res) => {
        const path = req.url.split('?')[0].replace(/^\//, ''); 
        res.setOption('Content-Format', 'text/plain');

        if (path === 'sensor') { 
            req.on('data', (chunk) => {
                const dataStr = chunk.toString();
                // Format: W:5.5
                if (dataStr.startsWith('W:')) {
                    const weight = parseFloat(dataStr.substring(2));
                    state.setBowlWeight(weight);
                    if (io) io.emit('bowl_weight', weight);
                }
                console.log(`[CoAP] Nhận dữ liệu Sensor: ${dataStr}`);
            });
            res.end('ACK');
        } 
        else if (path === 'command') {
            const cmd = state.getCommand();
            if (cmd) console.log(`[CoAP] ESP lấy lệnh: ${cmd}`);
            res.end(cmd || 'none');
        } 
        else if (path === 'schedule') {
            const sched = state.getSchedule();
            const schedStr = `${sched.hour}:${sched.minute}:${sched.targetWeight}`;
            console.log(`[CoAP] ESP lấy lịch trình: ${schedStr}`);
            res.end(schedStr);
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