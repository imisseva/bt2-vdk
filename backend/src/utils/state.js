let pendingCommand = null;

module.exports = {
    setCommand: (cmd) => { pendingCommand = cmd; },
    getCommand: () => { 
        const cmd = pendingCommand;
        pendingCommand = null; // Tự động xóa sau khi ESP đã lấy lệnh
        return cmd;
    }
};
