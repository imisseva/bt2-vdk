"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Sun, Maximize2, Minimize2, Loader2, Cloud, ToggleLeft, ToggleRight } from "lucide-react";

export default function Home() {
  const [ldrValue, setLdrValue] = useState<string>("Đang chờ dữ liệu...");
  const [loading, setLoading] = useState<string | null>(null);
  const [curtainState, setCurtainState] = useState<"open" | "close">("close");
  const [isAuto, setIsAuto] = useState<boolean>(true); // Trạng thái nút gạt

  const toggleMode = async () => {
    const newMode = !isAuto;
    setIsAuto(newMode);
    try {
      await fetch("http://localhost:3001/api/curtain/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newMode ? "auto" : "manual" }),
      });
    } catch (error) {
      alert("Không thể kết nối tới máy chủ!");
      setIsAuto(!newMode); // Hoàn tác nếu lỗi
    }
  };

  // Kết nối tới Backend cổng 3001
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("sensor_data", (data) => {
      // data có dạng "Gia tri LDR: 750"
      const numberValue = data.replace(/[^\d]/g, ""); 
      setLdrValue(numberValue || data);
    });

    socket.on("curtain_status", (status) => {
      // status: "open" hoặc "close"
      if (status === "open" || status === "close") {
        setCurtainState(status);
        setLoading(null); // Tắt loading khi phần cứng báo đã chạy xong
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const controlCurtain = async (action: "open" | "close") => {
    setLoading(action);
    setIsAuto(false); // Bấm mở/đóng thủ công thì tự gạt công tắc sang Manual
    // Lưu ý: Không setCurtainState(action) ở đây nữa, chờ phần cứng báo về qua Socket!
    try {
      const res = await fetch("http://localhost:3001/api/curtain/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      console.log(data);
    } catch (error) {
      alert("Không thể kết nối tới máy chủ!");
      setLoading(null); // Tắt loading nếu lỗi mạng
    }
    // Đã xóa finally setTimeout, để nút bấm tiếp tục xoay cho đến khi phần cứng báo xong
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black">
      
      {/* Tiêu đề */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 mb-2">
          Smart Curtain
        </h1>
        <p className="text-neutral-400">Điều khiển rèm thông minh IoT</p>
      </div>

      {/* Hiệu ứng Rèm Cửa Animation */}
      <div className="w-full max-w-md h-56 md:h-64 mb-8 relative overflow-hidden rounded-3xl border-8 border-neutral-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-sky-300">
        {/* Cảnh vật ngoài cửa sổ */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200">
           <div className="absolute top-6 right-10 w-16 h-16 bg-yellow-300 rounded-full shadow-[0_0_40px_rgba(253,224,71,1)]"></div>
           <Cloud className="absolute top-12 left-8 w-20 h-10 text-white/80" fill="currentColor" />
           <Cloud className="absolute top-24 right-20 w-16 h-8 text-white/60" fill="currentColor" />
        </div>

        {/* Thanh treo rèm */}
        <div className="absolute top-0 left-0 w-full h-3 bg-neutral-900 z-20 shadow-md"></div>

        {/* Rèm trái */}
        <div 
          className={`absolute top-0 left-0 h-full w-1/2 bg-neutral-200 z-10 shadow-[5px_0_15px_rgba(0,0,0,0.3)] transition-all duration-1000 ease-in-out origin-left flex ${curtainState === 'open' ? '-translate-x-[85%] scale-x-50' : 'translate-x-0'}`}
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #e5e5e5 0px, #d4d4d4 10px, #e5e5e5 20px)' }}
        >
        </div>

        {/* Rèm phải */}
        <div 
          className={`absolute top-0 right-0 h-full w-1/2 bg-neutral-200 z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.3)] transition-all duration-1000 ease-in-out origin-right flex ${curtainState === 'open' ? 'translate-x-[85%] scale-x-50' : 'translate-x-0'}`}
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, #e5e5e5 0px, #d4d4d4 10px, #e5e5e5 20px)' }}
        >
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-md">
        {/* Card Hiển thị Cảm biến */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-400"></div>
          <Sun className="w-8 h-8 text-yellow-400 mb-2 opacity-80" />
          <h2 className="text-sm text-neutral-400 mb-2">Cảm biến LDR</h2>
          <div className="text-3xl font-bold tracking-tighter text-white drop-shadow-md">
            {ldrValue}
          </div>
        </div>

        {/* Cụm Cài Đặt & Nút Bấm */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Toggle Switch */}
          <div 
            onClick={toggleMode}
            className={`cursor-pointer rounded-2xl p-4 flex items-center justify-between transition-all border shadow-lg ${isAuto ? 'bg-sky-500/20 border-sky-400/50 shadow-sky-500/20' : 'bg-neutral-800/50 border-neutral-700'} backdrop-blur-xl`}
          >
            <div className="flex flex-col">
              <span className={`font-bold text-lg ${isAuto ? 'text-sky-300' : 'text-neutral-300'}`}>
                {isAuto ? "TỰ ĐỘNG (AUTO)" : "THỦ CÔNG (MANUAL)"}
              </span>
              <span className="text-xs text-neutral-400">
                {isAuto ? "Rèm đóng/mở theo LDR" : "Bấm nút để điều khiển"}
              </span>
            </div>
            {isAuto ? (
              <ToggleRight className="w-10 h-10 text-sky-400 transition-all scale-110" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-neutral-500 transition-all" />
            )}
          </div>
          <button
            onClick={() => controlCurtain("open")}
            disabled={loading !== null || curtainState === "open"}
            className="flex-1 group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center gap-3 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "open" ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Maximize2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-semibold">Mở rèm</span>
          </button>

          <button
            onClick={() => controlCurtain("close")}
            disabled={loading !== null || curtainState === "close"}
            className="flex-1 group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center gap-3 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "close" ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Minimize2 className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-semibold">Đóng rèm</span>
          </button>
        </div>
      </div>

    </div>
  );
}
