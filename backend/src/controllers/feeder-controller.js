const state = require('../utils/state');

const controlFeeder = async (req, res) => {
    const { action } = req.body; 

    if (action !== 'feed') {
        return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
    }

    // Lưu lệnh vào bộ nhớ tạm chờ ESP lên lấy (Polling)
    state.setCommand(action);
    console.log(`[HTTP] Nhận lệnh từ Web: ${action}`);
    res.status(200).json({ success: true, message: `Đã lưu lệnh [${action}], chờ ESP lấy...` });
};

const updateSchedule = async (req, res) => {
    const { hour, minute, targetWeight } = req.body;
    
    if (hour === undefined || minute === undefined || targetWeight === undefined) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin lịch trình' });
    }

    state.setSchedule(parseInt(hour), parseInt(minute), parseFloat(targetWeight));
    console.log(`[HTTP] Cập nhật lịch từ Web: ${hour}:${minute} - ${targetWeight}g`);
    res.status(200).json({ success: true, message: 'Cập nhật lịch trình thành công' });
};

module.exports = { controlFeeder, updateSchedule };