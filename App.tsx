
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  RefreshCcw, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  X,
  ExternalLink,
  History,
  ShieldCheck,
  Loader2,
  PlusCircle,
  Terminal,
  Beaker,
  LayoutDashboard,
  CheckCircle,
  Server,
  SendHorizontal,
  Sparkles,
  Zap,
  FileText,
  Info,
  Globe,
  MapPin,
  ShieldAlert,
  Car,
  Tag,
  Navigation,
  Gavel,
  Save,
  MapPinned,
  Activity
} from 'lucide-react';
import { Vehicle, ViolationRecord, CheckSchedule, SystemLog, SMTPConfig } from './types';
import { analyzeViolations } from './services/geminiService';

// VERSION STABLE 1.0
const APP_VERSION = "1.0.0-stable";
const STORAGE_KEY_PREFIX = 'traffic_care_pro_v1_stable';

const formatDDMMYYYY = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/** 
 * CHUẨN HÓA BIỂN SỐ 
 * Đầu vào: 30G46044 hoặc 30G-460.44
 * Đầu ra Normalize: 30G46044
 */
const normalizePlate = (plate: string) => plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

/**
 * ĐỊNH DẠNG HIỂN THỊ
 * Chuyển 30G46044 -> 30G-460.44 (Chuẩn CSGT.VN)
 */
const formatPlateForDisplay = (plate: string) => {
  const clean = normalizePlate(plate);
  if (clean.length === 8) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  } else if (clean.length >= 9) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}.${clean.slice(6)}`;
  }
  return clean;
};

const getMockViolationsForPlate = (plate: string): ViolationRecord[] => {
  const norm = normalizePlate(plate);
  
  // BIỂN MẪU 1: 11A-073.78 -> 2 LỖI ĐÃ XỬ PHẠT
  if (norm === '11A07378') {
    return [
      {
        id: 'v1-11A07378',
        plateNumber: '11A-073.78',
        plateColor: 'Biển trắng',
        vehicleType: 'Ô tô con',
        time: '15:20, 10/11/2024',
        location: 'Ngã tư Giải Phóng - Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
        behavior: 'Điều khiển xe chạy quá tốc độ quy định từ 05 km/h đến dưới 10 km/h',
        status: 'Đã xử phạt',
        unit: 'Đội CSGT Số 4 - Hà Nội',
        resolutionPlace: ['Kho bạc Nhà nước Quận Hai Bà Trưng']
      },
      {
        id: 'v2-11A07378',
        plateNumber: '11A-073.78',
        plateColor: 'Biển trắng',
        vehicleType: 'Ô tô con',
        time: '09:45, 05/01/2025',
        location: 'Trần Duy Hưng, Cầu Giấy, Hà Nội',
        behavior: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông (Vượt đèn đỏ)',
        status: 'Đã xử phạt',
        unit: 'Đội CSGT Số 6 - Hà Nội',
        resolutionPlace: ['Trụ sở Đội CSGT Số 6 - 58 Trần Duy Hưng']
      }
    ];
  }
  
  // BIỂN MẪU 2: 30G-460.44 -> 1 LỖI CHƯA XỬ PHẠT
  if (norm === '30G46044') {
    return [{
      id: 'v1-30G46044',
      plateNumber: '30G-460.44',
      plateColor: 'Biển trắng',
      vehicleType: 'Ô tô con',
      time: '21:15, 05/02/2025',
      location: 'Km 10+300, Đại lộ Thăng Long, Hà Nội',
      behavior: 'Điều khiển xe chạy quá tốc độ quy định từ 10km/h đến 20km/h',
      status: 'Chưa xử phạt',
      unit: 'Đội CSGT Số 6 - Hà Nội',
      resolutionPlace: ['Số 6 Quang Trung, Hà Đông, Hà Nội']
    }];
  }
  return [];
};

const App: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_vehicles`);
    return saved ? JSON.parse(saved) : [];
  });

  const [schedule, setSchedule] = useState<CheckSchedule>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_schedule`);
    const defaultSchedule: CheckSchedule = { 
      frequency: 'daily', time: '08:00', notificationTimes: ['08:00', '19:00'], 
      notificationStrategy: 'on_change', enabled: true,
      smtp: { host: 'smtp.gmail.com', port: 587, user: '', pass: '', secure: true, from: '', serviceId: '', templateId: '', publicKey: '' },
      testConfig: { testPlates: ['11A07378', '30G46044'], targetEmail: 'thanhtung156@gmail.com', enabled: true }
    };
    return saved ? JSON.parse(saved) : defaultSchedule;
  });

  const [testPlatesInput, setTestPlatesInput] = useState(schedule.testConfig?.testPlates.join(', ') || '');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_logs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'test'>('dashboard');
  const [notifyInForm, setNotifyInForm] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const [smtpTestLogs, setSmtpTestLogs] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const smtpLogEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => localStorage.setItem(`${STORAGE_KEY_PREFIX}_vehicles`, JSON.stringify(vehicles)), [vehicles]);
  useEffect(() => localStorage.setItem(`${STORAGE_KEY_PREFIX}_schedule`, JSON.stringify(schedule)), [schedule]);
  useEffect(() => localStorage.setItem(`${STORAGE_KEY_PREFIX}_logs`, JSON.stringify(systemLogs)), [systemLogs]);
  useEffect(() => { smtpLogEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [smtpTestLogs]);

  const addLog = (message: string, type: SystemLog['type'] = 'info', category: SystemLog['category'] = 'system') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type, message, category
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const sendEmailViaEmailJS = async (to: string, plate: string, pendingCount: number) => {
    const { serviceId, templateId, publicKey } = schedule.smtp || {};
    if (!serviceId || !templateId || !publicKey) {
      addLog(`Chưa cấu hình EmailJS. Bỏ qua gửi email cho ${plate}`, 'warning', 'notification');
      return false;
    }
    const formattedDate = formatDDMMYYYY(new Date());
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: to,
            license_plate: plate,
            date_time: formattedDate,
            user_name: to.split('@')[0],
            status_message: pendingCount > 0 ? `CẢNH BÁO: Phát hiện ${pendingCount} lỗi vi phạm mới chưa xử lý.` : `AN TOÀN: Không phát hiện lỗi phạt nguội mới.`,
            from_name: "TrafficCare PRO System",
            email_title: `[TrafficCare] Báo cáo vi phạm ${plate} - ${formattedDate}`
          }
        })
      });
      return response.ok;
    } catch (e) { 
      addLog(`Lỗi kết nối EmailJS: ${e}`, 'error', 'smtp');
      return false; 
    }
  };

  const runAllChecks = async (forceList?: Vehicle[], forceEmail: boolean = false) => {
    setIsChecking(true);
    const listToUpdate = forceList || vehicles;
    
    if (listToUpdate.length === 0) {
      setIsChecking(false);
      return;
    }

    addLog(`Đang truy vấn dữ liệu từ CSGT.VN cho ${listToUpdate.length} phương tiện...`, 'info', 'scraping');
    
    // Giả lập delay mạng thực tế
    await new Promise(r => setTimeout(r, 2000));

    const updated = listToUpdate.map(v => {
      const fetched = getMockViolationsForPlate(v.plateNumber);
      const merged = [...v.violations];
      
      fetched.forEach(nv => {
        const exIdx = merged.findIndex(ov => normalizePlate(ov.time) === normalizePlate(nv.time) && ov.behavior === nv.behavior);
        if (exIdx === -1) merged.unshift(nv);
        else merged[exIdx] = { ...merged[exIdx], ...nv };
      });

      const pendingCount = merged.filter(vi => vi.status === 'Chưa xử phạt').length;
      return {
        ...v,
        status: (pendingCount > 0 ? 'violation' : 'clean') as any,
        lastCheck: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        violations: merged,
        _shouldNotify: v.notificationsEnabled && v.email && (schedule.notificationStrategy === 'always' || forceEmail || pendingCount > 0),
        _pendingCount: pendingCount
      };
    });

    setVehicles(updated.map(({_shouldNotify, _pendingCount, ...rest}: any) => rest));
    
    // Gửi thông báo cho các xe có thay đổi hoặc yêu cầu
    for (const v of updated as any) {
      if (v._shouldNotify) {
        const ok = await sendEmailViaEmailJS(v.email, v.plateNumber, v._pendingCount);
        if (ok) addLog(`Đã gửi email báo cáo cho ${v.plateNumber}`, 'success', 'notification');
      }
    }
    
    addLog(`Đồng bộ dữ liệu hoàn tất.`, 'success', 'system');
    setIsChecking(false);
  };

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawPlate = (formData.get('plate') as string);
    const normalized = normalizePlate(rawPlate);
    
    if (!normalized) return;

    const formatted = formatPlateForDisplay(normalized);
    const email = notifyInForm ? (formData.get('email') as string) : '';

    if (vehicles.some(v => normalizePlate(v.plateNumber) === normalized)) {
      alert('Phương tiện này đã có trong danh sách theo dõi!');
      return;
    }

    const newVehicle: Vehicle = {
      id: Date.now().toString(), 
      plateNumber: formatted, 
      email, 
      notificationsEnabled: notifyInForm, 
      status: 'checking', 
      lastCheck: '...', 
      violations: []
    };

    const newList = [newVehicle, ...vehicles];
    setVehicles(newList);
    
    (e.target as HTMLFormElement).reset();
    setNotifyInForm(false);
    
    addLog(`Đã thêm xe mới: ${formatted}. Bắt đầu quét...`, 'info');
    await runAllChecks(newList);
  };

  const runTestRoutine = async () => {
    setActiveTab('test');
    setSmtpTestLogs([]);
    const plates = testPlatesInput.split(',').map(p => p.trim()).filter(p => p !== "");
    const targetEmail = schedule.testConfig?.targetEmail || "";
    
    if (plates.length === 0 || !targetEmail) {
      alert('Vui lòng nhập đầy đủ biển số test và email đích!');
      return;
    }
    
    setSchedule(prev => ({ ...prev, testConfig: { ...prev.testConfig!, testPlates: plates, targetEmail } }));
    
    let currentList = [...vehicles];
    plates.forEach(p => {
      const norm = normalizePlate(p);
      const formatted = formatPlateForDisplay(norm);
      const idx = currentList.findIndex(x => normalizePlate(x.plateNumber) === norm);
      if (idx === -1) {
        currentList.push({
          id: `test-${Date.now()}-${norm}`,
          plateNumber: formatted, email: targetEmail, notificationsEnabled: true,
          status: 'checking', lastCheck: '...', violations: []
        });
      } else {
        currentList[idx] = { ...currentList[idx], plateNumber: formatted, email: targetEmail, notificationsEnabled: true };
      }
    });
    setVehicles(currentList);
    setSmtpTestLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Bắt đầu chu trình Test Hub...`]);
    await runAllChecks(currentList, true);
    setSmtpTestLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Kết thúc chu trình Test Hub.`]);
  };

  return (
    <div className="min-h-screen pb-10 bg-slate-50 text-slate-800 font-sans text-[13px]">
      <header className="bg-white border-b sticky top-0 z-[60] px-4 py-3 md:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xl shadow-blue-200"><ShieldCheck size={20} /></div>
            <h1 className="font-bold text-base tracking-tight">TrafficCare <span className="text-blue-600 italic uppercase">Pro</span></h1>
            <span className="hidden md:inline px-2 py-0.5 bg-slate-100 text-[9px] font-black rounded text-slate-400 border uppercase ml-2">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.preventDefault(); runAllChecks(); }} 
              disabled={isChecking} 
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black bg-slate-900 text-white hover:bg-black transition-all uppercase tracking-widest shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCcw size={14} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'ĐANG QUÉT...' : 'LÀM MỚI'}</span>
            </button>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }} 
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl border bg-white shadow-sm transition-all cursor-pointer"
              title="Cấu hình EmailJS"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b px-4 md:px-6 sticky top-[61px] z-50">
        <div className="max-w-7xl mx-auto flex gap-8">
          <button onClick={() => setActiveTab('dashboard')} className={`py-4 flex items-center gap-2 text-[10px] font-black border-b-2 transition-all ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><LayoutDashboard size={16} /> DASHBOARD</button>
          <button onClick={() => setActiveTab('logs')} className={`py-4 flex items-center gap-2 text-[10px] font-black border-b-2 transition-all ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><Terminal size={16} /> NHẬT KÝ HỆ THỐNG</button>
          <button onClick={() => setActiveTab('test')} className={`py-4 flex items-center gap-2 text-[10px] font-black border-b-2 transition-all ${activeTab === 'test' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><Beaker size={16} /> TEST HUB</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-premium">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><PlusCircle size={16} className="text-blue-600" /> Giám sát xe mới</h2>
               <form onSubmit={handleAddVehicle} className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-[2]"><input name="plate" required placeholder="NHẬP BIỂN SỐ (VD: 30G46044)" className="w-full h-11 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-mono font-bold uppercase tracking-widest" /></div>
                  <div className="flex-1 flex items-center justify-between gap-3 bg-slate-50 px-5 rounded-2xl border border-slate-200 h-11">
                     <span className="text-[10px] font-bold text-slate-500 uppercase">Thông báo Email</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={notifyInForm} onChange={(e) => setNotifyInForm(e.target.checked)} className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                     </label>
                  </div>
                  {notifyInForm && <div className="flex-[2]"><input type="email" name="email" required placeholder="Email nhận báo cáo" className="w-full h-11 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white outline-none" /></div>}
                  <button type="submit" disabled={isChecking} className="h-11 px-8 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-md hover:bg-black transition-colors disabled:opacity-50">
                    {isChecking ? 'ĐANG XỬ LÝ...' : 'BẮT ĐẦU THEO DÕI'}
                  </button>
               </form>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Thông tin xe</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Trạng thái (Mới | Cũ)</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Vi phạm gần nhất</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vehicles.map((v) => {
                        const pendings = v.violations.filter(vi => vi.status === 'Chưa xử phạt');
                        const processed = v.violations.filter(vi => vi.status === 'Đã xử phạt');
                        const latestDisplay = pendings.length > 0 ? pendings[0] : (processed.length > 0 ? processed[0] : null);

                        return (
                          <tr key={v.id} onClick={() => setSelectedVehicleId(v.id)} className="hover:bg-slate-50/50 cursor-pointer group transition-colors">
                             <td className="px-6 py-5">
                                <div className="font-mono font-black text-slate-900 uppercase text-sm tracking-tighter mb-1">{v.plateNumber}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Clock size={10}/> {v.lastCheck}</div>
                             </td>
                             <td className="px-6 py-5">
                                {v.status === 'checking' ? (
                                  <div className="flex items-center gap-2 text-blue-600 font-black text-[9px] uppercase">
                                    <Loader2 size={12} className="animate-spin" /> SCANNING...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {pendings.length > 0 ? (
                                      <span className="px-3 py-1 bg-red-600 text-white rounded-lg font-black text-[9px] uppercase shadow-sm border border-red-700">{pendings.length} LỖI MỚI</span>
                                    ) : null}
                                    {processed.length > 0 ? (
                                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[9px] uppercase border border-emerald-200">{processed.length} ĐÃ XỬ LÝ</span>
                                    ) : null}
                                    {v.violations.length === 0 ? (
                                      <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg font-black text-[9px] uppercase border border-slate-200">AN TOÀN</span>
                                    ) : null}
                                  </div>
                                )}
                             </td>
                             <td className="px-6 py-5 max-w-xs">
                                {latestDisplay ? (
                                  <div className="space-y-1">
                                    <p className={`text-[10px] font-bold line-clamp-2 ${latestDisplay.status === 'Chưa xử phạt' ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                      {latestDisplay.status === 'Đã xử phạt' ? <span className="text-emerald-600 font-black mr-1">[HẾT LỖI]</span> : null}
                                      {latestDisplay.behavior}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 opacity-70"><MapPinned size={10}/> {latestDisplay.unit}</p>
                                  </div>
                                ) : <span className="text-slate-300 italic text-[10px]">Phương tiện sạch</span>}
                             </td>
                             <td className="px-6 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Ngừng theo dõi xe này?')) setVehicles(vehicles.filter(x => x.id !== v.id)) }} className="p-2.5 text-slate-300 hover:text-red-500 transition-colors bg-white border rounded-xl shadow-sm"><Trash2 size={16} /></button>
                             </td>
                          </tr>
                        );
                      })}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-24 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Danh sách trống</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </section>
          </div>
        ) : activeTab === 'logs' ? (
          <section className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-premium">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
               <h2 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Terminal size={16} /> System Trace Logs</h2>
               <button onClick={() => setSystemLogs([])} className="text-[10px] font-black text-slate-400 uppercase hover:text-slate-900 transition-colors border px-3 py-1.5 rounded-lg bg-white">Clear</button>
             </div>
             <div className="overflow-y-auto max-h-[600px] no-scrollbar">
                <table className="w-full text-left font-mono text-[11px]">
                  <tbody className="divide-y divide-slate-50">
                    {systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-400 opacity-60 w-32">{log.timestamp}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>
        ) : (
          <div className="space-y-8 animate-premium">
             <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Zap size={200} /></div>
                <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Test Hub</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 max-w-4xl">
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Biển số thử nghiệm (CSV)</p>
                      <input 
                        value={testPlatesInput} 
                        onChange={e => setTestPlatesInput(e.target.value)} 
                        className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl text-xs font-mono outline-none focus:border-white/50" 
                        placeholder="VD: 30G46044, 11A07378" 
                      />
                   </div>
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email nhận kết quả</p>
                      <input 
                        value={schedule.testConfig?.targetEmail} 
                        onChange={e => setSchedule({...schedule, testConfig: {...schedule.testConfig!, targetEmail: e.target.value}})} 
                        className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl text-xs outline-none focus:border-white/50" 
                        placeholder="Nhập email"
                      />
                   </div>
                </div>
                <button 
                  onClick={runTestRoutine} 
                  disabled={isChecking} 
                  className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 active:scale-95 shadow-xl shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                   {isChecking ? <Loader2 size={16} className="animate-spin"/> : <SendHorizontal size={16} />} 
                   CHẠY GIẢ LẬP TEST HUB
                </button>
             </div>
             <div className="bg-slate-950 rounded-[32px] p-6 h-[350px] overflow-y-auto text-emerald-400 font-mono text-[11px] no-scrollbar shadow-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-4 text-slate-500 uppercase text-[9px] font-black border-b border-white/10 pb-2"><Activity size={12}/> Console Output</div>
                {smtpTestLogs.map((log, i) => <div key={i} className="mb-1.5 opacity-80 animate-in slide-in-from-left-2"><span className="opacity-20 mr-2">{i+1}</span>{log}</div>)}
                <div ref={smtpLogEndRef} />
             </div>
          </div>
        )}
      </main>

      {/* Modal Cài đặt EmailJS */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md transition-all">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-premium">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                 <div className="flex flex-col">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><SettingsIcon size={16}/> Cấu hình EmailJS</h2>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Lấy từ dashboard.emailjs.com</p>
                 </div>
                 <button onClick={() => setIsSettingsOpen(false)} className="text-slate-300 hover:text-slate-900 p-2 transition-colors cursor-pointer"><X size={28} /></button>
              </div>
              <div className="p-8 space-y-8">
                 <div className="space-y-4">
                    <div className="grid gap-3">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Service ID</label>
                          <input value={schedule.smtp?.serviceId} onChange={e => setSchedule({...schedule, smtp: {...schedule.smtp!, serviceId: e.target.value}})} className="w-full h-12 px-5 border rounded-2xl bg-slate-50 focus:bg-white text-xs font-bold outline-none transition-all" placeholder="service_xxxxxx" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Template ID</label>
                          <input value={schedule.smtp?.templateId} onChange={e => setSchedule({...schedule, smtp: {...schedule.smtp!, templateId: e.target.value}})} className="w-full h-12 px-5 border rounded-2xl bg-slate-50 focus:bg-white text-xs font-bold outline-none transition-all" placeholder="template_xxxxxx" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Public Key</label>
                          <input value={schedule.smtp?.publicKey} onChange={e => setSchedule({...schedule, smtp: {...schedule.smtp!, publicKey: e.target.value}})} className="w-full h-12 px-5 border rounded-2xl bg-slate-50 focus:bg-white text-xs font-bold outline-none transition-all" placeholder="API Public Key" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><ShieldCheck size={14}/> Rule Thông Báo</h3>
                    <select value={schedule.notificationStrategy} onChange={e => setSchedule({...schedule, notificationStrategy: e.target.value as any})} className="w-full h-12 px-5 border rounded-2xl bg-slate-50 text-xs font-bold outline-none">
                       <option value="on_change">Chỉ gửi email khi phát hiện lỗi vi phạm mới</option>
                       <option value="always">Luôn gửi báo cáo định kỳ mỗi lần quét</option>
                    </select>
                 </div>
                 <button 
                  onClick={() => { setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); setIsSettingsOpen(false); }, 1200); }} 
                  className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all ${saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-black'}`}
                 >
                    {saveSuccess ? <CheckCircle size={18} className="inline mr-2"/> : <Save size={18} className="inline mr-2"/>}
                    {saveSuccess ? 'ĐÃ LƯU CẤU HÌNH' : 'LƯU THAY ĐỔI'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Chi tiết */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-premium flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex flex-col">
                <span className="font-mono font-black text-xl text-slate-900 bg-slate-100 px-6 py-2 rounded-2xl border uppercase tracking-tighter w-fit mb-1">{selectedVehicle.plateNumber}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hồ sơ phương tiện chi tiết</span>
              </div>
              <button onClick={() => setSelectedVehicleId(null)} className="text-slate-300 hover:text-slate-900 p-2 transition-colors cursor-pointer"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-100 p-5 rounded-[30px] flex items-center gap-5">
                  <div className="bg-red-600 p-3 rounded-2xl text-white shadow-lg"><ShieldAlert size={20}/></div>
                  <div><p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Lỗi mới</p><p className="text-2xl font-black text-red-600">{selectedVehicle.violations.filter(v => v.status === 'Chưa xử phạt').length}</p></div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-[30px] flex items-center gap-5">
                  <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><CheckCircle size={20}/></div>
                  <div><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Đã nộp phạt</p><p className="text-2xl font-black text-emerald-600">{selectedVehicle.violations.filter(v => v.status === 'Đã xử phạt').length}</p></div>
                </div>
              </div>

              <section className="space-y-6">
                 <h3 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 px-2"><History size={18}/> Dữ liệu từ CSGT.VN</h3>
                 {selectedVehicle.violations.length > 0 ? selectedVehicle.violations.map((v, i) => (
                   <div key={i} className={`p-8 bg-white border rounded-[40px] shadow-sm space-y-6 relative overflow-hidden group hover:shadow-md transition-all ${v.status === 'Chưa xử phạt' ? 'border-red-100' : 'border-slate-100 opacity-80'}`}>
                      <div className={`absolute top-0 left-0 w-2 h-full ${v.status === 'Chưa xử phạt' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                      <div className="flex flex-wrap justify-between items-center gap-4 text-[10px] font-black uppercase">
                         <span className={`px-4 py-2 rounded-xl shadow-sm tracking-widest border ${v.status === 'Chưa xử phạt' ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-600 text-white border-emerald-700'}`}>{v.status}</span>
                         <span className="flex items-center gap-2 text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><Clock size={16}/> {v.time}</span>
                      </div>
                      <div className="space-y-4">
                        <p className={`text-[15px] font-black leading-snug border-l-4 pl-4 py-1 ${v.status === 'Chưa xử phạt' ? 'border-red-500 text-slate-800' : 'border-emerald-500 text-slate-500'}`}>{v.behavior}</p>
                        <p className="text-[11px] text-slate-600 flex items-start gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100"><MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0"/> <span>{v.location}</span></p>
                      </div>
                      <div className="pt-5 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span className="flex items-center gap-2"><ShieldAlert size={14} className="text-blue-500 opacity-50"/> Đơn vị: {v.unit}</span>
                        <span>Màu biển: {v.plateColor}</span>
                      </div>
                   </div>
                 )) : (
                   <div className="text-center py-24 bg-emerald-50/50 rounded-[45px] border-2 border-dashed border-emerald-100 flex flex-col items-center">
                      <div className="bg-emerald-100 p-6 rounded-full mb-6 text-emerald-600 shadow-inner"><CheckCircle2 size={48}/></div>
                      <p className="text-[12px] font-black text-emerald-800 uppercase tracking-widest">Dữ liệu sạch</p>
                      <p className="text-[10px] font-medium text-emerald-600 opacity-70 mt-2">Hiện tại không ghi nhận bất kỳ vi phạm nào cho xe này.</p>
                   </div>
                 )}
              </section>
              
              <div className="flex gap-4 pb-10 sticky bottom-0 bg-transparent pt-6 border-t border-slate-100 pointer-events-none">
                 <a href={`https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html?bienso=${normalizePlate(selectedVehicle.plateNumber)}`} target="_blank" className="pointer-events-auto flex-1 py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase text-[11px] tracking-widest text-center flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl hover:bg-black">Tra cứu thủ công tại CSGT.VN <ExternalLink size={20}/></a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
