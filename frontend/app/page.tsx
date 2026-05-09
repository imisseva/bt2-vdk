"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Đổi địa chỉ này thành IP máy tính bạn
const socket = io("http://localhost:3001"); 

export default function PetFeeder() {
  const [bowlWeight, setBowlWeight] = useState(0);
  const [status, setStatus] = useState("Sẵn sàng đợi lệnh...");
  const [loading, setLoading] = useState(false);
  
  // States for Schedule
  const [scheduleTime, setScheduleTime] = useState("07:30");
  const [targetWeight, setTargetWeight] = useState(10);
  const [scheduleStatus, setScheduleStatus] = useState("");

  useEffect(() => {
    // Lắng nghe cân nặng bát ăn thay đổi
    socket.on("bowl_weight", (data) => {
      setBowlWeight(data);
    });

    // Lắng nghe trạng thái khi thiết bị phản hồi
    socket.on("feed_status", (data) => {
      if (data === "fed" || data === "fed_success") {
        setStatus("✔️ Đã cho ăn thành công!");
        setLoading(false);
        // Sau 3 giây đưa về trạng thái sẵn sàng
        setTimeout(() => setStatus("Sẵn sàng đợi lệnh..."), 3000);
      }
    });

    return () => { 
      socket.off("bowl_weight");
      socket.off("feed_status"); 
    };
  }, []);

  const handleFeed = async () => {
    setLoading(true);
    setStatus("⏳ Đang nhả thức ăn, vui lòng đợi...");
    
    try {
      await fetch("http://localhost:3001/api/feeder/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feed" }),
      });
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      setStatus("❌ Lỗi mạng, không thể gửi lệnh.");
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    setScheduleStatus("Đang lưu...");
    const [hour, minute] = scheduleTime.split(":");
    
    try {
      await fetch("http://localhost:3001/api/feeder/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            hour: parseInt(hour), 
            minute: parseInt(minute), 
            targetWeight: parseFloat(targetWeight.toString()) 
        }),
      });
      setScheduleStatus("✔️ Đã lưu lịch trình!");
      setTimeout(() => setScheduleStatus(""), 3000);
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      setScheduleStatus("❌ Lỗi mạng.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <h1 className="text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
          Smart Pet Feeder 🐾
        </h1>
        <p className="text-slate-400">Điều khiển và giám sát thức ăn từ xa</p>
      </div>
      
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl shadow-orange-900/20 w-full max-w-md text-center border border-slate-700 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-orange-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="mb-6 relative z-10">
            <div className="bg-slate-700 p-6 rounded-2xl border border-slate-600 shadow-inner flex flex-col items-center justify-center">
                <span className="text-slate-400 text-sm font-medium block mb-2 uppercase tracking-wide">Khối lượng ở bát</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black text-emerald-400 drop-shadow-lg">
                        {bowlWeight}
                    </span>
                    <span className="text-xl text-emerald-500 font-bold">g</span>
                </div>
            </div>
        </div>

        {/* Cài đặt lịch trình */}
        <div className="bg-slate-750 p-5 rounded-2xl border border-slate-600 mb-6 text-left relative z-10 bg-slate-900/40">
            <h2 className="text-lg font-semibold text-orange-300 mb-3">🕒 Cài đặt lịch cho ăn</h2>
            <div className="flex gap-4 mb-3">
                <div className="flex-1">
                    <label className="block text-slate-400 text-xs mb-1">Thời gian</label>
                    <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-orange-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-slate-400 text-xs mb-1">Mục tiêu (gam)</label>
                    <input 
                        type="number" 
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>
            <button 
                onClick={handleSaveSchedule}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-lg transition-colors border border-slate-500"
            >
                Lưu lịch trình
            </button>
            {scheduleStatus && <p className="text-xs text-center mt-2 text-emerald-400">{scheduleStatus}</p>}
        </div>

        <button
          onClick={handleFeed}
          disabled={loading}
          className={`relative z-10 w-full py-4 rounded-2xl font-bold text-xl transition-all shadow-lg ${
            loading 
            ? "bg-slate-700 text-slate-400 shadow-none cursor-not-allowed border border-slate-600" 
            : "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 active:translate-y-0 active:scale-95"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang nhả hạt...
            </span>
          ) : "CHO ĂN NGAY 🦴"}
        </button>

        <div className="mt-6 pt-4 border-t border-slate-700/50 relative z-10">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Trạng thái hệ thống</p>
          <div className="inline-block bg-slate-900/50 px-4 py-2 rounded-lg text-sm text-slate-300 font-mono">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
