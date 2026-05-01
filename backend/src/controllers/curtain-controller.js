const coapService = require('../services/coap-service');

const controlCurtain = async (req, res) => {
    const { action } = req.body; // 'open' hoặc 'close'
    const espIp = process.env.ESP_IP || '192.168.1.50'; // IP nội bộ của ESP8266

    try {
        const result = await coapService.sendControlCommand(espIp, action);
        res.status(200).json({ success: true, message: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error });
    }
};

module.exports = { controlCurtain };