let pendingCommand = null;
let lastFoodLevel = 100;

const setCommand = (cmd) => { pendingCommand = cmd; };
const getCommand = () => {
    const cmd = pendingCommand;
    pendingCommand = null; // Xóa lệnh sau khi lấy
    return cmd;
};

const setFoodLevel = (level) => { lastFoodLevel = level; };
const getFoodLevel = () => lastFoodLevel;

module.exports = { setCommand, getCommand, setFoodLevel, getFoodLevel };
