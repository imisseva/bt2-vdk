let pendingCommand = null;
let bowlWeight = 0;
let schedule = { hour: 7, minute: 30, targetWeight: 10 };

const setCommand = (cmd) => { pendingCommand = cmd; };
const getCommand = () => {
    const cmd = pendingCommand;
    pendingCommand = null;
    return cmd;
};

const setBowlWeight = (weight) => { bowlWeight = weight; };
const getBowlWeight = () => bowlWeight;

const setSchedule = (h, m, target) => { 
    schedule = { hour: h, minute: m, targetWeight: target }; 
};
const getSchedule = () => schedule;

module.exports = { 
    setCommand, getCommand, 
    setBowlWeight, getBowlWeight,
    setSchedule, getSchedule
};
