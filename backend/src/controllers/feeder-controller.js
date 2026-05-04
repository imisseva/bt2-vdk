const state = require('../utils/state');

const controlFeeder = async (req, res) => {
    const { action } = req.body; 

    if (action !== 'feed') {
        return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
    }

    // Lưu lệnh vào bộ nhớ tạm chờ ESP lên lấy (Polling)
    state.setCommand(action);
    res.status(200).json({ success: true, message: `Đã lưu lệnh [${action}], chờ ESP lấy...` });
};

module.exports = { controlFeeder };