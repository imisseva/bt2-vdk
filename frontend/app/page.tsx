"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Đổi địa chỉ này thành IP máy tính bạn
const socket = io("http://192.168.2.126:3001"); 

export default function PetFeeder() {
  const [foodLevel, setFoodLevel] = useState(0);
  const [status, setStatus] = useState("Sẵn sàng đợi lệnh...");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lắng nghe lượng thức ăn thay đổi (0 - 100%)
    socket.on("food_level", (data) => {
      setFoodLevel(data);
    });

    // Lắng nghe trạng thái khi thiết bị phản hồi
    socket.on("feed_status", (data) => {
      if (data === "fed") {
        setStatus("✔️ Đã cho ăn thành công!");
        setLoading(false);
        // Sau 3 giây đưa về trạng thái sẵn sàng
        setTimeout(() => setStatus("Sẵn sàng đợi lệnh..."), 3000);
      }
    });

    return () => { 
      socket.off("food_level"); 
      socket.off("feed_status"); 
    };
  }, []);

  const handleFeed = async () => {
    setLoading(true);
    setStatus("⏳ Đang nhả thức ăn, vui lòng đợi...");
    
    try {
      await fetch("http://192.168.2.126:3001/api/feeder/control", {
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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
          Smart Pet Feeder 🐾
        </h1>
        <p className="text-slate-400">Điều khiển và giám sát thức ăn từ xa</p>
      </div>
      
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl shadow-orange-900/20 w-full max-w-md text-center border border-slate-700 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-orange-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="mb-8 relative z-10">
          <div className="flex justify-between items-end mb-3">
            <span className="text-slate-400 font-medium">Lượng thức ăn trong thùng</span>
            <span className="text-2xl font-bold text-orange-400">{foodLevel}%</span>
          </div>
          
          <div className="w-full bg-slate-700 h-10 rounded-full overflow-hidden border-2 border-slate-600 shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-3 ${
                foodLevel > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                foodLevel > 20 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${foodLevel}%` }}
            >
              {foodLevel > 15 && <span className="text-xs font-bold text-white/90 drop-shadow-md">Còn lại</span>}
            </div>
          </div>
          {foodLevel <= 20 && (
            <p className="text-rose-400 text-sm mt-3 animate-pulse text-left flex items-center gap-2">
              <span>⚠️</span> Sắp hết thức ăn, vui lòng nạp thêm!
            </p>
          )}
        </div>

        <button
          onClick={handleFeed}
          disabled={loading || foodLevel === 0}
          className={`relative z-10 w-full py-5 rounded-2xl font-bold text-xl transition-all shadow-lg ${
            loading || foodLevel === 0 
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
          ) : foodLevel === 0 ? "Hết thức ăn!" : "CHO ĂN NGAY 🦴"}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-700/50 relative z-10">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Trạng thái hệ thống</p>
          <div className="inline-block bg-slate-900/50 px-4 py-2 rounded-lg text-sm text-slate-300 font-mono">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
