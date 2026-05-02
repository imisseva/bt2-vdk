// const coap = require('coap');

// const sendControlCommand = (targetIp, command) => {
//     return new Promise((resolve, reject) => {
//         // Cấu hình yêu cầu gửi tới ESP8266
//         const req = coap.request({
//             host: targetIp,
//             method: 'GET',
//             pathname: `/${command}`, // Ví dụ: /open hoặc /close
//             confirmable: true,       // Đảm bảo tin nhắn được xác nhận (CON)
//             token: Buffer.alloc(0)   // Bắt buộc Token rỗng để thư viện ESP không bị tràn bộ nhớ
//         });

//         req.on('response', (res) => {
//             if (res.code === '2.05') { // 2.05 là Content (Thành công)
//                 resolve(res.payload.toString());
//             } else {
//                 reject(`Lỗi từ thiết bị: ${res.code}`);
//             }
//         });

//         req.on('error', (err) => {
//             reject(`Không thể kết nối tới rèm: ${err.message}`);
//         });

//         req.end();
//     });
// };

// module.exports = { sendControlCommand };