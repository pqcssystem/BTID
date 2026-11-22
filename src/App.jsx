import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Settings, Database, AlertCircle, Wrench, FileText, 
  Menu, X, Moon, Sun, Plus, Search, MapPin, Camera, Save, 
  Trash2, Edit, CheckCircle, Clock, Download, Printer, Users, Building, LogOut, UploadCloud,
  Eye, EyeOff, ChevronRight, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// --- PERMANENT DATABASE CONFIGURATION ---
const SUPABASE_API_URL = 'https://arxgvczikhndgetkfdrv.supabase.co/rest/v1/';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FvZweQRCtcfMzLF1wX0wvA_VSywcHGs';

let isOfflineMode = false;

const handleOfflineRequest = (endpoint, method, data) => {
  const urlObj = new URL('http://dummy.com/' + endpoint);
  const table = urlObj.pathname.substring(1);
  const search = urlObj.search;
  
  let db = JSON.parse(localStorage.getItem('PQCS_LocalDB')) || {
    inspectors: [{ id: 1, name: 'Administrator', initial: 'ADM', authority: 'Admin', password: 'admin' }],
    projects: [], buildings: [], defects: [], actions: []
  };

  if (!db[table]) db[table] = [];

  if (method === 'GET') {
    let result = [...db[table]];
    if (search.includes('name=eq.') && search.includes('password=eq.')) {
       const nameMatch = search.match(/name=eq\.([^&]+)/);
       const passMatch = search.match(/password=eq\.([^&]+)/);
       if (nameMatch && passMatch) {
           const n = decodeURIComponent(nameMatch[1]);
           const p = decodeURIComponent(passMatch[1]);
           result = result.filter(i => i.name === n && i.password === p);
       }
    }
    return result;
  }

  if (method === 'POST') {
    const newItem = { id: Date.now(), created_at: new Date().toISOString(), ...data };
    db[table].push(newItem);
    localStorage.setItem('PQCS_LocalDB', JSON.stringify(db));
    return [newItem];
  }

  if (method === 'PATCH') {
    const idMatch = search.match(/id=eq\.(\d+)/);
    if (idMatch) {
      const targetId = String(idMatch[1]);
      let updatedItem = null;
      db[table] = db[table].map(item => {
        if (String(item.id) === targetId) {
          updatedItem = { ...item, ...data };
          return updatedItem;
        }
        return item;
      });
      localStorage.setItem('PQCS_LocalDB', JSON.stringify(db));
      return updatedItem ? [updatedItem] : [];
    }
  }

  if (method === 'DELETE') {
    const idMatch = search.match(/id=eq\.(\d+)/);
    const defectIdMatch = search.match(/defect_id=eq\.(\d+)/);
    const projIdMatch = search.match(/project_id=eq\.(\d+)/);
    
    if (idMatch) {
      db[table] = db[table].filter(item => String(item.id) !== String(idMatch[1]));
    } else if (defectIdMatch) {
      db[table] = db[table].filter(item => String(item.defect_id) !== String(defectIdMatch[1]));
    } else if (projIdMatch) {
      db[table] = db[table].filter(item => String(item.project_id) !== String(projIdMatch[1]));
    }
    localStorage.setItem('PQCS_LocalDB', JSON.stringify(db));
    return [];
  }
  return null;
};

// --- API SUPABASE FETCH HELPER ---
const fetchSupabase = async (endpoint, method = 'GET', data = null) => {
  if (isOfflineMode) return handleOfflineRequest(endpoint, method, data);

  const url = `${SUPABASE_API_URL}${endpoint}`;
  const headers = { 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, 'Content-Type': 'application/json' };
  if (method === 'POST' || method === 'PATCH') headers['Prefer'] = 'return=representation';
  
  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    let parsedData = null;
    if (text) { try { parsedData = JSON.parse(text); } catch(e) { parsedData = text; } }
    if (!response.ok) throw new Error(parsedData?.message || parsedData?.error || text || response.statusText || 'Gagal terhubung ke database');
    if (response.status === 204) return null; 
    return parsedData;
  } catch (error) {
    console.warn("Supabase fetch failed, switching to offline local storage mode. Error:", error.message);
    isOfflineMode = true;
    return handleOfflineRequest(endpoint, method, data);
  }
};

// --- MOCK DATA & INITIAL STATE ---
const INITIAL_DATA = { inspectors: [], projects: [], buildings: [], defects: [], actions: [] };

// --- DICTIONARY KATEGORI DEFECT ---
const DEFECT_DICTIONARY = {
  'Struktur': [
    'Posisi titik pancang meleset', 'Kedalaman tidak sesuai spesifikasi', 'Daya dukung tidak tercapai', 'Retak / pecah pada tiang pancang saat pemancangan',
    'Sambungan tiang pancang tidak presisi', 'Las tidak full penetration', 'Kepala tiang pecah saat cut-off', 'Dimensi pondasi tidak sesuai gambar',
    'Elevasi pondasi tidak rata', 'Mutu beton kurang (keropos / honeycomb)', 'Tulangan kurang', 'Tidak ada lantai kerja', 'lantai kerja tipis',
    'Penurunan tanah (settlement)', 'Beton keropos (honeycomb)', 'Retak struktural (structural crack)', 'Retak rambut (hairline crack)',
    'Tulangan terlihat / selimut beton kurang', 'Pembesian tidak sesuai detail (kurang sengkang / salah jarak)', 'Slab melendut', 'Level lantai tidak rata',
    'Cold joint karena pengecoran terputus', 'Anak tangga beda tinggi', 'Kemiringan tangga tidak sesuai', 'Retak di bordes'
  ],
  'Arsitektur': [
    'Dinding retak diagonal', 'Dinding bergelombang (tidak rata)', 'Plesteran kopong', 'Sudut dinding tidak siku', 'Perbedaan ketebalan plester',
    'Keramik popping / meledak', 'Nat retak', 'Keramik tidak rata (lipping)', 'Pola lantai tidak simetris', 'Hollow tile (kopong saat diketuk)',
    'Pintu Tidak presisi / tidak siku', 'Jendela Tidak presisi / tidak siku', 'Pintu seret / tidak menutup rapat', 'Engsel berkarat',
    'Air masuk dari celah kusen', 'Sealant retak', 'Plafon retak di joint', 'Plafon melendut', 'Bekas sambungan plafond terlihat', 'Bocor dari atap',
    'Warna cat belang', 'Cat mengelupas', 'Permukaan bergelombang', 'Alkali attack', 'Atap Bocor di flashing', 'Genteng bergeser',
    'Rangka atap tidak lurus', 'Sekrup atap kurang', 'Sekrup atap salah posisi'
  ],
  'MEP': [
    'Kebocoran pipa air bersih', 'Tekanan air kecil', 'Sambungan pipa rembes', 'Pipa air kotor tersumbat', 'Backflow', 'Floor drain tidak turun (air menggenang)',
    'Closet goyang', 'Sealant wastafel bocor', 'Bau dari floor drain', 'Stop kontak tidak berfungsi', 'MCB sering trip', 'Jalur kabel tidak sesuai SLD',
    'Grounding tidak ada', 'Panel box tidak rapi', 'Saklar tidak sejajar', 'Pipa AC bocor', 'Drain AC menetes', 'Outdoor unit berisik', 'Insulasi pipa tidak rapi'
  ],
  'Landscape': [
    'Tanaman mati', 'Rumput tidak tumbuh merata', 'Sistem irigasi bocor', 'Genangan air di taman', 'Batu sikat / paving turun', 'Pohon miring',
    'Tanah ambles', 'Pemadatan kurang'
  ],
  'Infrastructure': [
    'Retak pada rigid pavement', 'Aspal bergelombang', 'Paving block turun', 'Drainase tidak mengalir', 'Saluran mampet', 'Kemiringan tidak cukup',
    'Tutup U-ditch pecah', 'Tekanan air tidak merata', 'Manhole bocor', 'Septic tank rembes', 'Kabel ducting amblas', 'Street light tidak berfungsi',
    'Box panel outdoor kemasukan air'
  ],
  'Interior': [ 'Lain-lain' ], 
  'General': [ 'Lain-lain' ]
};

// --- UTILS: Compressing Image to Base64 & Format to JPEG ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      }
    }
  });
};

const generateMarkedImage = (imageUrl, xPercent, yPercent, color = 'red') => {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve(null);
    const img = new Image(); img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const x = (xPercent / 100) * canvas.width; const y = (yPercent / 100) * canvas.height;
      const radiusOuter = Math.max(canvas.width * 0.015, 12); const radiusInner = Math.max(canvas.width * 0.010, 8);
      ctx.beginPath(); ctx.arc(x, y, radiusOuter, 0, 2 * Math.PI); ctx.fillStyle = 'white'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, radiusInner, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
};

const calculateSlaStatus = (defect_date, sla_days, action_date) => {
  if (sla_days === undefined || sla_days === null || sla_days === '' || !defect_date) return { isLate: false, text: '-', style: '' };
  const start = new Date(defect_date); start.setHours(0,0,0,0);
  const end = new Date(action_date && action_date !== '-' ? action_date : new Date()); end.setHours(0,0,0,0);
  const diffTime = end - start;
  const durasiPerbaikan = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const slaRemaining = parseInt(sla_days) - durasiPerbaikan;
  if (slaRemaining < 0) return { isLate: true, text: `${slaRemaining} Hari`, style: 'text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block' };
  return { isLate: false, text: `+${slaRemaining} Hari`, style: 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block' };
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [db, setDb] = useState(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('PQCS_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const loadDB = async () => {
      setIsLoading(true);
      try {
        const inspectors = (await fetchSupabase('inspectors?select=*')) || [];
        const projects = (await fetchSupabase('projects?select=*')) || [];
        const buildings = (await fetchSupabase('buildings?select=*')) || [];
        const defects = (await fetchSupabase('defects?select=*')) || [];
        const actions = (await fetchSupabase('actions?select=*')) || [];
        setDb({ inspectors, projects, buildings, defects, actions });
      } catch (error) {
        alert("Gagal memuat data awal dari Supabase. Pastikan RLS telah di-disable pada tabel!\n\nError: " + error.message);
      } finally { setIsLoading(false); }
    };
    if (currentUser) loadDB();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('PQCS_theme', darkMode ? 'dark' : 'light');
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  const handleLogin = (name, role, userId) => setCurrentUser({ name: name || 'Administrator', role: role || 'Admin', id: userId || 99 });
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('HQCS_SavedUser'); sessionStorage.removeItem('HQCS_TempAuth'); };

  if (!currentUser) return <LoginView onLogin={handleLogin} darkMode={darkMode} toggleTheme={toggleTheme} />;
  const primaryColor = "bg-gradient-to-r from-[#0F4C81] to-[#1a5b96]";
  const primaryText = "text-[#0F4C81]";

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} flex transition-colors duration-300 selection:bg-blue-200 selection:text-blue-900`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeMenu={activeMenu} setActiveMenu={setActiveMenu} primaryColor={primaryColor} darkMode={darkMode} currentUser={currentUser} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b p-4 flex justify-between items-center z-10 print:hidden shadow-sm transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden transition-colors focus:ring-2 focus:ring-[#0F4C81] outline-none"><Menu size={22} className="text-slate-600 dark:text-slate-300"/></button>
            <div className="hidden sm:flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-[#0F4C81] flex items-center justify-center text-white shadow-inner"><Building size={16} /></div>
               <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">PQCS <span className="text-xs font-medium text-slate-400 align-top ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">v1.1</span></h1>
            </div>
            {isLoading && <span className="ml-4 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse"><Clock size={12}/> Sinkronisasi Cloud...</span>}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-[#0F4C81] outline-none text-slate-600 dark:text-slate-300">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{currentUser.name}</p>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0F4C81] dark:text-blue-300 font-bold shadow-sm hidden sm:flex">{currentUser.name.charAt(0).toUpperCase()}</div>
              <button onClick={handleLogout} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors focus:ring-2 focus:ring-rose-500 outline-none group" title="Logout"><LogOut size={18} className="group-hover:scale-110 transition-transform"/></button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 relative scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6 print:max-w-full animate-in fade-in duration-500">
            {activeMenu === 'dashboard' && <DashboardView db={db} primaryColor={primaryText} darkMode={darkMode} />}
            {activeMenu === 'data_awal' && <DataMasterView db={db} setDb={setDb} darkMode={darkMode} currentUser={currentUser} />}
            {activeMenu === 'input_defect' && <InputDefectView db={db} setDb={setDb} currentUser={currentUser} darkMode={darkMode} primaryColor={primaryColor} />}
            {activeMenu === 'action' && <ActionView db={db} setDb={setDb} currentUser={currentUser} darkMode={darkMode} />}
            {activeMenu === 'report' && <ReportView db={db} darkMode={darkMode} />}
            {activeMenu === 'settings' && <SettingsView setDb={setDb} darkMode={darkMode} db={db} currentUser={currentUser} setCurrentUser={setCurrentUser} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- LOGIN COMPONENT ---
function LoginView({ onLogin, darkMode, toggleTheme }) {
  const [inspectorsList, setInspectorsList] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const fetchInspectors = async () => {
      try {
        const result = await fetchSupabase('inspectors?select=id,name');
        if (result && Array.isArray(result)) setInspectorsList(result);
      } catch (err) { console.error(err); }
    };
    fetchInspectors();
  }, []);

  useEffect(() => {
    const tempAuth = sessionStorage.getItem('HQCS_TempAuth');
    const savedUser = localStorage.getItem('HQCS_SavedUser');
    let credentials = null;
    if (tempAuth) { try { credentials = JSON.parse(tempAuth); } catch(e) {} } 
    else if (savedUser) { try { credentials = JSON.parse(savedUser); setRememberMe(true); } catch(e) {} }

    if (credentials && credentials.username && credentials.password) {
      setUsername(credentials.username); setPassword(credentials.password);
      const autoLogin = async () => {
        setIsAuthenticating(true);
        try {
          const queryUrl = `inspectors?select=*&name=eq.${encodeURIComponent(credentials.username)}&password=eq.${encodeURIComponent(credentials.password)}`;
          const result = await fetchSupabase(queryUrl);
          if (result && result.length > 0) {
            const user = result[0];
            sessionStorage.setItem('HQCS_TempAuth', JSON.stringify({ username: credentials.username, password: credentials.password }));
            onLogin(user.name, user.authority || 'Admin', user.id);
          } else {
            localStorage.removeItem('HQCS_SavedUser');
            sessionStorage.removeItem('HQCS_TempAuth');
          }
        } catch(err) { console.error(err); } finally { setIsAuthenticating(false); }
      };
      autoLogin();
    }
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { alert("Nama User dan Password wajib diisi!"); return; }
    setIsAuthenticating(true);
    try {
      const queryUrl = `inspectors?select=*&name=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}`;
      const result = await fetchSupabase(queryUrl);
      if (result && result.length > 0) {
        const user = result[0];
        if (rememberMe) localStorage.setItem('HQCS_SavedUser', JSON.stringify({ username, password }));
        else localStorage.removeItem('HQCS_SavedUser');
        sessionStorage.setItem('HQCS_TempAuth', JSON.stringify({ username, password }));
        onLogin(user.name, user.authority || 'Admin', user.id);
      } else { alert("Gagal Login: Nama User atau Password tidak cocok pada database!"); }
    } catch(err) { alert("Gagal menghubungi database!"); } 
    finally { setIsAuthenticating(false); }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${darkMode ? 'from-slate-800 via-slate-900 to-black' : 'from-blue-50 via-slate-50 to-slate-100'}`}>
      <div className="absolute top-6 right-6">
        <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-white/20 dark:hover:bg-black/20 backdrop-blur-sm transition-all shadow-sm"><Sun size={20} className={darkMode ? 'text-slate-300' : 'text-slate-600'} /></button>
      </div>
      <div className={`w-full max-w-[420px] p-8 md:p-10 rounded-[2rem] shadow-2xl ${darkMode ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-white'} backdrop-blur-xl animate-in zoom-in-95 duration-500`}>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#1e6baf] text-white mb-6 shadow-lg shadow-blue-900/20 ring-4 ring-white dark:ring-slate-800 transform rotate-3"><Building size={36} className="-rotate-3"/></div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white mb-2">Welcome to PQCS</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Project Quality Control System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 pl-1">Nama User</label>
            <select className={`w-full p-3.5 rounded-xl border-2 focus:ring-4 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] outline-none transition-all cursor-pointer font-medium appearance-none ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} value={username} onChange={(e) => setUsername(e.target.value)}>
              <option value="" disabled>-- Pilih Akun Inspector --</option>
              {inspectorsList.map(ins => <option key={ins.id} value={ins.name}>{ins.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 pl-1">Password</label>
            <div className="relative group">
              <input type={showPassword ? "text" : "password"} className={`w-full p-3.5 rounded-xl border-2 focus:ring-4 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] outline-none transition-all font-medium ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`} placeholder="Masukkan sandi..." value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors outline-none">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2 pl-1">
            <div className="relative flex items-start"><div className="flex items-center h-5"><input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-[#0F4C81] bg-slate-100 border-slate-300 rounded focus:ring-[#0F4C81] dark:focus:ring-[#0F4C81] dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 transition-all cursor-pointer" /></div></div>
            <label htmlFor="rememberMe" className="text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">Ingat saya di perangkat ini</label>
          </div>

          <button type="submit" disabled={isAuthenticating} className="w-full py-4 px-4 mt-4 bg-gradient-to-r from-[#0F4C81] to-[#165a99] hover:from-[#0c3d68] hover:to-[#11497c] text-white rounded-xl transition-all shadow-lg shadow-blue-900/30 font-bold text-base disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]">
            {isAuthenticating ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18}/> Authenticating...</span> : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- SIDEBAR COMPONENT ---
function Sidebar({ isOpen, setIsOpen, activeMenu, setActiveMenu, primaryColor, darkMode, currentUser }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: Home },
    { id: 'data_awal', label: 'Project & Buildings', icon: Database },
    { id: 'input_defect', label: 'Input Defect Baru', icon: AlertCircle },
    { id: 'action', label: 'Action & Perbaikan', icon: Wrench },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'settings', label: 'Pengaturan Sistem', icon: Settings },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden print:hidden transition-opacity" onClick={() => setIsOpen(false)} />}
      <div className={`fixed md:static inset-y-0 left-0 z-30 w-[260px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#0b3a63] text-white'} border-r transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden flex flex-col shadow-2xl md:shadow-none`}>
        <div className={`h-[72px] shrink-0 flex items-center px-6 border-b ${darkMode ? 'border-slate-800' : 'border-blue-900/50'}`}>
          <div className="flex items-center gap-3 text-white"><div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10"><Building size={20} className={darkMode ? 'text-blue-400' : 'text-white'}/></div><span className="text-xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">PQCS</span></div>
          <button onClick={() => setIsOpen(false)} className="ml-auto text-slate-400 hover:text-white md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 py-6 scrollbar-hide">
          <div className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest mb-3 px-3">Menu Navigasi</div>
          <nav className="space-y-1.5">
            {menuItems.map(menu => {
              const isDisabled = menu.id === 'settings' && currentUser?.role !== 'Admin';
              const isActive = activeMenu === menu.id;
              return (
                <button key={menu.id} disabled={isDisabled} onClick={() => { if(!isDisabled) { setActiveMenu(menu.id); if(window.innerWidth < 768) setIsOpen(false); } }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 outline-none group ${isDisabled ? 'opacity-40 cursor-not-allowed' : isActive ? (darkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50 shadow-inner' : 'bg-white/15 text-white font-bold border border-white/10 shadow-inner') : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-blue-100/70 hover:bg-white/5 hover:text-white')}`}>
                  <div className="flex items-center gap-3.5"><menu.icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} /><span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{menu.label}</span></div>
                  {isActive && <ChevronRight size={14} className="opacity-50" />}
                </button>
              );
            })}
          </nav>
        </div>
        <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-blue-900/50'} text-center shrink-0`}><p className={`text-[10px] font-medium tracking-wider ${darkMode ? 'text-slate-500' : 'text-blue-200/50'}`}>© 2026 PQCS Enterprise</p></div>
      </div>
    </>
  );
}

// --- DASHBOARD VIEW ---
function DashboardView({ db, darkMode }) {
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const filteredDefects = selectedProjectId === 'ALL' 
    ? (db.defects || []) 
    : (db.defects || []).filter(d => {
        const bldg = (db.buildings || []).find(b => b.id === d.building_id);
        return bldg && bldg.project_id === parseInt(selectedProjectId);
      });

  const validDefectIds = filteredDefects.map(d => d.id);
  const filteredActions = (db.actions || []).filter(a => validDefectIds.includes(a.defect_id));

  const total = filteredDefects.length;
  const inProgressRaw = filteredActions.filter(a => a.status === 'Proses Perbaikan').map(a => a.defect_id);
  const closedRaw = filteredActions.filter(a => a.status === 'Close').map(a => a.defect_id);
  
  const uniqueClosed = [...new Set(closedRaw)].length;
  const uniqueInProgress = [...new Set(inProgressRaw)].filter(id => ![...new Set(closedRaw)].includes(id)).length;
  const actualOpen = total - uniqueInProgress - uniqueClosed;

  const stats = [
    { label: 'Total Defect Terdata', value: total, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', icon: AlertCircle, bgIcon: 'bg-blue-100 text-blue-600' },
    { label: 'Status Open', value: actualOpen, color: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', icon: AlertCircle, bgIcon: 'bg-rose-100 text-rose-600' },
    { label: 'Proses Perbaikan', value: uniqueInProgress, color: 'from-amber-400 to-amber-500', shadow: 'shadow-amber-500/20', icon: Clock, bgIcon: 'bg-amber-100 text-amber-600' },
    { label: 'Selesai (Closed)', value: uniqueClosed, color: 'from-emerald-400 to-emerald-500', shadow: 'shadow-emerald-500/20', icon: CheckCircle, bgIcon: 'bg-emerald-100 text-emerald-600' },
  ];

  const getDefectStatus = (defectId) => {
    const actions = filteredActions.filter(a => a.defect_id === defectId);
    if(actions.length === 0) return 'Open';
    return actions[actions.length - 1].status;
  };

  const categories = { 'Minor': 0, 'Major': 0, 'Hard (NCR)': 0 };
  let slaOnTime = 0; let slaLate = 0;
  const disciplineSla = {};
  
  const disciplines = filteredDefects.reduce((acc, curr) => { 
    if (!acc[curr.discipline]) { acc[curr.discipline] = { name: curr.discipline, total: 0, open: 0, in_progress: 0, close: 0 }; disciplineSla[curr.discipline] = { name: curr.discipline, onTime: 0, late: 0 }; }
    acc[curr.discipline].total += 1;
    if(curr.defect_category) categories[curr.defect_category] = (categories[curr.defect_category] || 0) + 1;
    const status = getDefectStatus(curr.id);
    if (status === 'Open') acc[curr.discipline].open += 1; else if (status === 'Proses Perbaikan') acc[curr.discipline].in_progress += 1; else if (status === 'Close') acc[curr.discipline].close += 1;
    
    const actions = filteredActions.filter(a => a.defect_id === curr.id);
    const lastActionDate = actions.length > 0 ? actions[actions.length - 1].action_date : '-';
    const slaInfo = calculateSlaStatus(curr.defect_date, curr.sla_days, lastActionDate);
    if (slaInfo.isLate) { slaLate++; disciplineSla[curr.discipline].late++; } else { slaOnTime++; disciplineSla[curr.discipline].onTime++; }
    return acc; 
  }, {});

  const discArray = Object.values(disciplines).sort((a, b) => b.total - a.total);
  const slaDiscArray = Object.values(disciplineSla).sort((a, b) => (b.onTime + b.late) - (a.onTime + a.late));

  const statusChartData = [
    { name: 'Open', value: actualOpen, color: '#f43f5e' },
    { name: 'Proses Perbaikan', value: uniqueInProgress, color: '#f59e0b' },
    { name: 'Selesai (Closed)', value: uniqueClosed, color: '#10b981' },
  ];

  const slaChartData = [
    { name: 'On Time', value: slaOnTime, color: '#10b981' },
    { name: 'Overdue (Terlambat)', value: slaLate, color: '#f43f5e' },
  ];

  const selectedProjectName = selectedProjectId === 'ALL' ? 'SELURUH PROYEK' : (db.projects || []).find(p => p.id === parseInt(selectedProjectId))?.project_name;

  const handlePrint = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      const element = document.getElementById('dashboard-printable-area');
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `Dashboard_PQCS_${selectedProjectName?.replace(/\s+/g, '_') || 'ALL'}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, width: 1122, windowWidth: 1122 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      const execute = (h2p) => h2p().set(opt).from(element).save().then(() => setIsExportingPDF(false));
      if (window.html2pdf) {
        execute(window.html2pdf);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => execute(window.html2pdf);
        document.head.appendChild(script);
      }
    }, 450);
  };

  return (
    <div
      id="dashboard-printable-area"
      style={isExportingPDF ? { width: '1122px', height: '775px', overflow: 'hidden', backgroundColor: '#ffffff', padding: '12px 16px', boxSizing: 'border-box' } : undefined}
      className={isExportingPDF ? 'flex flex-col justify-between text-slate-900' : 'space-y-6'}
    >
      <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : 'p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
        <div>
          <h2 className={`${isExportingPDF ? 'text-lg' : 'text-2xl'} font-black tracking-tight text-slate-800 dark:text-white`}>
            DASHBOARD OVERVIEW — PROJECT QUALITY CONTROL SYSTEM
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Proyek: <span className="font-bold text-[#0F4C81] dark:text-blue-400">{selectedProjectName}</span> • Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>
        {!isExportingPDF && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print:hidden">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
            >
              <option value="ALL">Seluruh Proyek ({(db.projects || []).length})</option>
              {(db.projects || []).map(p => (
                <option key={p.id} value={p.id}>{p.project_name}</option>
              ))}
            </select>
            <button
              onClick={handlePrint}
              disabled={isExportingPDF}
              className="px-4 py-2.5 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-60"
            >
              <Printer size={16} /> Print Dashboard
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid ${isExportingPDF ? 'grid-cols-4 gap-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'}`}>
        {stats.map((s, idx) => (
          <div key={idx} className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : `p-6 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-lg ${s.shadow}`} flex items-center justify-between`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{s.label}</p>
              <p className={`${isExportingPDF ? 'text-2xl' : 'text-3xl'} font-black text-slate-800 dark:text-white`}>{s.value}</p>
            </div>
            <div className={`${isExportingPDF ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'} flex items-center justify-center ${s.bgIcon}`}>
              <s.icon size={isExportingPDF ? 18 : 24} />
            </div>
          </div>
        ))}
      </div>

      {/* Severity Summary */}
      <div className={`grid ${isExportingPDF ? 'grid-cols-3 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-5'}`}>
        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'px-4 py-2 rounded-xl border border-slate-300' : 'p-5 rounded-2xl border border-slate-200 dark:border-slate-700'} flex items-center justify-between`}>
          <div>
            <span className="text-[11px] font-bold uppercase text-blue-600">Kategori Minor</span>
            <p className={`${isExportingPDF ? 'text-lg' : 'text-2xl'} font-black`}>{categories['Minor'] || 0}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">Minor</span>
        </div>
        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'px-4 py-2 rounded-xl border border-slate-300' : 'p-5 rounded-2xl border border-slate-200 dark:border-slate-700'} flex items-center justify-between`}>
          <div>
            <span className="text-[11px] font-bold uppercase text-amber-600">Kategori Major</span>
            <p className={`${isExportingPDF ? 'text-lg' : 'text-2xl'} font-black`}>{categories['Major'] || 0}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600">Major</span>
        </div>
        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'px-4 py-2 rounded-xl border border-slate-300' : 'p-5 rounded-2xl border border-slate-200 dark:border-slate-700'} flex items-center justify-between`}>
          <div>
            <span className="text-[11px] font-bold uppercase text-rose-600">Hard (NCR)</span>
            <p className={`${isExportingPDF ? 'text-lg' : 'text-2xl'} font-black`}>{categories['Hard (NCR)'] || 0}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600">NCR</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={`grid ${isExportingPDF ? 'grid-cols-2 gap-3' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : 'p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
          <h3 className={`${isExportingPDF ? 'text-xs mb-1' : 'text-base mb-4'} font-black text-slate-800 dark:text-white`}>Status Penyelesaian Defect</h3>
          <div className={isExportingPDF ? 'h-44' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={isExportingPDF ? 35 : 55} outerRadius={isExportingPDF ? 58 : 85} paddingAngle={4} isAnimationActive={!isExportingPDF}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: isExportingPDF ? '10px' : '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : 'p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
          <h3 className={`${isExportingPDF ? 'text-xs mb-1' : 'text-base mb-4'} font-black text-slate-800 dark:text-white`}>Kepatuhan Target SLA</h3>
          <div className={isExportingPDF ? 'h-44' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slaChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={isExportingPDF ? 35 : 55} outerRadius={isExportingPDF ? 58 : 85} paddingAngle={4} isAnimationActive={!isExportingPDF}>
                  {slaChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: isExportingPDF ? '10px' : '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : 'p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
          <h3 className={`${isExportingPDF ? 'text-xs mb-1' : 'text-base mb-4'} font-black text-slate-800 dark:text-white`}>Temuan per Disiplin</h3>
          <div className={isExportingPDF ? 'h-44' : 'h-72'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discArray}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: isExportingPDF ? '10px' : '12px' }} />
                <Bar dataKey="open" name="Open" stackId="a" fill="#f43f5e" isAnimationActive={!isExportingPDF} />
                <Bar dataKey="in_progress" name="Proses" stackId="a" fill="#f59e0b" isAnimationActive={!isExportingPDF} />
                <Bar dataKey="close" name="Close" stackId="a" fill="#10b981" isAnimationActive={!isExportingPDF} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-800 ${isExportingPDF ? 'p-3 rounded-xl border border-slate-300' : 'p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
          <h3 className={`${isExportingPDF ? 'text-xs mb-1' : 'text-base mb-4'} font-black text-slate-800 dark:text-white`}>SLA per Disiplin</h3>
          <div className={isExportingPDF ? 'h-44' : 'h-72'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaDiscArray}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: isExportingPDF ? '10px' : '12px' }} />
                <Bar dataKey="onTime" name="On Time" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={!isExportingPDF} />
                <Bar dataKey="late" name="Overdue" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={!isExportingPDF} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SHARED PRINT PREVIEW MODAL (NCR FORM & DEFECT FORM) ---
function DocumentFormPreviewModal({ data, db, onClose }) {
  const [isExporting, setIsExporting] = useState(false);

  if (!data) return null;

  const isNCR = data.defect_category === 'Hard (NCR)';
  const bldg = (db.buildings || []).find(b => b.id === data.building_id);
  const proj = bldg ? (db.projects || []).find(p => p.id === bldg.project_id) : (db.projects || []).find(p => p.id === data.project_id);
  const fp = bldg && bldg.floorplans ? bldg.floorplans.find(f => String(f.id) === String(data.floorplan_id)) : null;

  const projectName = data.project_name || (proj ? proj.project_name : '-');
  const buildingName = data.building_name || (bldg ? bldg.building_name : '-');
  const floorplanName = data.floorplan_name || (fp ? fp.name.replace(/\.[^/.]+$/, "") : '-');
  const floorplanImage = data.floorplan_image || data.marked_floorplan_image || (fp ? fp.image : null);

  const actionsForDefect = (db.actions || []).filter(a => a.defect_id === data.id);
  const latestAction = actionsForDefect.length > 0 ? actionsForDefect[actionsForDefect.length - 1] : null;

  const currentStatus = data.current_status || (latestAction ? latestAction.status : 'Open');
  const closingDate = data.action_date || (latestAction ? latestAction.action_date : '-');
  const actionNote = data.action_note !== undefined ? data.action_note : (latestAction ? latestAction.action_note : '');
  const actionPhotos = data.action_photos || (latestAction ? latestAction.action_photo : []) || [];
  const defectPhotos = data.defect_photo || [];

  const reporterName = (db.inspectors || []).find(i => String(i.id) === String(data.inspector_id))?.name || '-';
  const closingInspectorId = data.inspector_edit || (latestAction ? latestAction.inspector_edit : null);
  const closingInspectorName = (db.inspectors || []).find(i => String(i.id) === String(closingInspectorId))?.name || '-';

  const slaInfo = calculateSlaStatus(data.defect_date, data.sla_days, closingDate);

  const handlePrintPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      const element = document.getElementById('pqcs-doc-form-printable');
      const prefix = isNCR ? 'NCR_FORM' : 'DEFECT_FORM';
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `${prefix}_${data.defect_code || 'Report'}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          width: 794,
          height: 1122,
          windowWidth: 794,
          windowHeight: 1122,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ['px_scaling'] }
      };
      const execute = (h2p) => {
        h2p().set(opt).from(element).save().then(() => setIsExporting(false));
      };
      if (window.html2pdf) {
        execute(window.html2pdf);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => execute(window.html2pdf);
        document.head.appendChild(script);
      }
    }, 350);
  };

  // Palet Warna & Tipografi sesuai gambar lampiran (image_8c85c8.png) untuk NCR & DEFECT FORM
  const lightBlueBar = '#D9E8F6';
  const borderColor = '#0F172A';

  const labelCellStyle = {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontWeight: 700,
    fontSize: '8.5pt',
    padding: '3.5px 8px',
    borderRight: `1.2px solid ${borderColor}`,
    borderBottom: `1.2px solid ${borderColor}`,
    textTransform: 'uppercase',
    lineHeight: '1.2'
  };

  const valueCellStyle = {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontWeight: 600,
    fontSize: '8.5pt',
    padding: '3.5px 8px',
    borderBottom: `1.2px solid ${borderColor}`,
    lineHeight: '1.2'
  };

  const sectionBannerStyle = {
    backgroundColor: lightBlueBar,
    color: '#0F172A',
    fontWeight: 700,
    fontSize: '9pt',
    textAlign: 'center',
    padding: '4px 8px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    borderBottom: `1.2px solid ${borderColor}`
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm print:hidden shrink-0 z-10">
        <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
          <X size={18} strokeWidth={2.5}/> Tutup Preview
        </button>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${isNCR ? 'bg-blue-100 text-[#0F4C81]' : 'bg-blue-100 text-blue-800'}`}>
            {isNCR ? 'NCR FORM (A4)' : 'DEFECT FORM (A4)'}
          </span>
          <button onClick={handlePrintPDF} disabled={isExporting} className="px-5 py-2.5 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all disabled:opacity-70">
            <Printer size={18} strokeWidth={2.5}/> {isExporting ? 'Mengekspor PDF...' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 print:p-0 flex justify-center items-start">
        {/* Kertas A4 (794px x 1122px @ 96dpi) fit 1 halaman A4 tanpa terpotong */}
        <div
          id="pqcs-doc-form-printable"
          style={{
            width: '794px',
            height: '1122px',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            fontFamily: 'Arial, Helvetica, sans-serif',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '18px 28px',
            overflow: 'hidden'
          }}
          className="shadow-2xl print:shadow-none shrink-0"
        >
          {isNCR ? (
            /* --- TATA LETAK PERSIS SESUAI GAMBAR LAMPIRAN NCR (image_8c85c8.png) --- */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Top Left Small Header */}
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#1E293B', marginBottom: '-4px' }}>
                PROJECT QUALITY CONTROL SYSTEM
              </div>

              {/* Main Banner Title */}
              <div style={{
                border: `1.5px solid ${borderColor}`,
                backgroundColor: lightBlueBar,
                color: '#0F172A',
                padding: '6px 12px',
                textAlign: 'center',
                fontSize: '14pt',
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>
                NON CONFORMANCE REPORT (NCR)
              </div>

              {/* ID RECORD & PROJECT NAME Full-Width Table */}
              <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...labelCellStyle, width: '24%' }}>ID RECORD</td>
                      <td style={{ ...valueCellStyle, fontWeight: 700 }}>{data.defect_code || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ ...labelCellStyle, borderBottom: 'none' }}>PROJECT NAME</td>
                      <td style={{ ...valueCellStyle, borderBottom: 'none', fontWeight: 700 }}>{projectName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ROW 2: FINDING (LEFT) & DEFECT LOCATION (RIGHT) */}
              <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                {/* LEFT: FINDING */}
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>FINDING</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ ...labelCellStyle, width: '49%' }}>OBJECT / BUILDING</td>
                        <td style={valueCellStyle}>{buildingName}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>DICIPLINE</td>
                        <td style={valueCellStyle}>{data.discipline || '-'}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>FINDING CATEGORY</td>
                        <td style={{ ...valueCellStyle, fontWeight: 700 }}>{data.defect_category || '-'}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>REPORT DATE</td>
                        <td style={valueCellStyle}>{data.defect_date || '-'}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>DETAIL FINDING</td>
                        <td style={valueCellStyle}>{data.defect_type || '-'}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>INSPECTOR NAME</td>
                        <td style={valueCellStyle}>{reporterName}</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>TARGET CLOSE (SLA)</td>
                        <td style={valueCellStyle}>{data.sla_days !== undefined ? `${data.sla_days} Hari` : '-'} ({slaInfo.text})</td>
                      </tr>
                      <tr>
                        <td style={labelCellStyle}>POSITION/LAYOUT</td>
                        <td style={valueCellStyle}>{floorplanName}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ padding: '4px 8px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '46px' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '2px' }}>
                      FINDING NOTE :
                    </div>
                    <div style={{ fontSize: '8.5pt', color: '#0F172A', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.25' }}>
                      {data.notes || ''}
                    </div>
                  </div>
                </div>

                {/* RIGHT: DEFECT LOCATION */}
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>DEFECT LOCATION</div>
                  <div style={{ flex: 1, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
                    {floorplanImage ? (
                      <img src={floorplanImage} alt="Defect Location" style={{ maxHeight: '225px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '8.5pt', color: '#94A3B8' }}></span>
                    )}
                  </div>
                </div>
              </div>

              {/* ROW 3: ACTION / CORRECTION FULL-WIDTH BANNER + 2-COLUMN BOXES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                <div style={{
                  border: `1.5px solid ${borderColor}`,
                  backgroundColor: lightBlueBar,
                  color: '#0F172A',
                  fontWeight: 700,
                  fontSize: '9pt',
                  textAlign: 'center',
                  padding: '4px 8px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}>
                  ACTION / CORRECTION
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                  {/* Left: Status, Closing Date, Inspector Name */}
                  <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ ...labelCellStyle, width: '49%' }}>STATUS FINDING</td>
                          <td style={{ ...valueCellStyle, fontWeight: 700, textTransform: 'uppercase' }}>{currentStatus}</td>
                        </tr>
                        <tr>
                          <td style={labelCellStyle}>CLOSING DATE</td>
                          <td style={valueCellStyle}>{closingDate || '-'}</td>
                        </tr>
                        <tr>
                          <td style={{ ...labelCellStyle, borderBottom: 'none' }}>INSPECTOR NAME</td>
                          <td style={{ ...valueCellStyle, borderBottom: 'none' }}>{closingInspectorName}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right: ACTION NOTE */}
                  <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF', padding: '4px 8px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '2px' }}>
                      ACTION NOTE :
                    </div>
                    <div style={{ fontSize: '8.5pt', color: '#0F172A', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.25' }}>
                      {actionNote || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 4: PHOTO DEFECT / FINDING (2 COLUMNS, EACH STACKED PHOTO 1 ON TOP OF PHOTO 2) */}
              <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                {/* LEFT PHOTO BOX: BEFORE / DEFECT */}
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>PHOTO DEFECT / FINDING</div>
                  {/* Photo 1 */}
                  <div style={{ height: '162px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderBottom: `1.2px solid ${borderColor}` }}>
                    {defectPhotos[0] ? (
                      <img src={defectPhotos[0]} alt="Defect Photo 1" style={{ maxHeight: '152px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : null}
                  </div>
                  <div style={{ borderBottom: `1.2px solid ${borderColor}`, textAlign: 'center', padding: '2.5px', fontSize: '8.5pt', fontWeight: 600, color: '#0F172A' }}>
                    Photo 1
                  </div>
                  {/* Photo 2 */}
                  <div style={{ height: '162px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderBottom: `1.2px solid ${borderColor}` }}>
                    {defectPhotos[1] ? (
                      <img src={defectPhotos[1]} alt="Defect Photo 2" style={{ maxHeight: '152px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'center', padding: '2.5px', fontSize: '8.5pt', fontWeight: 600, color: '#0F172A' }}>
                    Photo 2
                  </div>
                </div>

                {/* RIGHT PHOTO BOX: AFTER / ACTION */}
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>PHOTO DEFECT / FINDING</div>
                  {/* Photo 1 */}
                  <div style={{ height: '162px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderBottom: `1.2px solid ${borderColor}` }}>
                    {actionPhotos[0] ? (
                      <img src={actionPhotos[0]} alt="Action Photo 1" style={{ maxHeight: '152px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : null}
                  </div>
                  <div style={{ borderBottom: `1.2px solid ${borderColor}`, textAlign: 'center', padding: '2.5px', fontSize: '8.5pt', fontWeight: 600, color: '#0F172A' }}>
                    Photo 1
                  </div>
                  {/* Photo 2 */}
                  <div style={{ height: '162px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderBottom: `1.2px solid ${borderColor}` }}>
                    {actionPhotos[1] ? (
                      <img src={actionPhotos[1]} alt="Action Photo 2" style={{ maxHeight: '152px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'center', padding: '2.5px', fontSize: '8.5pt', fontWeight: 600, color: '#0F172A' }}>
                    Photo 2
                  </div>
                </div>
              </div>

              {/* ROW 5: CLOSING SIGNATURE TABLE */}
              <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '9pt' }}>
                  <tbody>
                    <tr>
                      <td rowSpan={3} style={{
                        width: '25.5%',
                        borderRight: `1.5px solid ${borderColor}`,
                        fontWeight: 700,
                        fontSize: '10.5pt',
                        color: '#0F172A',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '6px'
                      }}>
                        Closing Signature
                      </td>
                      <td style={{ width: '24.8%', backgroundColor: lightBlueBar, fontWeight: 700, padding: '4px', borderRight: `1.2px solid ${borderColor}`, borderBottom: `1.2px solid ${borderColor}` }}>
                        CONTRACTOR
                      </td>
                      <td style={{ width: '24.8%', backgroundColor: lightBlueBar, fontWeight: 700, padding: '4px', borderRight: `1.2px solid ${borderColor}`, borderBottom: `1.2px solid ${borderColor}` }}>
                        CM CONSUNTANT
                      </td>
                      <td style={{ width: '24.9%', backgroundColor: lightBlueBar, fontWeight: 700, padding: '4px', borderBottom: `1.2px solid ${borderColor}` }}>
                        OWNER
                      </td>
                    </tr>
                    <tr>
                      <td style={{ height: '66px', borderRight: `1.2px solid ${borderColor}`, borderBottom: `1.2px solid ${borderColor}` }}></td>
                      <td style={{ height: '66px', borderRight: `1.2px solid ${borderColor}`, borderBottom: `1.2px solid ${borderColor}` }}></td>
                      <td style={{ height: '66px', borderBottom: `1.2px solid ${borderColor}` }}></td>
                    </tr>
                    <tr style={{ fontWeight: 700, fontSize: '8.5pt' }}>
                      <td style={{ padding: '3.5px', borderRight: `1.2px solid ${borderColor}` }}>PM / SM</td>
                      <td style={{ padding: '3.5px', borderRight: `1.2px solid ${borderColor}` }}>CM</td>
                      <td style={{ padding: '3.5px' }}>PM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* --- DEFECT FORM (NON-NCR) --- */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#1E293B', marginBottom: '-4px' }}>
                PROJECT QUALITY CONTROL SYSTEM
              </div>
              <div style={{
                border: `1.5px solid ${borderColor}`,
                backgroundColor: lightBlueBar,
                color: '#0F172A',
                padding: '7px 14px',
                textAlign: 'center',
                fontSize: '14pt',
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>
                DEFECT FINDING REPORT
              </div>

              <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...labelCellStyle, width: '24%' }}>ID RECORD</td>
                      <td style={{ ...valueCellStyle, fontWeight: 700 }}>{data.defect_code || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ ...labelCellStyle, borderBottom: 'none' }}>PROJECT NAME</td>
                      <td style={{ ...valueCellStyle, borderBottom: 'none', fontWeight: 700 }}>{projectName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>FINDING</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={{ ...labelCellStyle, width: '49%' }}>OBJECT / BUILDING</td><td style={valueCellStyle}>{buildingName}</td></tr>
                      <tr><td style={labelCellStyle}>DICIPLINE</td><td style={valueCellStyle}>{data.discipline || '-'}</td></tr>
                      <tr><td style={labelCellStyle}>FINDING CATEGORY</td><td style={{ ...valueCellStyle, fontWeight: 700 }}>{data.defect_category || '-'}</td></tr>
                      <tr><td style={labelCellStyle}>REPORT DATE</td><td style={valueCellStyle}>{data.defect_date || '-'}</td></tr>
                      <tr><td style={labelCellStyle}>DETAIL FINDING</td><td style={valueCellStyle}>{data.defect_type || '-'}</td></tr>
                      <tr><td style={labelCellStyle}>INSPECTOR NAME</td><td style={valueCellStyle}>{reporterName}</td></tr>
                      <tr><td style={labelCellStyle}>TARGET CLOSE (SLA)</td><td style={valueCellStyle}>{data.sla_days !== undefined ? `${data.sla_days} Hari` : '-'} ({slaInfo.text})</td></tr>
                      <tr><td style={labelCellStyle}>POSITION/LAYOUT</td><td style={valueCellStyle}>{floorplanName}</td></tr>
                    </tbody>
                  </table>
                  <div style={{ padding: '4px 8px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '52px' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '2px' }}>FINDING NOTE :</div>
                    <div style={{ fontSize: '8.5pt', color: '#0F172A', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.25' }}>{data.notes || ''}</div>
                  </div>
                </div>

                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>DEFECT LOCATION</div>
                  <div style={{ flex: 1, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
                    {floorplanImage ? <img src={floorplanImage} alt="Defect Location" style={{ maxHeight: '240px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: lightBlueBar, color: '#0F172A', fontWeight: 700, fontSize: '9pt', textAlign: 'center', padding: '4px 8px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ACTION / CORRECTION
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                  <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><td style={{ ...labelCellStyle, width: '49%' }}>STATUS FINDING</td><td style={{ ...valueCellStyle, fontWeight: 700, textTransform: 'uppercase' }}>{currentStatus}</td></tr>
                        <tr><td style={labelCellStyle}>CLOSING DATE</td><td style={valueCellStyle}>{closingDate || '-'}</td></tr>
                        <tr><td style={{ ...labelCellStyle, borderBottom: 'none' }}>INSPECTOR NAME</td><td style={{ ...valueCellStyle, borderBottom: 'none' }}>{closingInspectorName}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ border: `1.5px solid ${borderColor}`, backgroundColor: '#FFFFFF', padding: '4px 8px' }}>
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '2px' }}>ACTION NOTE :</div>
                    <div style={{ fontSize: '8.5pt', color: '#0F172A', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.25' }}>{actionNote || ''}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '48% 50.5%', justifyContent: 'space-between', alignItems: 'stretch' }}>
                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>PHOTO DEFECT / FINDING</div>
                  <div style={{ height: '210px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1.2px solid ${borderColor}` }}>
                    {defectPhotos[0] ? <img src={defectPhotos[0]} alt="Photo 1" style={{ maxHeight: '198px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
                  </div>
                  <div style={{ borderBottom: `1.2px solid ${borderColor}`, textAlign: 'center', padding: '3px', fontSize: '8.5pt', fontWeight: 600 }}>Photo 1</div>
                  <div style={{ height: '210px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1.2px solid ${borderColor}` }}>
                    {defectPhotos[1] ? <img src={defectPhotos[1]} alt="Photo 2" style={{ maxHeight: '198px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
                  </div>
                  <div style={{ textAlign: 'center', padding: '3px', fontSize: '8.5pt', fontWeight: 600 }}>Photo 2</div>
                </div>

                <div style={{ border: `1.5px solid ${borderColor}`, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
                  <div style={sectionBannerStyle}>PHOTO DEFECT / FINDING</div>
                  <div style={{ height: '210px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1.2px solid ${borderColor}` }}>
                    {actionPhotos[0] ? <img src={actionPhotos[0]} alt="Photo 1" style={{ maxHeight: '198px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
                  </div>
                  <div style={{ borderBottom: `1.2px solid ${borderColor}`, textAlign: 'center', padding: '3px', fontSize: '8.5pt', fontWeight: 600 }}>Photo 1</div>
                  <div style={{ height: '210px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1.2px solid ${borderColor}` }}>
                    {actionPhotos[1] ? <img src={actionPhotos[1]} alt="Photo 2" style={{ maxHeight: '198px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
                  </div>
                  <div style={{ textAlign: 'center', padding: '3px', fontSize: '8.5pt', fontWeight: 600 }}>Photo 2</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- DATA MASTER VIEW (PROJECT & BUILDINGS) ---
function DataMasterView({ db, setDb, darkMode, currentUser }) {
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [selectedProjectForBldg, setSelectedProjectForBldg] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [floorplanFiles, setFloorplanFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetchSupabase('projects', 'POST', {
        project_name: projectName.trim(),
        project_code: projectCode.trim() || `PRJ-${Date.now().toString().slice(-4)}`
      });
      if (res && res[0]) {
        setDb(prev => ({ ...prev, projects: [...(prev.projects || []), res[0]] }));
        setProjectName('');
        setProjectCode('');
      }
    } catch (err) {
      alert("Gagal menyimpan proyek: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await fetchSupabase(`buildings?project_id=eq.${id}`, 'DELETE');
      await fetchSupabase(`projects?id=eq.${id}`, 'DELETE');
      setDb(prev => ({
        ...prev,
        projects: (prev.projects || []).filter(p => p.id !== id),
        buildings: (prev.buildings || []).filter(b => b.project_id !== id)
      }));
    } catch (err) {
      alert("Gagal menghapus proyek: " + err.message);
    }
  };

  const handleFloorplanUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const processed = [];
    for (let i = 0; i < files.length; i++) {
      const compressed = await compressImage(files[i]);
      processed.push({
        id: `${Date.now()}_${i}`,
        name: files[i].name,
        image: compressed
      });
    }
    setFloorplanFiles(prev => [...prev, ...processed]);
  };

  const handleAddBuilding = async (e) => {
    e.preventDefault();
    if (!selectedProjectForBldg || !buildingName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetchSupabase('buildings', 'POST', {
        project_id: parseInt(selectedProjectForBldg),
        building_name: buildingName.trim(),
        floorplans: floorplanFiles
      });
      if (res && res[0]) {
        setDb(prev => ({ ...prev, buildings: [...(prev.buildings || []), res[0]] }));
        setBuildingName('');
        setFloorplanFiles([]);
      }
    } catch (err) {
      alert("Gagal menyimpan gedung/area: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBuilding = async (id) => {
    try {
      await fetchSupabase(`buildings?id=eq.${id}`, 'DELETE');
      setDb(prev => ({
        ...prev,
        buildings: (prev.buildings || []).filter(b => b.id !== id)
      }));
    } catch (err) {
      alert("Gagal menghapus gedung: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Master Data Project & Buildings</h2>
        <p className="text-xs font-medium text-slate-500 mt-1">Kelola daftar proyek, gedung/zona, dan unggah gambar denah (floorplan) untuk penitikan lokasi temuan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Tambah Project */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Building size={18} className="text-[#0F4C81]"/> Tambah Proyek Baru</h3>
          <form onSubmit={handleAddProject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Proyek *</label>
              <input type="text" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Contoh: Tower A Residence" className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Kode Proyek (Opsional)</label>
              <input type="text" value={projectCode} onChange={e => setProjectCode(e.target.value)} placeholder="Contoh: PRJ-01" className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Plus size={16}/> Simpan Proyek
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 max-h-64 overflow-y-auto">
            {(db.projects || []).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{p.project_name}</p>
                  <p className="text-[11px] font-semibold text-slate-400">{p.project_code}</p>
                </div>
                {currentUser?.role === 'Admin' && (
                  <button onClick={() => handleDeleteProject(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 size={16}/></button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Tambah Building & Floorplan */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><MapPin size={18} className="text-[#0F4C81]"/> Tambah Object / Building & Denah</h3>
          <form onSubmit={handleAddBuilding} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Pilih Proyek *</label>
              <select required value={selectedProjectForBldg} onChange={e => setSelectedProjectForBldg(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="">-- Pilih Proyek --</option>
                {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Gedung / Zona / Lantai *</label>
              <input type="text" required value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="Contoh: Lantai 1 - Lobby Utama" className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Upload Denah / Floorplan (Gambar)</label>
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[#0F4C81] transition-colors text-xs font-bold text-slate-600 dark:text-slate-300">
                <UploadCloud size={18}/> Pilih Gambar Denah ({floorplanFiles.length} terpilih)
                <input type="file" accept="image/*" multiple onChange={handleFloorplanUpload} className="hidden" />
              </label>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Plus size={16}/> Simpan Building & Denah
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 max-h-64 overflow-y-auto">
            {(db.buildings || []).map(b => {
              const proj = (db.projects || []).find(p => p.id === b.project_id);
              return (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{b.building_name}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{proj?.project_name || 'Unknown Project'} • {(b.floorplans || []).length} Denah</p>
                  </div>
                  {currentUser?.role === 'Admin' && (
                    <button onClick={() => handleDeleteBuilding(b.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- INPUT DEFECT VIEW ---
function InputDefectView({ db, setDb, currentUser, darkMode, primaryColor }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floorplanId, setFloorplanId] = useState('');
  const [discipline, setDiscipline] = useState('Struktur');
  const [defectType, setDefectType] = useState(DEFECT_DICTIONARY['Struktur'][0]);
  const [customDefectType, setCustomDefectType] = useState('');
  const [defectCategory, setDefectCategory] = useState('Minor');
  const [defectDate, setDefectDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slaDays, setSlaDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [pinPos, setPinPos] = useState({ x: 50, y: 50 });
  const [hasPinned, setHasPinned] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDocData, setPreviewDocData] = useState(null);

  const availableBuildings = (db.buildings || []).filter(b => String(b.project_id) === String(selectedProjectId));
  const selectedBuilding = availableBuildings.find(b => String(b.id) === String(buildingId));
  const availableFloorplans = selectedBuilding?.floorplans || [];
  const selectedFloorplan = availableFloorplans.find(f => String(f.id) === String(floorplanId));

  const handleDisciplineChange = (val) => {
    setDiscipline(val);
    const list = DEFECT_DICTIONARY[val] || ['Lain-lain'];
    setDefectType(list[0]);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length >= 2) {
      alert("Maksimum pengambilan/unggah foto adalah 2 foto.");
      return;
    }
    const remainingSlots = 2 - photos.length;
    const filesToProcess = files.slice(0, remainingSlots);
    const compressedList = [];
    for (const file of filesToProcess) {
      const comp = await compressImage(file);
      compressedList.push(comp);
    }
    setPhotos(prev => [...prev, ...compressedList].slice(0, 2));
  };

  const handlePinClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPinPos({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    setHasPinned(true);
  };

  const handleSave = async (openNcrPrint = false) => {
    if (!buildingId) {
      alert("Pilih Proyek dan Object/Building terlebih dahulu!");
      return;
    }
    setIsSubmitting(true);
    try {
      const markedImg = selectedFloorplan && hasPinned
        ? await generateMarkedImage(selectedFloorplan.image, pinPos.x, pinPos.y, 'red')
        : (selectedFloorplan?.image || null);

      const finalDefectType = defectType === 'Lain-lain' && customDefectType.trim() ? customDefectType.trim() : defectType;
      const codePrefix = defectCategory === 'Hard (NCR)' ? 'NCR' : 'DEF';
      const defectCode = `${codePrefix}-${new Date().getFullYear()}-${String((db.defects || []).length + 1).padStart(4, '0')}`;

      const payload = {
        defect_code: defectCode,
        building_id: parseInt(buildingId),
        floorplan_id: floorplanId || null,
        discipline,
        defect_type: finalDefectType,
        defect_category: defectCategory,
        defect_date: defectDate,
        sla_days: parseInt(slaDays) || 7,
        notes,
        pin_x: hasPinned ? pinPos.x : null,
        pin_y: hasPinned ? pinPos.y : null,
        marked_floorplan_image: markedImg,
        defect_photo: photos,
        inspector_id: currentUser?.id || 1
      };

      const res = await fetchSupabase('defects', 'POST', payload);
      const savedRecord = (res && res[0]) ? res[0] : { id: Date.now(), ...payload };
      setDb(prev => ({ ...prev, defects: [...(prev.defects || []), savedRecord] }));

      if (openNcrPrint) {
        setPreviewDocData(savedRecord);
      } else {
        alert("Data defect berhasil disimpan!");
      }

      // Reset form fields
      setNotes('');
      setPhotos([]);
      setHasPinned(false);
    } catch (err) {
      alert("Gagal menyimpan defect: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNcrCategory = defectCategory === 'Hard (NCR)';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Input Defect / Temuan Baru</h2>
        <p className="text-xs font-medium text-slate-500 mt-1">Catat temuan lapangan, tandai titik lokasi pada denah, dan unggah bukti foto (maks. 2 foto).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Fields */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Proyek *</label>
              <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setBuildingId(''); setFloorplanId(''); }} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="">-- Pilih Proyek --</option>
                {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Object / Building *</label>
              <select value={buildingId} onChange={e => { setBuildingId(e.target.value); setFloorplanId(''); }} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="">-- Pilih Building --</option>
                {availableBuildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Disiplin Pekerjaan</label>
              <select value={discipline} onChange={e => handleDisciplineChange(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                {Object.keys(DEFECT_DICTIONARY).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Klasifikasi Temuan</label>
              <select value={defectCategory} onChange={e => setDefectCategory(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-bold outline-none ${defectCategory === 'Hard (NCR)' ? 'border-rose-500 text-rose-600 bg-rose-50/40' : (darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200')}`}>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
                <option value="Hard (NCR)">Hard (NCR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Detail Temuan / Defect</label>
            <select value={defectType} onChange={e => setDefectType(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
              {(DEFECT_DICTIONARY[discipline] || ['Lain-lain']).map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            {defectType === 'Lain-lain' && (
              <input type="text" value={customDefectType} onChange={e => setCustomDefectType(e.target.value)} placeholder="Tuliskan detail temuan spesifik..." className={`mt-2 w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tanggal Temuan</label>
              <input type="date" value={defectDate} onChange={e => setDefectDate(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Close SLA (Hari)</label>
              <input type="number" min="1" value={slaDays} onChange={e => setSlaDays(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Catatan Temuan (Finding Note)</label>
            <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Jelaskan kronologi atau detail lokasi temuan..." className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
          </div>

          {/* Foto Maksimum 2 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase text-slate-500">Bukti Foto Defect ({photos.length}/2 Maks.)</label>
            </div>
            {photos.length < 2 && (
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[#0F4C81] transition-colors text-xs font-bold text-slate-600 dark:text-slate-300">
                <Camera size={18}/> Ambil / Upload Foto ({2 - photos.length} slot tersisa)
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {photos.map((src, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-32">
                    <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg shadow"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Floorplan Pinpoint */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><MapPin size={18} className="text-rose-500"/> Penitikan Lokasi pada Denah</h3>
            <select value={floorplanId} onChange={e => { setFloorplanId(e.target.value); setHasPinned(false); }} className={`p-2.5 rounded-xl border-2 text-xs font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
              <option value="">-- Pilih Denah / Layout --</option>
              {availableFloorplans.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-h-[360px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden relative">
            {selectedFloorplan ? (
              <div onClick={handlePinClick} className="relative cursor-crosshair inline-block max-w-full">
                <img src={selectedFloorplan.image} alt="Floorplan" className="max-h-[460px] w-auto object-contain select-none" />
                {hasPinned && (
                  <div
                    style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black animate-bounce"
                  >
                    !
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center px-6">Pilih Proyek, Building, dan Denah untuk menandai titik lokasi defect.</p>
            )}
          </div>
          {hasPinned && <p className="text-xs font-bold text-emerald-600 text-center">Titik koordinat terkunci pada X: {pinPos.x}%, Y: {pinPos.y}%</p>}
        </div>
      </div>

      {/* Action Buttons: Dipindah ke Paling Bawah */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleSave(false)}
          className={`flex-1 py-4 px-6 ${primaryColor} text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60`}
        >
          <Save size={18}/> {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
        </button>
        <button
          type="button"
          disabled={!isNcrCategory || isSubmitting}
          onClick={() => handleSave(true)}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isNcrCategory
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Printer size={18}/> Print NCR & Simpan
        </button>
      </div>

      {previewDocData && (
        <DocumentFormPreviewModal data={previewDocData} db={db} onClose={() => setPreviewDocData(null)} />
      )}
    </div>
  );
}

// --- ACTION & PERBAIKAN VIEW ---
function ActionView({ db, setDb, currentUser, darkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDefect, setSelectedDefect] = useState(null);

  const getLatestAction = (defectId) => {
    const acts = (db.actions || []).filter(a => a.defect_id === defectId);
    return acts.length > 0 ? acts[acts.length - 1] : null;
  };

  const filteredList = (db.defects || []).filter(d => {
    const bldg = (db.buildings || []).find(b => b.id === d.building_id);
    const proj = bldg ? (db.projects || []).find(p => p.id === bldg.project_id) : null;
    const lastAct = getLatestAction(d.id);
    const status = lastAct ? lastAct.status : 'Open';
    const inspectorObj = (db.inspectors || []).find(i => String(i.id) === String(d.inspector_id));

    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'NCR'
        ? d.defect_category === 'Hard (NCR)'
        : status === statusFilter;

    const keyword = searchTerm.toLowerCase();
    const matchText = !keyword ||
      (d.defect_code || '').toLowerCase().includes(keyword) ||
      (d.defect_type || '').toLowerCase().includes(keyword) ||
      (bldg?.building_name || '').toLowerCase().includes(keyword) ||
      (proj?.project_name || '').toLowerCase().includes(keyword) ||
      (inspectorObj?.name || '').toLowerCase().includes(keyword);
    return matchStatus && matchText;
  });

  if (selectedDefect) {
    return (
      <ActionDetailView
        defect={selectedDefect}
        db={db}
        setDb={setDb}
        currentUser={currentUser}
        darkMode={darkMode}
        onBack={() => setSelectedDefect(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Action & Perbaikan</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Pilih baris defect pada tabel untuk memperbarui status perbaikan, foto after, atau mencetak NCR.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari ID / temuan / inspector..." className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 text-xs font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
            <option value="ALL">Semua Status</option>
            <option value="Open">Open</option>
            <option value="Proses Perbaikan">Proses Perbaikan</option>
            <option value="Close">Close</option>
            <option value="NCR">NCR</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
        <div className="overflow-x-auto rounded-t-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#23406E] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-12">NO</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">ID DEFECT</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">TGL TEMUAN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">BANGUNAN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">DENAH</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">DISIPLIN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">KATEGORI</th>
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">JENIS TEMUAN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">NAMA INSPECTOR</th>
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">CATATAN AWAL</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-20">INFO SLA</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">TGL SELESAI</th>
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">CATATAN ACTION</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">STATUS AKHIR</th>
                <th className="py-3.5 px-3 text-center">CLOSING BY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredList.map((d, idx) => {
                const bldg = (db.buildings || []).find(b => b.id === d.building_id);
                const fp = bldg && bldg.floorplans ? bldg.floorplans.find(f => String(f.id) === String(d.floorplan_id)) : null;
                const floorplanName = fp ? fp.name.replace(/\.[^/.]+$/, "") : '-';
                const lastAct = getLatestAction(d.id);
                const status = lastAct ? lastAct.status : 'Open';
                const actionDate = lastAct && lastAct.action_date ? lastAct.action_date : '-';
                const actionNote = lastAct && lastAct.action_note ? lastAct.action_note : '-';
                const sla = calculateSlaStatus(d.defect_date, d.sla_days, actionDate);

                const reporterObj = (db.inspectors || []).find(i => String(i.id) === String(d.inspector_id));
                const reporterName = reporterObj?.name || '-';

                const closerObj = lastAct?.inspector_edit
                  ? (db.inspectors || []).find(i => String(i.id) === String(lastAct.inspector_edit))
                  : null;
                const closingByName = status === 'Close' ? (closerObj?.name || '-') : '-';

                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDefect(d)}
                    title="Klik untuk membuka form Action & Perbaikan"
                    className={`cursor-pointer transition-colors ${
                      d.defect_category === 'Hard (NCR)'
                        ? 'bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40'
                        : 'bg-white hover:bg-blue-50/70 dark:bg-slate-800 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-600 dark:text-slate-300">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-white whitespace-nowrap">
                      {d.defect_code}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {d.defect_date}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {bldg?.building_name || '-'}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                      {floorplanName}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                      {d.discipline}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold whitespace-nowrap">
                      <span className={d.defect_category === 'Hard (NCR)' ? 'text-rose-600 font-extrabold' : 'text-slate-700 dark:text-slate-300'}>
                        {d.defect_category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white min-w-[160px]">
                      {d.defect_type}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {reporterName}
                    </td>
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 min-w-[140px]">
                      {d.notes && d.notes.trim() !== '' ? d.notes : '-'}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold whitespace-nowrap">
                      <span className={sla.isLate ? 'text-rose-600' : 'text-emerald-600'}>{sla.text}</span>
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {actionDate}
                    </td>
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 min-w-[140px]">
                      {actionNote && actionNote.trim() !== '' ? actionNote : '-'}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-extrabold uppercase whitespace-nowrap">
                      <span className={
                        status === 'Close'
                          ? 'text-emerald-600'
                          : status === 'Proses Perbaikan'
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }>
                        {status === 'Close' ? 'CLOSE' : status === 'Proses Perbaikan' ? 'PROSES' : 'OPEN'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {closingByName}
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-sm font-bold text-slate-400">
                    Tidak ada data defect yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- ACTION DETAIL / UPDATE / DELETE VIEW ---
function ActionDetailView({ defect, db, setDb, currentUser, darkMode, onBack }) {
  const existingActions = (db.actions || []).filter(a => a.defect_id === defect.id);
  const latestAction = existingActions.length > 0 ? existingActions[existingActions.length - 1] : null;

  const initialBuilding = (db.buildings || []).find(b => String(b.id) === String(defect.building_id));
  const [selectedProjectId, setSelectedProjectId] = useState(initialBuilding ? String(initialBuilding.project_id) : '');
  const [buildingId, setBuildingId] = useState(defect.building_id ? String(defect.building_id) : '');
  const [floorplanId, setFloorplanId] = useState(() => {
    if (defect.floorplan_id !== undefined && defect.floorplan_id !== null && defect.floorplan_id !== '') {
      return String(defect.floorplan_id);
    }
    if (initialBuilding?.floorplans?.length === 1) {
      return String(initialBuilding.floorplans[0].id);
    }
    return '';
  });
  const [discipline, setDiscipline] = useState(defect.discipline || 'Struktur');

  const initialDictList = DEFECT_DICTIONARY[defect.discipline || 'Struktur'] || ['Lain-lain'];
  const isKnownDefectType = initialDictList.includes(defect.defect_type);
  const [defectType, setDefectType] = useState(isKnownDefectType ? defect.defect_type : 'Lain-lain');
  const [customDefectType, setCustomDefectType] = useState(isKnownDefectType ? '' : (defect.defect_type || ''));

  const [defectCategory, setDefectCategory] = useState(defect.defect_category || 'Minor');
  const [defectDate, setDefectDate] = useState(defect.defect_date || new Date().toISOString().slice(0, 10));
  const [slaDays, setSlaDays] = useState(defect.sla_days !== undefined && defect.sla_days !== null ? defect.sla_days : 7);
  const [notes, setNotes] = useState(defect.notes || '');
  const [reporterInspectorId, setReporterInspectorId] = useState(defect.inspector_id ? String(defect.inspector_id) : '');

  const rawPinX = defect.pin_x ?? defect.pinX ?? defect.x;
  const rawPinY = defect.pin_y ?? defect.pinY ?? defect.y;
  const parsedPinX = rawPinX !== undefined && rawPinX !== null && rawPinX !== '' ? Number(rawPinX) : null;
  const parsedPinY = rawPinY !== undefined && rawPinY !== null && rawPinY !== '' ? Number(rawPinY) : null;
  const hasExplicitPin = parsedPinX !== null && parsedPinY !== null && !Number.isNaN(parsedPinX) && !Number.isNaN(parsedPinY);

  const [pinPos, setPinPos] = useState({
    x: hasExplicitPin ? parsedPinX : 50,
    y: hasExplicitPin ? parsedPinY : 50
  });
  const [hasPinned, setHasPinned] = useState(hasExplicitPin || Boolean(defect.marked_floorplan_image));
  const [detectedRedDot, setDetectedRedDot] = useState(null);
  const [defectPhotos, setDefectPhotos] = useState((defect.defect_photo || []).slice(0, 2));

  const [status, setStatus] = useState(latestAction ? latestAction.status : 'Open');
  const [actionDate, setActionDate] = useState(latestAction?.action_date && latestAction.action_date !== '-' ? latestAction.action_date : new Date().toISOString().slice(0, 10));
  const [actionNote, setActionNote] = useState(latestAction?.action_note || '');
  const [actionPhotos, setActionPhotos] = useState((latestAction?.action_photo || []).slice(0, 2));
  const [closingInspectorId, setClosingInspectorId] = useState(
    latestAction?.inspector_edit
      ? String(latestAction.inspector_edit)
      : (currentUser?.id ? String(currentUser.id) : '')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [previewDocData, setPreviewDocData] = useState(null);

  const availableBuildings = (db.buildings || []).filter(b => String(b.project_id) === String(selectedProjectId));
  const selectedBuilding = availableBuildings.find(b => String(b.id) === String(buildingId)) || initialBuilding;
  const availableFloorplans = selectedBuilding?.floorplans || [];
  const selectedFloorplan = availableFloorplans.find(f => String(f.id) === String(floorplanId))
    || (!floorplanId && availableFloorplans.length === 1 ? availableFloorplans[0] : null);

  // Sinkronisasi ulang koordinat & denah awal saat defect dipilih untuk diedit/update
  useEffect(() => {
    const bldg = (db.buildings || []).find(b => String(b.id) === String(defect.building_id));
    if (bldg) {
      setSelectedProjectId(prev => prev || String(bldg.project_id));
      setBuildingId(prev => prev || String(bldg.id));
    }

    if (defect.floorplan_id !== undefined && defect.floorplan_id !== null && defect.floorplan_id !== '') {
      setFloorplanId(String(defect.floorplan_id));
    } else if (bldg?.floorplans?.length === 1) {
      setFloorplanId(String(bldg.floorplans[0].id));
    }

    const rx = defect.pin_x ?? defect.pinX ?? defect.x;
    const ry = defect.pin_y ?? defect.pinY ?? defect.y;
    const px = rx !== undefined && rx !== null && rx !== '' ? Number(rx) : null;
    const py = ry !== undefined && ry !== null && ry !== '' ? Number(ry) : null;

    if (px !== null && py !== null && !Number.isNaN(px) && !Number.isNaN(py)) {
      setPinPos({ x: px, y: py });
      setHasPinned(true);
    } else if (defect.marked_floorplan_image) {
      setHasPinned(true);
      // Deteksi titik merah dari marked_floorplan_image (membandingkan dengan gambar denah asli jika tersedia)
      const markedImgEl = new Image();
      markedImgEl.crossOrigin = 'Anonymous';
      markedImgEl.onload = () => {
        try {
          const w = markedImgEl.width;
          const h = markedImgEl.height;
          const canvasM = document.createElement('canvas');
          canvasM.width = w;
          canvasM.height = h;
          const ctxM = canvasM.getContext('2d');
          ctxM.drawImage(markedImgEl, 0, 0);
          const dataM = ctxM.getImageData(0, 0, w, h).data;

          const matchedFp = bldg?.floorplans?.find(f => String(f.id) === String(defect.floorplan_id))
            || (bldg?.floorplans?.length === 1 ? bldg.floorplans[0] : null);

          const computeDot = (dataOrig = null) => {
            let sumX = 0, sumY = 0, count = 0;
            for (let y = 0; y < h; y += 2) {
              for (let x = 0; x < w; x += 2) {
                const idx = (y * w + x) * 4;
                const r = dataM[idx], g = dataM[idx + 1], b = dataM[idx + 2];
                const isRed = r > 180 && g < 85 && b < 85 && (r - g) > 100;
                if (!isRed) continue;
                if (dataOrig) {
                  const or = dataOrig[idx], og = dataOrig[idx + 1], ob = dataOrig[idx + 2];
                  if (Math.abs(r - or) < 40 && Math.abs(g - og) < 40 && Math.abs(b - ob) < 40) continue;
                }
                sumX += x;
                sumY += y;
                count++;
              }
            }
            if (count > 0) {
              const detX = Math.round(((sumX / count) / w) * 1000) / 10;
              const detY = Math.round(((sumY / count) / h) * 1000) / 10;
              setDetectedRedDot({ x: detX, y: detY });
              setPinPos({ x: detX, y: detY });
              setHasPinned(true);
            }
          };

          if (matchedFp?.image) {
            const origImgEl = new Image();
            origImgEl.crossOrigin = 'Anonymous';
            origImgEl.onload = () => {
              try {
                const canvasO = document.createElement('canvas');
                canvasO.width = w;
                canvasO.height = h;
                const ctxO = canvasO.getContext('2d');
                ctxO.drawImage(origImgEl, 0, 0, w, h);
                computeDot(ctxO.getImageData(0, 0, w, h).data);
              } catch {
                computeDot(null);
              }
            };
            origImgEl.onerror = () => computeDot(null);
            origImgEl.src = matchedFp.image;
          } else {
            computeDot(null);
          }
        } catch (err) {
          console.warn('Tidak dapat membaca piksel koordinat denah:', err);
        }
      };
      markedImgEl.src = defect.marked_floorplan_image;
    }
  }, [defect, db.buildings]);

  const handleDisciplineChange = (val) => {
    setDiscipline(val);
    const list = DEFECT_DICTIONARY[val] || ['Lain-lain'];
    setDefectType(list[0]);
  };

  const handlePinClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPinPos({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    setHasPinned(true);
  };

  const handlePhotoAdd = async (e, target) => {
    const files = Array.from(e.target.files || []);
    const currentList = target === 'defect' ? defectPhotos : actionPhotos;
    if (currentList.length >= 2) {
      alert("Maksimum pengambilan/unggah foto adalah 2 foto.");
      return;
    }
    const remaining = 2 - currentList.length;
    const processed = [];
    for (const f of files.slice(0, remaining)) {
      processed.push(await compressImage(f));
    }
    if (target === 'defect') {
      setDefectPhotos(prev => [...prev, ...processed].slice(0, 2));
    } else {
      setActionPhotos(prev => [...prev, ...processed].slice(0, 2));
    }
  };

  const handleUpdate = async (openNcrPrint = false) => {
    setIsSaving(true);
    try {
      const finalDefectType = defectType === 'Lain-lain' && customDefectType.trim() ? customDefectType.trim() : defectType;
      const markedImg = selectedFloorplan && hasPinned
        ? await generateMarkedImage(selectedFloorplan.image, pinPos.x, pinPos.y, 'red')
        : (selectedFloorplan?.image || defect.marked_floorplan_image || null);

      const defectPatch = {
        building_id: buildingId ? parseInt(buildingId) : defect.building_id,
        floorplan_id: floorplanId || null,
        discipline,
        defect_type: finalDefectType,
        defect_category: defectCategory,
        defect_date: defectDate,
        sla_days: parseInt(slaDays) || 7,
        notes,
        inspector_id: reporterInspectorId ? parseInt(reporterInspectorId) : (defect.inspector_id || currentUser?.id || 1),
        pin_x: hasPinned ? pinPos.x : null,
        pin_y: hasPinned ? pinPos.y : null,
        marked_floorplan_image: markedImg,
        defect_photo: defectPhotos.slice(0, 2)
      };

      await fetchSupabase(`defects?id=eq.${defect.id}`, 'PATCH', defectPatch);

      const finalClosingInspectorId = closingInspectorId ? parseInt(closingInspectorId) : (currentUser?.id || 1);

      const actionPayload = {
        defect_id: defect.id,
        status,
        action_date: status === 'Open' ? '-' : actionDate,
        action_note: actionNote,
        action_photo: actionPhotos.slice(0, 2),
        inspector_edit: finalClosingInspectorId
      };

      let savedAction = null;
      if (latestAction) {
        const res = await fetchSupabase(`actions?id=eq.${latestAction.id}`, 'PATCH', actionPayload);
        savedAction = (res && res[0]) ? res[0] : { ...latestAction, ...actionPayload };
        setDb(prev => ({
          ...prev,
          defects: (prev.defects || []).map(d => d.id === defect.id ? { ...d, ...defectPatch } : d),
          actions: (prev.actions || []).map(a => a.id === latestAction.id ? savedAction : a)
        }));
      } else {
        const res = await fetchSupabase('actions', 'POST', actionPayload);
        savedAction = (res && res[0]) ? res[0] : { id: Date.now(), ...actionPayload };
        setDb(prev => ({
          ...prev,
          defects: (prev.defects || []).map(d => d.id === defect.id ? { ...d, ...defectPatch } : d),
          actions: [...(prev.actions || []), savedAction]
        }));
      }

      const mergedPreview = {
        ...defect,
        ...defectPatch,
        current_status: status,
        action_date: actionPayload.action_date,
        action_note: actionNote,
        action_photos: actionPhotos.slice(0, 2),
        inspector_edit: finalClosingInspectorId
      };

      if (openNcrPrint) {
        setPreviewDocData(mergedPreview);
      } else {
        alert("Data defect & perbaikan berhasil diperbarui!");
        onBack();
      }
    } catch (err) {
      alert("Gagal memperbarui data: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDefect = async () => {
    try {
      await fetchSupabase(`actions?defect_id=eq.${defect.id}`, 'DELETE');
      await fetchSupabase(`defects?id=eq.${defect.id}`, 'DELETE');
      setDb(prev => ({
        ...prev,
        defects: (prev.defects || []).filter(d => d.id !== defect.id),
        actions: (prev.actions || []).filter(a => a.defect_id !== defect.id)
      }));
      onBack();
    } catch (err) {
      alert("Gagal menghapus record: " + err.message);
    }
  };

  const isNcr = defectCategory === 'Hard (NCR)';
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
        <h2 className="text-2xl font-black text-[#0F4C81] dark:text-blue-400 tracking-tight">{defect.defect_code}</h2>
      </div>

      {/* BAGIAN 1: DATA DEFECT (LENGKAP SEPERTI INPUT DEFECT BARU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-800 dark:text-white border-b pb-3 border-slate-100 dark:border-slate-700">1. Data Temuan (Input Defect)</h3>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Inspector</label>
            <select
              value={reporterInspectorId}
              disabled={!isAdmin}
              onChange={e => setReporterInspectorId(e.target.value)}
              className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${
                !isAdmin
                  ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  : (darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200')
              }`}
            >
              <option value="">-- Pilih Nama Inspector --</option>
              {(db.inspectors || []).map(ins => (
                <option key={ins.id} value={ins.id}>{ins.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Proyek *</label>
              <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setBuildingId(''); setFloorplanId(''); }} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="">-- Pilih Proyek --</option>
                {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Object / Building *</label>
              <select value={buildingId} onChange={e => { setBuildingId(e.target.value); setFloorplanId(''); }} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                <option value="">-- Pilih Building --</option>
                {availableBuildings.map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Disiplin Pekerjaan</label>
              <select value={discipline} onChange={e => handleDisciplineChange(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                {Object.keys(DEFECT_DICTIONARY).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Klasifikasi Temuan</label>
              <select value={defectCategory} onChange={e => setDefectCategory(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-bold outline-none ${defectCategory === 'Hard (NCR)' ? 'border-rose-500 text-rose-600 bg-rose-50/40' : (darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200')}`}>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
                <option value="Hard (NCR)">Hard (NCR)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Detail Temuan / Defect</label>
            <select value={defectType} onChange={e => setDefectType(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
              {(DEFECT_DICTIONARY[discipline] || ['Lain-lain']).map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            {defectType === 'Lain-lain' && (
              <input type="text" value={customDefectType} onChange={e => setCustomDefectType(e.target.value)} placeholder="Tuliskan detail temuan spesifik..." className={`mt-2 w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tanggal Temuan</label>
              <input type="date" value={defectDate} onChange={e => setDefectDate(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Close SLA (Hari)</label>
              <input type="number" min="1" value={slaDays} onChange={e => setSlaDays(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Catatan Temuan (Finding Note)</label>
            <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Jelaskan kronologi atau detail lokasi temuan..." className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Bukti Foto Defect ({defectPhotos.length}/2 Maks.)</label>
            {defectPhotos.length < 2 && (
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[#0F4C81] transition-colors text-xs font-bold text-slate-600 dark:text-slate-300">
                <Camera size={18}/> Ambil / Upload Foto ({2 - defectPhotos.length} slot tersisa)
                <input type="file" accept="image/*" multiple onChange={e => handlePhotoAdd(e, 'defect')} className="hidden" />
              </label>
            )}
            {defectPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {defectPhotos.map((src, i) => (
                  <div key={i} className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={src} alt="Defect" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setDefectPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg shadow"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Floorplan Pinpoint */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2"><MapPin size={18} className="text-rose-500"/> Penitikan Lokasi pada Denah</h3>
            <select value={floorplanId} onChange={e => setFloorplanId(e.target.value)} className={`p-2.5 rounded-xl border-2 text-xs font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
              <option value="">-- Pilih Denah / Layout --</option>
              {availableFloorplans.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-h-[360px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden relative">
            {selectedFloorplan ? (
              <div onClick={handlePinClick} className="relative cursor-crosshair inline-block max-w-full">
                <img src={selectedFloorplan.image} alt="Floorplan" className="max-h-[460px] w-auto object-contain select-none" />
                {hasPinned && (
                  <div
                    style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-black animate-bounce">
                      !
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-900/85 text-white text-[9px] font-bold whitespace-nowrap shadow">
                      {pinPos.x}%, {pinPos.y}%
                    </span>
                  </div>
                )}
              </div>
            ) : defect.marked_floorplan_image ? (
              <div className="relative inline-block max-w-full">
                <img src={defect.marked_floorplan_image} alt="Marked Floorplan" className="max-h-[460px] w-auto object-contain select-none" />
                {(hasExplicitPin || detectedRedDot) && (
                  <div
                    style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[11px] font-black">
                      !
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-900/85 text-white text-[9px] font-bold whitespace-nowrap shadow">
                      {pinPos.x}%, {pinPos.y}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 text-center px-6">Pilih Proyek, Building, dan Denah untuk menandai titik lokasi defect.</p>
            )}
          </div>
          {hasPinned && (
            <p className="text-xs font-bold text-emerald-600 text-center">
              {hasExplicitPin || detectedRedDot
                ? `Titik koordinat defect awal pada denah: X = ${pinPos.x}%, Y = ${pinPos.y}%`
                : 'Titik lokasi defect terpasang pada gambar denah tersimpan'}
            </p>
          )}
        </div>
      </div>

      {/* BAGIAN 2: INPUT DATA ACTION / CORRECTION */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-800 dark:text-white border-b pb-3 border-slate-100 dark:border-slate-700">2. Input Data Action & Perbaikan (Action / Correction)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status Perbaikan</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="Open">Open</option>
                  <option value="Proses Perbaikan">Proses Perbaikan</option>
                  <option value="Close">Close</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tanggal Closing / Update</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-bold outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Closing Inspector</label>
                <select
                  value={closingInspectorId}
                  disabled={!isAdmin}
                  onChange={e => setClosingInspectorId(e.target.value)}
                  className={`w-full p-3 rounded-xl border-2 text-sm font-bold outline-none ${
                    !isAdmin
                      ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      : (darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <option value="">-- Pilih Inspector --</option>
                  {(db.inspectors || []).map(ins => (
                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Catatan Perbaikan (Action Note)</label>
              <textarea rows="3" value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder="Jelaskan tindakan perbaikan yang telah dilakukan..." className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Foto Hasil Perbaikan ({actionPhotos.length}/2 Maks.)</label>
            {actionPhotos.length < 2 && (
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[#0F4C81] transition-colors text-xs font-bold text-slate-500">
                <Camera size={18}/> Upload Foto Perbaikan ({2 - actionPhotos.length} slot tersisa)
                <input type="file" accept="image/*" multiple onChange={e => handlePhotoAdd(e, 'action')} className="hidden" />
              </label>
            )}
            {actionPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {actionPhotos.map((src, i) => (
                  <div key={i} className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={src} alt="Action" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setActionPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-lg shadow"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleDeleteDefect}
            className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Trash2 size={17}/> Hapus Record
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onBack}
            className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            Kembali
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleUpdate(false)}
            className="w-full py-3.5 px-4 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap disabled:opacity-60"
          >
            <Save size={17}/> {isSaving ? 'Menyimpan...' : 'Simpan Data'}
          </button>
          <button
            type="button"
            disabled={!isNcr || isSaving}
            onClick={() => handleUpdate(true)}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              isNcr
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Printer size={17}/> Print NCR & Simpan
          </button>
        </div>
      </div>

      {previewDocData && (
        <DocumentFormPreviewModal data={previewDocData} db={db} onClose={() => setPreviewDocData(null)} />
      )}
    </div>
  );
}

// --- REPORT VIEW ---
function ReportView({ db, darkMode }) {
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [groupBy, setGroupBy] = useState('id');
  const [attachmentMode, setAttachmentMode] = useState('ringkas');
  const [selectedDocItem, setSelectedDocItem] = useState(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);

  const enrichedDefects = (db.defects || []).map(d => {
    const bldg = (db.buildings || []).find(b => b.id === d.building_id);
    const proj = bldg ? (db.projects || []).find(p => p.id === bldg.project_id) : null;
    const fp = bldg && bldg.floorplans ? bldg.floorplans.find(f => String(f.id) === String(d.floorplan_id)) : null;
    const acts = (db.actions || []).filter(a => a.defect_id === d.id);
    const lastAct = acts.length > 0 ? acts[acts.length - 1] : null;
    const inspectorObj = (db.inspectors || []).find(i => String(i.id) === String(d.inspector_id));

    return {
      ...d,
      project_id: proj?.id,
      project_name: proj?.project_name || '-',
      building_name: bldg?.building_name || '-',
      floorplan_name: fp ? fp.name.replace(/\.[^/.]+$/, "") : '-',
      floorplan_image: d.marked_floorplan_image || (fp ? fp.image : null),
      inspector_name: inspectorObj?.name || '-',
      current_status: lastAct ? lastAct.status : 'Open',
      action_date: lastAct && lastAct.action_date ? lastAct.action_date : '-',
      action_note: lastAct && lastAct.action_note ? lastAct.action_note : '',
      action_photos: lastAct ? lastAct.action_photo : [],
      inspector_edit: lastAct ? lastAct.inspector_edit : null
    };
  });

  const filteredReport = enrichedDefects
    .filter(item => {
      const matchProj = selectedProject === 'ALL' || String(item.project_id) === String(selectedProject);
      const matchStat = selectedStatus === 'ALL' || item.current_status === selectedStatus;
      return matchProj && matchStat;
    })
    .sort((a, b) => {
      if (groupBy === 'building') return (a.building_name || '').localeCompare(b.building_name || '');
      if (groupBy === 'discipline') return (a.discipline || '').localeCompare(b.discipline || '');
      if (groupBy === 'category') return (a.defect_category || '').localeCompare(b.defect_category || '');
      return String(b.defect_code || '').localeCompare(String(a.defect_code || ''));
    });

  const summary = {
    total: filteredReport.length,
    open: filteredReport.filter(r => r.current_status === 'Open').length,
    inProgress: filteredReport.filter(r => r.current_status === 'Proses Perbaikan').length,
    closed: filteredReport.filter(r => r.current_status === 'Close').length,
  };

  const selectedProjectTitle = selectedProject === 'ALL'
    ? ((db.projects || []).length === 1 ? db.projects[0].project_name : 'SELURUH PROYEK')
    : ((db.projects || []).find(p => String(p.id) === String(selectedProject))?.project_name || 'PROYEK TERPILIH');

  const handleExportCSV = () => {
    const headers = ['No', 'ID Defect', 'Tgl Temuan', 'Bangunan', 'Denah', 'Disiplin', 'Kategori', 'Jenis Temuan', 'Catatan Awal', 'Info SLA', 'Tgl Selesai', 'Catatan Action'];
    const rows = filteredReport.map((r, idx) => {
      const sla = calculateSlaStatus(r.defect_date, r.sla_days, r.action_date);
      return [
        idx + 1,
        r.defect_code,
        r.defect_date,
        r.building_name,
        r.floorplan_name,
        r.discipline,
        r.defect_category,
        r.defect_type,
        r.notes || '-',
        sla.text,
        r.action_date || '-',
        r.action_note || '-'
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_QC_${selectedProjectTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReportPDF = () => {
    setIsPrintingReport(true);
    setTimeout(() => {
      const element = document.getElementById('pqcs-report-pdf-container');
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Quality_Control_Report_${selectedProjectTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, width: 1122, windowWidth: 1122, x: 0, y: 0, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'px', format: [1122, 794], orientation: 'landscape', hotfixes: ['px_scaling'] }
      };
      const execute = (h2p) => h2p().set(opt).from(element).save().then(() => setIsPrintingReport(false));
      if (window.html2pdf) {
        execute(window.html2pdf);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => execute(window.html2pdf);
        document.head.appendChild(script);
      }
    }, 400);
  };

  // Pembagian halaman PDF A4 Landscape sesuai lampiran image_a6768c.jpg & image_a6df88.jpg
  const rowsPerPage = attachmentMode === 'foto' ? 6 : 13;
  const reportPages = [];
  if (filteredReport.length === 0) {
    reportPages.push([]);
  } else {
    for (let i = 0; i < filteredReport.length; i += rowsPerPage) {
      reportPages.push(filteredReport.slice(i, i + rowsPerPage));
    }
  }
  const formattedReportDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Top Toolbar Card sesuai image_8d8524.png */}
      <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Kiri: Icon + Status Tiket + Pengelompokan (+ Filter Proyek jika > 1 proyek) */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0F4C81] dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText size={19} />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">STATUS TIKET</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className={`min-w-[155px] px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="ALL">Semua Status</option>
              <option value="Open">Open</option>
              <option value="Proses Perbaikan">Proses Perbaikan</option>
              <option value="Close">Close</option>
            </select>
          </div>

          <div className="hidden sm:block h-9 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PENGELOMPOKAN</span>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              className={`min-w-[175px] px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="id">Berdasarkan ID</option>
              <option value="building">Berdasarkan Bangunan</option>
              <option value="discipline">Berdasarkan Disiplin</option>
              <option value="category">Berdasarkan Kategori</option>
            </select>
          </div>

          {(db.projects || []).length > 1 && (
            <>
              <div className="hidden sm:block h-9 w-[1px] bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PROYEK</span>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className={`min-w-[165px] px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
                >
                  <option value="ALL">Semua Proyek</option>
                  {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Kanan: Lampiran + Download CSV + Print PDF */}
        <div className="flex items-end gap-2.5 ml-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right mb-1">LAMPIRAN</span>
            <select
              value={attachmentMode}
              onChange={e => setAttachmentMode(e.target.value)}
              className={`min-w-[155px] px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="ringkas">Ringkas (Teks)</option>
              <option value="foto">Lengkap (+ Foto)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Download CSV"
            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={handlePrintReportPDF}
            disabled={isPrintingReport}
            className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all disabled:opacity-60"
          >
            <Printer size={15} /> {isPrintingReport ? 'PRINTING...' : 'PRINT PDF'}
          </button>
        </div>
      </div>

      {/* Area Laporan Utama sesuai image_8d8524.png */}
      <div id="pqcs-report-table-printable" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-5">
        {/* Header: LAPORAN QC + Nama Proyek (kiri) & DICETAK PADA + Tanggal (kanan) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          <div>
            <h2 className="text-xl font-black tracking-[0.08em] text-slate-900 dark:text-white uppercase">
              LAPORAN QC
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-extrabold uppercase tracking-wide text-[#0F4C81] dark:text-blue-400">
              <Building size={13} />
              <span>{selectedProjectTitle}</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DICETAK PADA</p>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* 4 Summary Cards: TOTAL DEFECT, OPEN, PROSES, CLOSE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL DEFECT */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">TOTAL DEFECT</p>
              <p className="text-2xl font-black text-[#1E3A8A] dark:text-blue-400 mt-1">{summary.total}</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-blue-100 bg-blue-50/70 text-[#2563EB] flex items-center justify-center">
              <FileText size={15} />
            </div>
          </div>

          {/* Card 2: OPEN */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 inline-block shadow-sm" />
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">OPEN</p>
              </div>
              <p className="text-2xl font-black text-rose-500 mt-1">{summary.open}</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-rose-100 bg-rose-50/70 text-rose-500 flex items-center justify-center">
              <AlertCircle size={15} />
            </div>
          </div>

          {/* Card 3: PROSES */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 inline-block shadow-sm" />
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">PROSES</p>
              </div>
              <p className="text-2xl font-black text-amber-500 mt-1">{summary.inProgress}</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-amber-100 bg-amber-50/70 text-amber-500 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>

          {/* Card 4: CLOSE */}
          <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 inline-block shadow-sm" />
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">CLOSE</p>
              </div>
              <p className="text-2xl font-black text-emerald-500 mt-1">{summary.closed}</p>
            </div>
            <div className="w-8 h-8 rounded-lg border border-emerald-100 bg-emerald-50/70 text-emerald-500 flex items-center justify-center">
              <CheckCircle size={15} />
            </div>
          </div>
        </div>

        {/* Tabel Laporan dengan Header Navy (#23406E), Sudut Atas Melengkung, dan Garis Grid */}
        <div className="overflow-x-auto rounded-t-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#23406E] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-12">NO</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">ID DEFECT</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">TGL TEMUAN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">BANGUNAN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">DENAH</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">DISIPLIN</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">KATEGORI</th>
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">JENIS TEMUAN</th>
                {attachmentMode === 'foto' && (
                  <>
                    <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">DENAH LOKASI</th>
                    <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">BUKTI DEFECT</th>
                  </>
                )}
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">CATATAN AWAL</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-20">INFO SLA</th>
                <th className="py-3.5 px-3 border-r border-slate-400/30 text-center w-24">TGL SELESAI</th>
                {attachmentMode === 'foto' && (
                  <th className="py-3.5 px-3 border-r border-slate-400/30 text-center">BUKTI SELESAI</th>
                )}
                <th className="py-3.5 px-4 border-r border-slate-400/30 text-center">CATATAN ACTION</th>
                <th className="py-3.5 px-3 text-center">STATUS AKHIR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredReport.map((item, idx) => {
                const sla = calculateSlaStatus(item.defect_date, item.sla_days, item.action_date);
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDocItem(item)}
                    title="Klik untuk membuka form cetak NCR / Defect"
                    className="hover:bg-blue-50/70 dark:hover:bg-slate-700/60 cursor-pointer transition-colors bg-white dark:bg-slate-800"
                  >
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-600 dark:text-slate-300">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-white whitespace-nowrap">
                      {item.defect_code}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300">
                      {item.defect_date}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {item.building_name}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                      {item.floorplan_name}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                      {item.discipline}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.defect_category}
                    </td>
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-white min-w-[160px]">
                      {item.defect_type}
                    </td>
                    {attachmentMode === 'foto' && (
                      <>
                        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
                          {item.floorplan_image ? (
                            <img src={item.floorplan_image} alt="Denah Lokasi" className="w-16 h-20 object-contain mx-auto rounded border border-slate-200 bg-white shadow-xs" />
                          ) : (
                            <span className="text-slate-300 font-bold text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-center min-w-[110px]">
                          {(item.defect_photo || []).length > 0 ? (
                            <div className="flex flex-col items-center gap-1.5">
                              {(item.defect_photo || []).slice(0, 2).map((src, i) => (
                                <img key={i} src={src} alt={`Bukti Defect ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-xs" />
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold text-[11px]">N/A</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 min-w-[140px]">
                      {item.notes && item.notes.trim() !== '' ? item.notes : '-'}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-emerald-600">
                      {sla.text}
                    </td>
                    <td className="py-3.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300">
                      {item.action_date || '-'}
                    </td>
                    {attachmentMode === 'foto' && (
                      <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-700 text-center min-w-[110px]">
                        {(item.action_photos || []).length > 0 ? (
                          <div className="flex flex-col items-center gap-1.5">
                            {(item.action_photos || []).slice(0, 2).map((src, i) => (
                              <img key={i} src={src} alt={`Bukti Selesai ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-xs" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold text-[11px]">N/A</span>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 min-w-[140px]">
                      {item.action_note && item.action_note.trim() !== '' ? item.action_note : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-extrabold uppercase whitespace-nowrap">
                      <span className={
                        item.current_status === 'Close'
                          ? 'text-emerald-600'
                          : item.current_status === 'Proses Perbaikan'
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }>
                        {item.current_status === 'Close' ? 'CLOSE' : item.current_status === 'Proses Perbaikan' ? 'PROSES' : 'OPEN'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredReport.length === 0 && (
                <tr>
                  <td colSpan={attachmentMode === 'foto' ? 16 : 13} className="p-8 text-center text-slate-400 font-bold">
                    Belum ada data laporan untuk ditampilkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDocItem && (
        <DocumentFormPreviewModal data={selectedDocItem} db={db} onClose={() => setPreviewDocData ? setPreviewDocData(null) : setSelectedDocItem(null)} />
      )}

      {/* Template Khusus Export PDF A4 Landscape sesuai image_a6768c.jpg (Ringkas) & image_a6df88.jpg (Lengkap + Foto) */}
      {isPrintingReport && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
          <div id="pqcs-report-pdf-container" style={{ width: '1122px', backgroundColor: '#FFFFFF', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0F172A' }}>
            {reportPages.map((pageRows, pageIdx) => (
              <div
                key={pageIdx}
                style={{
                  width: '1122px',
                  height: '794px',
                  padding: '22px 26px 18px 26px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  pageBreakAfter: pageIdx < reportPages.length - 1 ? 'always' : 'auto'
                }}
              >
                <div>
                  {/* Header Dokumen: QUALITY CONTROL REPORT */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '8px', borderBottom: '1.5px solid #1E293B', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '0.06em', color: '#0F172A', textTransform: 'uppercase', lineHeight: 1.1 }}>
                        QUALITY CONTROL REPORT
                      </div>
                      <div style={{ fontSize: '9.5pt', fontWeight: 800, color: '#1E40AF', marginTop: '4px' }}>
                        Project Name: <span style={{ textTransform: 'uppercase' }}>{selectedProjectTitle}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0F172A' }}>
                      Report Date: {formattedReportDate}
                    </div>
                  </div>

                  {/* 4 Summary Cards */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '155px', border: '1px solid #64748B', borderRadius: '6px', padding: '7px 12px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL DEFECT</div>
                      <div style={{ fontSize: '14pt', fontWeight: 900, color: '#1E3A8A', marginTop: '2px' }}>{summary.total}</div>
                    </div>
                    <div style={{ width: '155px', border: '1px solid #64748B', borderRadius: '6px', padding: '7px 12px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} /> OPEN
                      </div>
                      <div style={{ fontSize: '14pt', fontWeight: 900, color: '#EF4444', marginTop: '2px' }}>{summary.open}</div>
                    </div>
                    <div style={{ width: '155px', border: '1px solid #64748B', borderRadius: '6px', padding: '7px 12px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} /> PROSES
                      </div>
                      <div style={{ fontSize: '14pt', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>{summary.inProgress}</div>
                    </div>
                    <div style={{ width: '155px', border: '1px solid #64748B', borderRadius: '6px', padding: '7px 12px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
                      <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} /> CLOSE
                      </div>
                      <div style={{ fontSize: '14pt', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>{summary.closed}</div>
                    </div>
                  </div>

                  {/* Tabel PDF sesuai mode Lampiran */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', border: '1px solid #CBD5E1' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#124578', color: '#FFFFFF', fontWeight: 800, textTransform: 'uppercase', fontSize: '7.5pt' }}>
                        <th style={{ padding: '10px 4px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '28px' }}>NO</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '68px' }}>ID DEFECT</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '68px' }}>TGL<br/>TEMUAN</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '64px' }}>BANGUNAN</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '54px' }}>DENAH</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '66px' }}>DISIPLIN</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '62px' }}>KATEGORI</th>
                        <th style={{ padding: '10px 6px', borderRight: '1px solid #3B6998', textAlign: 'center', width: attachmentMode === 'foto' ? '92px' : '118px' }}>JENIS<br/>TEMUAN</th>
                        {attachmentMode === 'foto' && (
                          <>
                            <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '66px' }}>DENAH<br/>LOKASI</th>
                            <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '74px' }}>BUKTI<br/>DEFECT</th>
                          </>
                        )}
                        <th style={{ padding: '10px 6px', borderRight: '1px solid #3B6998', textAlign: 'center', width: attachmentMode === 'foto' ? '82px' : '112px' }}>CATATAN<br/>AWAL</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '56px' }}>INFO SLA</th>
                        <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '68px' }}>TGL SELESAI</th>
                        {attachmentMode === 'foto' && (
                          <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '74px' }}>BUKTI<br/>SELESAI</th>
                        )}
                        <th style={{ padding: '10px 6px', borderRight: '1px solid #3B6998', textAlign: 'center', width: attachmentMode === 'foto' ? '78px' : '96px' }}>CATATAN<br/>ACTION</th>
                        {attachmentMode === 'ringkas' && (
                          <th style={{ padding: '10px 5px', borderRight: '1px solid #3B6998', textAlign: 'center', width: '58px' }}>PIC CLOSE</th>
                        )}
                        <th style={{ padding: '10px 5px', textAlign: 'center', width: '66px' }}>STATUS<br/>AKHIR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((item, idx) => {
                        const globalIndex = pageIdx * rowsPerPage + idx + 1;
                        const sla = calculateSlaStatus(item.defect_date, item.sla_days, item.action_date);
                        const closerObj = item.inspector_edit
                          ? (db.inspectors || []).find(i => String(i.id) === String(item.inspector_edit))
                          : null;
                        const picClose = item.current_status === 'Close'
                          ? (closerObj?.initial || closerObj?.name || '-')
                          : '-';

                        const statusLabel = item.current_status === 'Close'
                          ? 'CLOSE'
                          : item.current_status === 'Proses Perbaikan'
                          ? 'PROSES PERBAIKAN'
                          : 'OPEN';

                        const statusColor = item.current_status === 'Close'
                          ? '#10B981'
                          : item.current_status === 'Proses Perbaikan'
                          ? '#F59E0B'
                          : '#EF4444';

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', height: attachmentMode === 'foto' ? '82px' : '38px' }}>
                            <td style={{ padding: '5px 4px', borderRight: '1px solid #CBD5E1', textAlign: 'center', color: '#334155' }}>{globalIndex}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{item.defect_code}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', textAlign: 'center', color: '#334155', whiteSpace: 'nowrap' }}>{item.defect_date}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>{item.building_name}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', color: '#334155' }}>{item.floorplan_name}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', color: '#334155' }}>{item.discipline}</td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', color: '#334155', whiteSpace: 'nowrap' }}>{item.defect_category}</td>
                            <td style={{ padding: '5px 6px', borderRight: '1px solid #CBD5E1', color: '#0F172A', lineHeight: 1.25 }}>{item.defect_type}</td>
                            {attachmentMode === 'foto' && (
                              <>
                                <td style={{ padding: '4px', borderRight: '1px solid #CBD5E1', textAlign: 'center', verticalAlign: 'middle' }}>
                                  {item.floorplan_image ? (
                                    <img src={item.floorplan_image} alt="Denah" style={{ width: '44px', height: '66px', objectFit: 'contain', margin: '0 auto', border: '1px solid #CBD5E1', borderRadius: '2px' }} />
                                  ) : (
                                    <span style={{ color: '#94A3B8', fontWeight: 700 }}>N/A</span>
                                  )}
                                </td>
                                <td style={{ padding: '4px', borderRight: '1px solid #CBD5E1', textAlign: 'center', verticalAlign: 'middle' }}>
                                  {(item.defect_photo || [])[0] ? (
                                    <img src={item.defect_photo[0]} alt="Bukti Defect" style={{ width: '54px', height: '66px', objectFit: 'cover', margin: '0 auto', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                                  ) : (
                                    <span style={{ color: '#94A3B8', fontWeight: 700 }}>N/A</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td style={{ padding: '5px 6px', borderRight: '1px solid #CBD5E1', color: '#334155', wordBreak: 'break-word', lineHeight: 1.25 }}>
                              {item.notes && item.notes.trim() !== '' ? item.notes : '-'}
                            </td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 700, color: sla.isLate ? '#EF4444' : '#10B981', whiteSpace: 'nowrap' }}>
                              {sla.text}
                            </td>
                            <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', textAlign: 'center', color: '#334155', whiteSpace: 'nowrap' }}>
                              {item.action_date || '-'}
                            </td>
                            {attachmentMode === 'foto' && (
                              <td style={{ padding: '4px', borderRight: '1px solid #CBD5E1', textAlign: 'center', verticalAlign: 'middle' }}>
                                {(item.action_photos || [])[0] ? (
                                  <img src={item.action_photos[0]} alt="Bukti Selesai" style={{ width: '54px', height: '66px', objectFit: 'cover', margin: '0 auto', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                                ) : (
                                  <span style={{ color: '#94A3B8', fontWeight: 700 }}>N/A</span>
                                )}
                              </td>
                            )}
                            <td style={{ padding: '5px 6px', borderRight: '1px solid #CBD5E1', color: '#334155', wordBreak: 'break-word', lineHeight: 1.25 }}>
                              {item.action_note && item.action_note.trim() !== '' ? item.action_note : '-'}
                            </td>
                            {attachmentMode === 'ringkas' && (
                              <td style={{ padding: '5px 5px', borderRight: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                {picClose}
                              </td>
                            )}
                            <td style={{ padding: '5px 5px', textAlign: 'center', fontWeight: 800, color: statusColor, lineHeight: 1.2 }}>
                              {statusLabel}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Halaman */}
                <div style={{ textAlign: 'right', fontSize: '7.5pt', fontWeight: 700, color: '#475569', paddingTop: '6px' }}>
                  Page {pageIdx + 1} of {reportPages.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- SETTINGS VIEW ---
function SettingsView({ db, setDb, darkMode }) {
  const [name, setName] = useState('');
  const [initial, setInitial] = useState('');
  const [authority, setAuthority] = useState('Inspector');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetchSupabase('inspectors', 'POST', {
        name: name.trim(),
        initial: initial.trim() || name.trim().slice(0, 3).toUpperCase(),
        authority,
        password: password.trim()
      });
      if (res && res[0]) {
        setDb(prev => ({ ...prev, inspectors: [...(prev.inspectors || []), res[0]] }));
        setName('');
        setInitial('');
        setPassword('');
      }
    } catch (err) {
      alert("Gagal menambah user: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await fetchSupabase(`inspectors?id=eq.${id}`, 'DELETE');
      setDb(prev => ({ ...prev, inspectors: (prev.inspectors || []).filter(i => i.id !== id) }));
    } catch (err) {
      alert("Gagal menghapus user: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Pengaturan Sistem & Manajemen User</h2>
        <p className="text-xs font-medium text-slate-500 mt-1">Kelola akun inspector dan hak akses administrator sistem PQCS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Users size={18} className="text-[#0F4C81]"/> Tambah Akun User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Lengkap *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Inisial</label>
                <input type="text" value={initial} onChange={e => setInitial(e.target.value)} placeholder="ADM" className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Role / Hak Akses</label>
                <select value={authority} onChange={e => setAuthority(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="Admin">Admin</option>
                  <option value="Inspector">Inspector</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password *</label>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className={`w-full p-3 rounded-xl border-2 text-sm font-medium outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} />
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <Plus size={16}/> Tambah User
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <h3 className="text-lg font-black text-slate-800 dark:text-white">Daftar User Terdaftar</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(db.inspectors || []).map(ins => (
              <div key={ins.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{ins.name} <span className="text-xs text-slate-400">({ins.initial})</span></p>
                  <p className="text-[11px] font-semibold text-[#0F4C81] dark:text-blue-400">{ins.authority}</p>
                </div>
                <button onClick={() => handleDeleteUser(ins.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}