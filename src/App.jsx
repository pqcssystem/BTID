import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Settings, Database, AlertCircle, Wrench, FileText, 
  Menu, X, Moon, Sun, Plus, Search, MapPin, Camera, Save, 
  Trash2, Edit, CheckCircle, Clock, Download, Printer, Users, Building, LogOut, UploadCloud, Eye, EyeOff
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// --- PERMANENT DATABASE CONFIGURATION ---
const SUPABASE_API_URL = 'https://arxgvczikhndgetkfdrv.supabase.co/rest/v1/';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FvZweQRCtcfMzLF1wX0wvA_VSywcHGs';

// --- API SUPABASE FETCH HELPER ---
const fetchSupabase = async (endpoint, method = 'GET', data = null) => {
  const url = `${SUPABASE_API_URL}${endpoint}`;
  const headers = {
    'apikey': SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json'
  };
  
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  
  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  const response = await fetch(url, config);
  const text = await response.text();
  let parsedData = null;
  
  if (text) {
    try { parsedData = JSON.parse(text); } 
    catch(e) { parsedData = text; }
  }

  if (!response.ok) {
    throw new Error(parsedData?.message || parsedData?.error || text || response.statusText || 'Gagal terhubung ke database');
  }
  
  if (response.status === 204) return null; 
  return parsedData;
};

// --- MOCK DATA & INITIAL STATE ---
const INITIAL_DATA = {
  inspectors: [], projects: [], buildings: [], defects: [], actions: []
};

// --- DICTIONARY KATEGORI DEFECT ---
const DEFECT_DICTIONARY = {
  'Struktur': ['Posisi titik pancang meleset', 'Kedalaman tidak sesuai spesifikasi', 'Daya dukung tidak tercapai', 'Retak / pecah pada tiang pancang saat pemancangan', 'Sambungan tiang pancang tidak presisi', 'Las tidak full penetration', 'Kepala tiang pecah saat cut-off', 'Dimensi pondasi tidak sesuai gambar', 'Elevasi pondasi tidak rata', 'Mutu beton kurang (keropos / honeycomb)', 'Tulangan kurang', 'Tidak ada lantai kerja', 'lantai kerja tipis', 'Penurunan tanah (settlement)', 'Beton keropos (honeycomb)', 'Retak struktural (structural crack)', 'Retak rambut (hairline crack)', 'Tulangan terlihat / selimut beton kurang', 'Pembesian tidak sesuai detail (kurang sengkang / salah jarak)', 'Slab melendut', 'Level lantai tidak rata', 'Cold joint karena pengecoran terputus', 'Anak tangga beda tinggi', 'Kemiringan tangga tidak sesuai', 'Retak di bordes'],
  'Arsitektur': ['Dinding retak diagonal', 'Dinding bergelombang (tidak rata)', 'Plesteran kopong', 'Sudut dinding tidak siku', 'Perbedaan ketebalan plester', 'Keramik popping / meledak', 'Nat retak', 'Keramik tidak rata (lipping)', 'Pola lantai tidak simetris', 'Hollow tile (kopong saat diketuk)', 'Pintu Tidak presisi / tidak siku', 'Jendela Tidak presisi / tidak siku', 'Pintu seret / tidak menutup rapat', 'Engsel berkarat', 'Air masuk dari celah kusen', 'Sealant retak', 'Plafon retak di joint', 'Plafon melendut', 'Bekas sambungan plafond terlihat', 'Bocor dari atap', 'Warna cat belang', 'Cat mengelupas', 'Permukaan bergelombang', 'Alkali attack', 'Atap Bocor di flashing', 'Genteng bergeser', 'Rangka atap tidak lurus', 'Sekrup atap kurang', 'Sekrup atap salah posisi'],
  'MEP': ['Kebocoran pipa air bersih', 'Tekanan air kecil', 'Sambungan pipa rembes', 'Pipa air kotor tersumbat', 'Backflow', 'Floor drain tidak turun (air menggenang)', 'Closet goyang', 'Sealant wastafel bocor', 'Bau dari floor drain', 'Stop kontak tidak berfungsi', 'MCB sering trip', 'Jalur kabel tidak sesuai SLD', 'Grounding tidak ada', 'Panel box tidak rapi', 'Saklar tidak sejajar', 'Pipa AC bocor', 'Drain AC menetes', 'Outdoor unit berisik', 'Insulasi pipa tidak rapi'],
  'Landscape': ['Tanaman mati', 'Rumput tidak tumbuh merata', 'Sistem irigasi bocor', 'Genangan air di taman', 'Batu sikat / paving turun', 'Pohon miring', 'Tanah ambles', 'Pemadatan kurang'],
  'Infrastructure': ['Retak pada rigid pavement', 'Aspal bergelombang', 'Paving block turun', 'Drainase tidak mengalir', 'Saluran mampet', 'Kemiringan tidak cukup', 'Tutup U-ditch pecah', 'Tekanan air tidak merata', 'Manhole bocor', 'Septic tank rembes', 'Kabel ducting amblas', 'Street light tidak berfungsi', 'Box panel outdoor kemasukan air'],
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
        if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
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
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const x = (xPercent / 100) * canvas.width;
      const y = (yPercent / 100) * canvas.height;
      const radiusOuter = Math.max(canvas.width * 0.015, 12);
      const radiusInner = Math.max(canvas.width * 0.010, 8);

      ctx.beginPath();
      ctx.arc(x, y, radiusOuter, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, radiusInner, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
};

// --- UTILS: Dynamic SLA Calculator ---
const calculateSlaStatus = (defect_date, sla_days, action_date) => {
  if (sla_days === undefined || sla_days === null || sla_days === '' || !defect_date) return { isLate: false, text: '-', style: '' };
  
  const start = new Date(defect_date);
  start.setHours(0,0,0,0);
  
  const end = new Date(action_date && action_date !== '-' ? action_date : new Date());
  end.setHours(0,0,0,0);
  
  const diffTime = end - start;
  const durasiPerbaikan = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const slaRemaining = parseInt(sla_days) - durasiPerbaikan;
  
  if (slaRemaining < 0) {
    return { isLate: true, text: `${slaRemaining} Hari`, style: 'text-red-600 font-bold' };
  }
  return { isLate: false, text: `+${slaRemaining} Hari`, style: 'text-green-600 font-bold' };
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [db, setDb] = useState(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('PQCS_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- MENGAMBIL DATA DARI SUPABASE SAAT APP DIMUAT ---
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
        console.error(error);
        alert("Gagal memuat data awal dari Supabase. Pastikan RLS telah di-disable pada tabel!\n\nError: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      loadDB();
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('PQCS_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  
  const handleLogin = (name, role, userId) => {
     setCurrentUser({ name: name || 'Administrator', role: role || 'Admin', id: userId || 99 });
  };
  
  const handleLogout = () => {
     setCurrentUser(null);
     localStorage.removeItem('HQCS_SavedUser');
     sessionStorage.removeItem('HQCS_TempAuth');
  };

  if (!currentUser) return <LoginView onLogin={handleLogin} darkMode={darkMode} toggleTheme={toggleTheme} />;

  const primaryColor = "bg-[#0F4C81]";
  const primaryText = "text-[#0F4C81]";

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} flex transition-colors duration-200`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeMenu={activeMenu} setActiveMenu={setActiveMenu} primaryColor={primaryColor} darkMode={darkMode} currentUser={currentUser} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 flex justify-between items-center z-10 print:hidden`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold hidden sm:block">PQCS <span className="text-sm font-normal text-gray-500">v1.1</span></h1>
            {isLoading && <span className="ml-4 text-xs font-bold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm"><Clock size={12}/> Sinkronisasi Cloud...</span>}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-300 dark:border-gray-600">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 print:p-0 relative">
          <div className="max-w-7xl mx-auto space-y-6 print:max-w-full">
            {activeMenu === 'dashboard' && <DashboardView db={db} primaryColor={primaryText} />}
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
        if (result && Array.isArray(result)) {
          setInspectorsList(result);
        }
      } catch (err) {
        console.error("Gagal menarik data inspector untuk login:", err);
      }
    };
    fetchInspectors();
  }, []);

  useEffect(() => {
    const tempAuth = sessionStorage.getItem('HQCS_TempAuth');
    const savedUser = localStorage.getItem('HQCS_SavedUser');
    
    let credentials = null;
    if (tempAuth) {
      try { credentials = JSON.parse(tempAuth); } catch(e) {}
    } else if (savedUser) {
      try { credentials = JSON.parse(savedUser); setRememberMe(true); } catch(e) {}
    }

    if (credentials && credentials.username && credentials.password) {
      setUsername(credentials.username);
      setPassword(credentials.password);
      
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
            alert("Sesi login ditolak: User tidak lagi ditemukan di database!");
          }
        } catch(err) {
          console.error("Auto login error:", err);
        } finally {
          setIsAuthenticating(false);
        }
      };
      autoLogin();
    }
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("Nama User dan Password wajib diisi!");
      return;
    }
    
    setIsAuthenticating(true);
    try {
      const queryUrl = `inspectors?select=*&name=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}`;
      const result = await fetchSupabase(queryUrl);
      
      if (result && result.length > 0) {
        const user = result[0];
        if (rememberMe) {
          localStorage.setItem('HQCS_SavedUser', JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem('HQCS_SavedUser');
        }
        sessionStorage.setItem('HQCS_TempAuth', JSON.stringify({ username, password }));
        onLogin(user.name, user.authority || 'Admin', user.id);
      } 
      else {
        alert("Gagal Login: Nama User atau Password tidak cocok pada database!");
      }
    } catch(err) {
      alert("Gagal menghubungi database. Pastikan koneksi lancar dan fitur RLS Supabase telah dimatikan!");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="absolute top-4 right-4">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><Sun size={24} /></button>
      </div>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0F4C81] text-white mb-4 shadow-lg"><Building size={32} /></div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F4C81] dark:text-blue-400">PQCS</h1>
          <p className="text-sm text-gray-500 mt-2">Project Quality Control System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1.5">Nama User</label>
            <select 
              className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#0F4C81] outline-none ${darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-300'}`} 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
            >
              <option value="">-- Pilih Inspector --</option>
              {inspectorsList.map(ins => (
                <option key={ins.id} value={ins.name}>{ins.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-[#0F4C81] outline-none ${darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-300'}`} placeholder="Masukkan password..." value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-[#0F4C81] rounded focus:ring-[#0F4C81]" />
            <label htmlFor="rememberMe" className="text-sm cursor-pointer select-none">Set Default User (Remember Me)</label>
          </div>

          <button type="submit" disabled={isAuthenticating} className="w-full py-3 px-4 mt-2 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-xl transition-all shadow-md font-bold text-lg disabled:opacity-50">
            {isAuthenticating ? 'Login...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- SIDEBAR COMPONENT ---
function Sidebar({ isOpen, setIsOpen, activeMenu, setActiveMenu, primaryColor, darkMode, currentUser }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'data_awal', label: 'Project & Buildings', icon: Database },
    { id: 'input_defect', label: 'Input Defect', icon: AlertCircle },
    { id: 'action', label: 'Action / Perbaikan', icon: Wrench },
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden print:hidden" onClick={() => setIsOpen(false)} />}
      <div className={`fixed md:static inset-y-0 left-0 z-30 w-64 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-[#0F4C81] text-white'} border-r transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
        <div className={`h-16 flex items-center px-6 border-b ${darkMode ? 'border-gray-800' : 'border-blue-900'}`}>
          <div className="flex items-center gap-2 text-white"><Building size={24} /><span className="text-xl font-bold tracking-wider">PQCS</span></div>
          <button onClick={() => setIsOpen(false)} className="ml-auto text-gray-300 md:hidden"><X size={20}/></button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 mt-2 px-2">Menu Utama</div>
          {menuItems.map(menu => {
            const isDisabled = menu.id === 'settings' && currentUser?.role !== 'Admin';
            return (
              <button 
                key={menu.id} 
                disabled={isDisabled}
                onClick={() => { if(!isDisabled) { setActiveMenu(menu.id); if(window.innerWidth < 768) setIsOpen(false); } }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isDisabled 
                    ? 'text-gray-400 opacity-50 cursor-not-allowed'
                    : activeMenu === menu.id 
                      ? (darkMode ? 'bg-gray-800 text-blue-400' : 'bg-white/20 text-white font-semibold') 
                      : (darkMode ? 'text-gray-400 hover:bg-gray-800/50' : 'text-blue-100 hover:bg-white/10')
                }`}
              >
                <menu.icon size={20} /><span>{menu.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

// --- DASHBOARD VIEW ---
function DashboardView({ db }) {
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
    { label: 'Total Defect', value: total, color: 'border-l-blue-500', icon: AlertCircle, text: 'text-blue-500' },
    { label: 'Open', value: actualOpen, color: 'border-l-red-500', icon: AlertCircle, text: 'text-red-500' },
    { label: 'Proses Perbaikan', value: uniqueInProgress, color: 'border-l-yellow-500', icon: Clock, text: 'text-yellow-600' },
    { label: 'Close', value: uniqueClosed, color: 'border-l-green-500', icon: CheckCircle, text: 'text-green-500' },
  ];

  const getDefectStatus = (defectId) => {
    const actions = filteredActions.filter(a => a.defect_id === defectId);
    if(actions.length === 0) return 'Open';
    return actions[actions.length - 1].status;
  };

  const categories = { 'Minor': 0, 'Major': 0, 'Hard (NCR)': 0 };
  
  let slaOnTime = 0;
  let slaLate = 0;
  const disciplineSla = {};
  
  const disciplines = filteredDefects.reduce((acc, curr) => { 
    if (!acc[curr.discipline]) {
      acc[curr.discipline] = { name: curr.discipline, total: 0, open: 0, in_progress: 0, close: 0 };
      disciplineSla[curr.discipline] = { name: curr.discipline, onTime: 0, late: 0 };
    }
    acc[curr.discipline].total += 1;
    
    if(curr.defect_category) categories[curr.defect_category] = (categories[curr.defect_category] || 0) + 1;

    const status = getDefectStatus(curr.id);
    if (status === 'Open') acc[curr.discipline].open += 1;
    else if (status === 'Proses Perbaikan') acc[curr.discipline].in_progress += 1;
    else if (status === 'Close') acc[curr.discipline].close += 1;
    
    const actions = filteredActions.filter(a => a.defect_id === curr.id);
    const lastActionDate = actions.length > 0 ? actions[actions.length - 1].action_date : '-';
    const slaInfo = calculateSlaStatus(curr.defect_date, curr.sla_days, lastActionDate);
    
    if (slaInfo.isLate) {
      slaLate++;
      disciplineSla[curr.discipline].late++;
    } else {
      slaOnTime++;
      disciplineSla[curr.discipline].onTime++;
    }
    
    return acc; 
  }, {});

  const discArray = Object.values(disciplines).sort((a, b) => b.total - a.total);
  const maxDiscipline = discArray.length > 0 ? Math.max(...discArray.map(d => d.total)) : 1;

  const slaDiscArray = Object.values(disciplineSla).sort((a, b) => (b.onTime + b.late) - (a.onTime + a.late));
  const maxSlaDiscipline = slaDiscArray.length > 0 ? Math.max(...slaDiscArray.map(d => d.onTime + d.late)) : 1;
  const totalSlaCalculated = slaOnTime + slaLate;

  const statusDonutData = [
    { value: actualOpen, color: '#ef4444' }, 
    { value: uniqueInProgress, color: '#eab308' },
    { value: uniqueClosed, color: '#22c55e' }
  ];
  let statusPercent = 0;

  const slaDonutData = [
    { value: slaOnTime, color: '#22c55e' },
    { value: slaLate, color: '#ef4444' }
  ];
  let slaPercent = 0;

  const selectedProjectName = selectedProjectId === 'ALL' ? 'SELURUH PROYEK' : (db.projects || []).find(p => p.id === parseInt(selectedProjectId))?.project_name;

  const handlePrint = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      const element = document.getElementById('dashboard-printable-area');
      const opt = {
        margin: 0, 
        filename: `Dashboard_PQCS_${selectedProjectName?.replace(/\s+/g, '_') || 'ALL'}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
      };

      if (window.html2pdf) {
         window.html2pdf().set(opt).from(element).save().then(() => setIsExportingPDF(false));
      } else {
         const script = document.createElement('script');
         script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
         script.onload = () => { window.html2pdf().set(opt).from(element).save().then(() => setIsExportingPDF(false)); };
         document.head.appendChild(script);
      }
    }, 300); 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <label className="font-bold text-gray-700 dark:text-gray-300">Filter Proyek:</label>
          <select 
            className="p-2 border rounded-lg focus:ring-2 focus:ring-[#0F4C81] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="ALL">Data Seluruh Proyek</option>
            {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
        <button onClick={handlePrint} disabled={isExportingPDF} className="px-4 py-2 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50">
          <Printer size={16}/> {isExportingPDF ? 'Mengekspor PDF...' : 'Cetak Dashboard (PDF)'}
        </button>
      </div>

      <div id="dashboard-printable-area" 
           className={isExportingPDF ? 'bg-white text-black p-10 flex flex-col justify-between mx-auto overflow-hidden shadow-none' : 'space-y-6'}
           style={isExportingPDF ? { width: '794px', height: '1123px' } : {}}>
        <div className={`${isExportingPDF ? 'text-center border-b-2 border-gray-800 pb-4 mb-2' : 'mb-2'}`}>
          {isExportingPDF && <h1 className="text-xl font-black uppercase tracking-widest text-[#0F4C81] mb-2">PQCS DASHBOARD REPORT</h1>}
          <h2 className={`font-black text-[#0F4C81] uppercase tracking-wide ${isExportingPDF ? 'text-2xl bg-gray-100 py-2 rounded' : 'text-3xl dark:text-blue-400'}`}>
             {selectedProjectName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Ringkasan Status Quality Control {isExportingPDF && `| Dicetak pada: ${new Date().toLocaleString('id-ID')}`}</p>
        </div>

        <div className={`grid ${isExportingPDF ? 'grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'} gap-4`}>
          {stats.map((stat, i) => (
            <div key={i} className={`p-4 rounded-2xl shadow-sm border border-gray-200 border-l-4 ${stat.color} ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 dark:border-gray-700'} flex items-center justify-between`}>
              <div>
                <p className={`text-xs font-medium ${isExportingPDF ? 'text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${isExportingPDF ? 'text-gray-900' : 'text-gray-800 dark:text-white'}`}>{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${isExportingPDF ? 'bg-gray-100' : 'bg-gray-50 dark:bg-gray-900'} ${stat.text}`}>
                <stat.icon size={20} />
              </div>
            </div>
          ))}
        </div>

        {/* GRAFIK 1: STATUS TERBUKA / TERTUTUP */}
        <div className={`grid ${isExportingPDF ? 'grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
          <div className={`${isExportingPDF ? 'col-span-1' : 'lg:col-span-1'} p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
            <h3 className={`text-sm font-bold mb-4 w-full text-left ${isExportingPDF ? 'text-black' : ''}`}>Komposisi Status Defect</h3>
            {total === 0 ? (
              <p className="text-gray-400 italic py-10 text-xs">Belum ada data</p>
            ) : (
              <div className="relative w-32 h-32 mb-4">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {statusDonutData.map((slice, i) => {
                    const percent = (slice.value / total) * 100;
                    const dashArray = `${percent} ${100 - percent}`;
                    const dashOffset = 100 - statusPercent;
                    statusPercent += percent;
                    return slice.value > 0 ? (
                      <circle key={i} r="15.91549430918954" cx="18" cy="18" fill="transparent" stroke={slice.color} strokeWidth="4" strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                    ) : null;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${isExportingPDF ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{total}</span>
                </div>
              </div>
            )}
            <div className={`flex gap-2 text-[10px] font-bold w-full justify-center flex-wrap ${isExportingPDF ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`}>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Open ({actualOpen})</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Proses ({uniqueInProgress})</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Close ({uniqueClosed})</div>
            </div>
          </div>

          <div className={`${isExportingPDF ? 'col-span-2' : 'lg:col-span-2'} p-6 rounded-2xl shadow-sm border border-gray-200 ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
            <h3 className={`text-sm font-bold mb-4 ${isExportingPDF ? 'text-black' : ''}`}>Distribusi Defect Berdasarkan Disiplin</h3>
            {discArray.length === 0 ? (
              <p className="text-center text-gray-400 py-10 italic text-xs">Belum ada data</p>
            ) : (
              <div className="h-40 flex items-end gap-2 sm:gap-6 border-b border-gray-200 dark:border-gray-700 pb-2 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-l border-gray-200 dark:border-gray-700 pl-1 pb-2">
                   <div className="w-full h-0 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-start"><span className={`text-[10px] text-gray-400 -mt-2 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>{maxDiscipline}</span></div>
                   <div className="w-full h-0 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-start"><span className={`text-[10px] text-gray-400 -mt-2 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>{Math.ceil(maxDiscipline/2)}</span></div>
                   <div className="w-full h-0 flex items-end"><span className={`text-[10px] text-gray-400 mb-1 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>0</span></div>
                </div>
                {discArray.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center group relative z-10 h-full pt-6">
                    {!isExportingPDF && (
                      <div className="absolute -top-6 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20">
                        Total: {d.total} (O: {d.open}, P: {d.in_progress}, C: {d.close})
                      </div>
                    )}
                    <div className={`w-full max-w-[30px] flex flex-col justify-end h-full rounded-t-sm overflow-hidden ${isExportingPDF ? 'bg-gray-100 border border-gray-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div style={{height: `${(d.open / maxDiscipline) * 100}%`}} className="w-full bg-red-500"></div>
                      <div style={{height: `${(d.in_progress / maxDiscipline) * 100}%`}} className="w-full bg-yellow-500"></div>
                      <div style={{height: `${(d.close / maxDiscipline) * 100}%`}} className="w-full bg-green-500"></div>
                    </div>
                    <span className={`text-[9px] font-bold mt-1 truncate w-full text-center ${isExportingPDF ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`} title={d.name}>{d.name.substring(0,6)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GRAFIK 2: KEPATUHAN SLA */}
        <div className={`grid ${isExportingPDF ? 'grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'} gap-6`}>
          <div className={`${isExportingPDF ? 'col-span-1' : 'lg:col-span-1'} p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
            <h3 className={`text-sm font-bold mb-4 w-full text-left ${isExportingPDF ? 'text-black' : ''}`}>Kepatuhan SLA (Keseluruhan)</h3>
            {totalSlaCalculated === 0 ? (
              <p className="text-gray-400 italic py-10 text-xs">Belum ada data</p>
            ) : (
              <div className="relative w-32 h-32 mb-4">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {slaDonutData.map((slice, i) => {
                    const percent = (slice.value / totalSlaCalculated) * 100;
                    const dashArray = `${percent} ${100 - percent}`;
                    const dashOffset = 100 - slaPercent;
                    slaPercent += percent;
                    return slice.value > 0 ? (
                      <circle key={i} r="15.91549430918954" cx="18" cy="18" fill="transparent" stroke={slice.color} strokeWidth="4" strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                    ) : null;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${isExportingPDF ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{totalSlaCalculated}</span>
                </div>
              </div>
            )}
            <div className={`flex gap-2 text-[10px] font-bold w-full justify-center flex-wrap ${isExportingPDF ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`}>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Tepat Waktu ({slaOnTime})</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Terlambat ({slaLate})</div>
            </div>
          </div>

          <div className={`${isExportingPDF ? 'col-span-2' : 'lg:col-span-2'} p-6 rounded-2xl shadow-sm border border-gray-200 ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}>
            <h3 className={`text-sm font-bold mb-4 ${isExportingPDF ? 'text-black' : ''}`}>SLA Berdasarkan Disiplin</h3>
            {slaDiscArray.length === 0 ? (
              <p className="text-center text-gray-400 py-10 italic text-xs">Belum ada data</p>
            ) : (
              <div className="h-40 flex items-end gap-2 sm:gap-6 border-b border-gray-200 dark:border-gray-700 pb-2 relative">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-l border-gray-200 dark:border-gray-700 pl-1 pb-2">
                   <div className="w-full h-0 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-start"><span className={`text-[10px] text-gray-400 -mt-2 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>{maxSlaDiscipline}</span></div>
                   <div className="w-full h-0 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-start"><span className={`text-[10px] text-gray-400 -mt-2 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>{Math.ceil(maxSlaDiscipline/2)}</span></div>
                   <div className="w-full h-0 flex items-end"><span className={`text-[10px] text-gray-400 mb-1 ml-1 ${isExportingPDF ? 'text-gray-600' : ''}`}>0</span></div>
                </div>
                {slaDiscArray.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center group relative z-10 h-full pt-6">
                    {!isExportingPDF && (
                      <div className="absolute -top-6 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20">
                        Total: {d.onTime + d.late} (Tepat: {d.onTime}, Telat: {d.late})
                      </div>
                    )}
                    <div className={`w-full max-w-[30px] flex flex-col justify-end h-full rounded-t-sm overflow-hidden ${isExportingPDF ? 'bg-gray-100 border border-gray-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div style={{height: `${(d.late / maxSlaDiscipline) * 100}%`}} className="w-full bg-red-500"></div>
                      <div style={{height: `${(d.onTime / maxSlaDiscipline) * 100}%`}} className="w-full bg-green-500"></div>
                    </div>
                    <span className={`text-[9px] font-bold mt-1 truncate w-full text-center ${isExportingPDF ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`} title={d.name}>{d.name.substring(0,6)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`grid ${isExportingPDF ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3'} gap-4`}>
           <div className={`p-4 rounded-xl border border-gray-200 text-center ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
               <p className="text-xs text-gray-500 font-bold uppercase mb-1">Kategori Minor</p>
               <p className="text-2xl font-bold text-blue-600">{categories['Minor']}</p>
           </div>
           <div className={`p-4 rounded-xl border border-gray-200 text-center ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
               <p className="text-xs text-gray-500 font-bold uppercase mb-1">Kategori Major</p>
               <p className="text-2xl font-bold text-orange-500">{categories['Major']}</p>
           </div>
           <div className={`p-4 rounded-xl border border-gray-200 text-center ${isExportingPDF ? 'bg-white shadow-none' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
               <p className="text-xs text-gray-500 font-bold uppercase mb-1">Kategori Hard (NCR)</p>
               <p className="text-2xl font-bold text-red-600">{categories['Hard (NCR)']}</p>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- DATA MASTER VIEW (Data Project & Buildings) ---
function DataMasterView({ db, setDb, darkMode, currentUser }) {
  const isAdmin = currentUser?.role === 'Admin';
  const inputClass = `w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-[#0F4C81] outline-none transition-all text-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} ${!isAdmin ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-80' : ''}`;
  const labelClass = "block text-sm font-bold mb-1.5 text-gray-800 dark:text-gray-200";

  const [pbMode, setPbMode] = useState('create_new');
  const [activeParentId, setActiveParentId] = useState(null); 
  const [isNewProject, setIsNewProject] = useState((db.projects || []).length === 0);

  const [projectForm, setProjectForm] = useState({ project_id: '', project_name: '', project_address: '', building_name: '' });
  const [tempFloorplans, setTempFloorplans] = useState([]);
  const [fpFileInput, setFpFileInput] = useState(null);
  const [fpNameInput, setFpNameInput] = useState('');

  const resetPbForm = () => {
    setPbMode('create_new'); 
    setActiveParentId(null); 
    setIsNewProject((db.projects || []).length === 0);
    setProjectForm({ project_id: '', project_name: '', project_address: '', building_name: '' });
    setTempFloorplans([]); 
    setFpFileInput(null); 
    setFpNameInput('');
  };

  const handleProjectChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW') { setIsNewProject(true); setProjectForm({ ...projectForm, project_id: '', project_name: '', project_address: '' }); } 
    else if (val === '') { setIsNewProject(false); setProjectForm({ ...projectForm, project_id: '', project_name: '', project_address: '' }); } 
    else {
      setIsNewProject(false);
      const selectedProj = (db.projects || []).find(p => p.id === parseInt(val));
      if (selectedProj) setProjectForm({ ...projectForm, project_id: selectedProj.id, project_name: selectedProj.project_name, project_address: selectedProj.project_address });
    }
  };

  const handleAddTempFloorplan = async () => {
    if (!fpNameInput.trim()) { alert("Masukkan nama denah terlebih dahulu."); return; }
    if (!fpFileInput) { alert("Pilih file gambar denah terlebih dahulu."); return; }

    const newFileName = `${fpNameInput.trim()}.jpg`; 
    const base64Image = await compressImage(fpFileInput); 

    const newFp = { id: Date.now(), name: newFileName, image: base64Image };
    setTempFloorplans([...tempFloorplans, newFp]);
    setFpFileInput(null); setFpNameInput('');
    document.getElementById('upload_floorplan_input').value = "";
  };

  const handleSaveProjectBuilding = async (e) => {
    if (e) e.preventDefault();
    try {
      if (pbMode === 'create_new' || pbMode === 'add_building') {
        let currentProjectId = projectForm.project_id;
        let newProjData = null;
        
        if (isNewProject && pbMode === 'create_new') {
          if (!projectForm.project_name || projectForm.project_name.trim() === '') return alert("Peringatan: Lengkapi nama proyek baru!");
          const payloadProj = { project_name: projectForm.project_name.trim(), project_address: projectForm.project_address || '-' };
          const resProj = await fetchSupabase('projects', 'POST', payloadProj);
          newProjData = Array.isArray(resProj) ? resProj[0] : resProj;
          if (!newProjData) throw new Error("Data Proyek tidak kembali dari server. Pastikan RLS dimatikan.");
          currentProjectId = newProjData.id;
        } else {
          if (!currentProjectId || currentProjectId === '') return alert("Peringatan: Pilih proyek terlebih dahulu dari dropdown!");
        }
        
        if (!projectForm.building_name || projectForm.building_name.trim() === '') return alert("Peringatan: Lengkapi nama bangunan!");
        const payloadBldg = { project_id: parseInt(currentProjectId), building_name: projectForm.building_name.trim(), floorplans: tempFloorplans };
        const resBldg = await fetchSupabase('buildings', 'POST', payloadBldg);
        const newBldgData = Array.isArray(resBldg) ? resBldg[0] : resBldg;
        if (!newBldgData) throw new Error("Data Bangunan tidak kembali dari server. Pastikan RLS dimatikan.");
        
        setDb(prev => {
          const nextProjects = newProjData ? [...(prev.projects || []), newProjData] : (prev.projects || []);
          return { ...prev, projects: nextProjects, buildings: [...(prev.buildings || []), newBldgData] };
        });
        
        alert(isNewProject && pbMode === 'create_new' ? "Data Proyek & Bangunan berhasil disimpan!" : "Bangunan berhasil ditambahkan!");
        resetPbForm();

      } else if (pbMode === 'edit_project') {
        if (!projectForm.project_name || projectForm.project_name.trim() === '') return alert("Peringatan: Lengkapi nama proyek!");
        const payloadProj = { project_name: projectForm.project_name.trim(), project_address: projectForm.project_address || '-' };
        const resProj = await fetchSupabase(`projects?id=eq.${activeParentId}`, 'PATCH', payloadProj);
        const updatedProj = Array.isArray(resProj) ? resProj[0] : resProj;
        if (!updatedProj) throw new Error("Gagal mengupdate proyek. Pastikan RLS dimatikan.");
        
        setDb(prev => ({ ...prev, projects: (prev.projects || []).map(p => p.id === activeParentId ? updatedProj : p) }));
        alert("Proyek berhasil diupdate!");
        resetPbForm();

      } else if (pbMode === 'edit_building') {
        if (!projectForm.building_name || projectForm.building_name.trim() === '') return alert("Peringatan: Lengkapi nama bangunan!");
        const payloadBldg = { building_name: projectForm.building_name.trim(), floorplans: tempFloorplans };
        const resBldg = await fetchSupabase(`buildings?id=eq.${activeParentId}`, 'PATCH', payloadBldg);
        const updatedBldg = Array.isArray(resBldg) ? resBldg[0] : resBldg;
        if (!updatedBldg) throw new Error("Gagal mengupdate bangunan. Pastikan RLS dimatikan.");
        
        setDb(prev => ({ ...prev, buildings: (prev.buildings || []).map(b => b.id === activeParentId ? updatedBldg : b) }));
        alert("Bangunan berhasil diupdate!");
        resetPbForm();
      }
    } catch (err) { alert("Error Menyimpan Data: " + err.message); }
  };

  const handleDeleteBuilding = async (bId) => {
    if(!window.confirm("Yakin hapus bangunan ini?")) return;
    try {
      await fetchSupabase(`buildings?id=eq.${bId}`, 'DELETE');
    } catch(err) { console.warn("Peringatan hapus bangunan:", err.message); }
    setDb(prev => ({ ...prev, buildings: (prev.buildings || []).filter(bld => bld.id !== bId) }));
    if(pbMode === 'edit_building' && activeParentId === bId) resetPbForm();
  };

  const handleDeleteProject = async (pId) => {
    if(!window.confirm("Yakin hapus proyek? Semua bangunan harus dikosongkan dahulu.")) return;
    try {
      await fetchSupabase(`buildings?project_id=eq.${pId}`, 'DELETE');
      await fetchSupabase(`projects?id=eq.${pId}`, 'DELETE');
    } catch(err) { console.warn("Peringatan hapus proyek:", err.message); }
    setDb(prev => ({ ...prev, projects: (prev.projects || []).filter(proj => proj.id !== pId), buildings: (prev.buildings || []).filter(bld => bld.project_id !== pId) }));
    if(pbMode === 'edit_project' && activeParentId === pId) resetPbForm();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
      <div className="p-4 md:p-6">
          <div className="space-y-8">
            <div className="max-w-4xl mx-auto">
              {pbMode !== 'create_new' && (
                <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300"><Edit size={18} /><span className="font-bold text-sm">Mode Edit</span></div>
                  <button onClick={resetPbForm} disabled={!isAdmin} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isAdmin ? 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'}`}>Batal / Kembali</button>
                </div>
              )}

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-8 bg-white dark:bg-gray-800 shadow-sm relative transition-all">
                <div className={pbMode === 'create_new' ? "mb-8" : "mb-4"}>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20} className="text-[#0F4C81]"/> Data Proyek</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Nama Proyek</label>
                      {pbMode === 'edit_project' ? (
                        <input type="text" className={inputClass} disabled={!isAdmin} value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name: e.target.value})} />
                      ) : pbMode === 'edit_building' || pbMode === 'add_building' ? (
                        <input type="text" className={`${inputClass} bg-gray-100 cursor-not-allowed`} disabled={!isAdmin} value={projectForm.project_name} readOnly />
                      ) : !isNewProject ? (
                        <select className={inputClass} disabled={!isAdmin} value={projectForm.project_id || ''} onChange={handleProjectChange}>
                          <option value="" disabled>-- Pilih Proyek --</option>
                          {(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                          {isAdmin && <option value="NEW" className="font-bold text-blue-600">+ Buat Proyek Baru</option>}
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" className={inputClass} disabled={!isAdmin} placeholder="Nama Proyek Baru" value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name: e.target.value})} />
                          {(db.projects || []).length > 0 && <button type="button" onClick={() => setIsNewProject(false)} disabled={!isAdmin} className={`px-4 py-2 rounded-lg text-sm font-bold ${isAdmin ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Batal</button>}
                        </div>
                      )}
                    </div>
                    <div><label className={labelClass}>Alamat Proyek (Opsional)</label><textarea rows="3" disabled={!isAdmin} className={`${inputClass} ${(!isNewProject && pbMode !== 'edit_project') ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={projectForm.project_address} onChange={e => setProjectForm({...projectForm, project_address: e.target.value})} readOnly={!isNewProject && pbMode !== 'edit_project'}></textarea></div>
                  </div>
                </div>

                {(pbMode === 'create_new' || pbMode === 'add_building' || pbMode === 'edit_building') && (
                  <div className={pbMode === 'create_new' ? "pt-6 border-t dark:border-gray-700" : "pt-4 border-t dark:border-gray-700 mt-4"}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Home size={20} className="text-[#0F4C81]"/> Informasi Bangunan</h3>
                    <div className="space-y-4">
                      <div><label className={labelClass}>Nama Bangunan</label><input type="text" disabled={!isAdmin} className={inputClass} placeholder="Blok A" value={projectForm.building_name} onChange={e => setProjectForm({...projectForm, building_name: e.target.value})} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 p-4 rounded-xl bg-gray-50">
                        <div className="col-span-1 md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Tambah Denah (Opsional)</label></div>
                        <div><label className="block text-sm font-medium mb-1">1. Ketik Nama Denah</label><input type="text" disabled={!isAdmin} className={`w-full p-2 rounded border ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`} placeholder="Lantai 1" value={fpNameInput} onChange={e => setFpNameInput(e.target.value)} /></div>
                        <div>
                          <label className="block text-sm font-medium mb-1">2. Pilih File Denah</label>
                          <label className={`inline-flex items-center justify-center text-sm px-6 py-2 font-medium border rounded-lg w-full text-center ${isAdmin ? 'bg-white cursor-pointer hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                            {fpFileInput ? 'File Terpilih ✓' : 'Pilih File Gambar'}
                            <input type="file" disabled={!isAdmin} id="upload_floorplan_input" accept="image/*" className="hidden" onChange={e => setFpFileInput(e.target.files[0])} />
                          </label>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                           <button type="button" disabled={!isAdmin} onClick={handleAddTempFloorplan} className={`w-full py-2 rounded-lg font-medium text-sm ${isAdmin ? 'bg-[#5cb85c] hover:bg-[#4cae4c] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>+ Simpan Denah Sementara</button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="bg-white border border-gray-200 p-4 rounded-xl min-h-[120px]">
                        {tempFloorplans.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {tempFloorplans.map((fp) => (
                              <div key={fp.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-gray-50 relative group">
                                <div className="h-24 bg-white flex items-center justify-center p-2"><img src={fp.image} alt={fp.name} className="max-h-full max-w-full object-contain" /></div>
                                <div className="p-2 flex justify-between items-center border-t border-gray-200">
                                  <span className="text-[10px] font-medium text-gray-600 truncate pr-2" title={fp.name}>{fp.name}</span>
                                  <button type="button" disabled={!isAdmin} onClick={() => setTempFloorplans(tempFloorplans.filter(f=>f.id!==fp.id))} className={`p-1 ${isAdmin ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}><Trash2 size={12}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">Belum ada denah</div>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
                  <button type="button" disabled={!isAdmin} onClick={handleSaveProjectBuilding} className={`px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-md ${!isAdmin ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : pbMode.includes('edit') ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-[#0F4C81] hover:bg-blue-800 text-white'}`}>
                    <Save size={18}/> Simpan
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden mt-8">
              <div className="p-5 flex justify-between items-center border-b dark:border-gray-700 bg-gray-50"><h3 className="text-lg font-bold flex items-center gap-2"><Database size={20} className="text-[#0F4C81]" /> List Proyek & Bangunan</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead className="bg-gray-100 border-b"><tr><th className="p-4 w-12 text-center">No</th><th className="p-4 w-1/3">Informasi Proyek</th><th className="p-4">Daftar Bangunan & Denah</th><th className="p-4 text-center w-32">Aksi Proyek</th></tr></thead>
                  <tbody>
                    {(db.projects || []).length === 0 ? (
                      <tr><td colSpan="4" className="text-center p-10 text-gray-500">Database Kosong.</td></tr>
                    ) : (
                      (db.projects || []).map((p, index) => (
                        <tr key={p.id} className="border-b align-top hover:bg-gray-50">
                          <td className="p-4 text-center font-bold text-gray-500">{index + 1}</td>
                          <td className="p-4"><h4 className="font-bold text-[#0F4C81] text-base mb-1">{p.project_name}</h4><p className="text-xs text-gray-500">{p.project_address}</p></td>
                          <td className="p-4">
                            {(db.buildings || []).filter(b => b.project_id === p.id).length === 0 ? (
                              <p className="text-xs text-gray-400 italic mb-2">Belum ada bangunan.</p>
                            ) : (
                              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden mb-3 bg-white">
                                <thead className="bg-gray-50"><tr><th className="p-2 border-b text-left">Nama Bangunan</th><th className="p-2 border-b text-center">Denah</th><th className="p-2 border-b text-center">Aksi</th></tr></thead>
                                <tbody>
                                  {(db.buildings || []).filter(b => b.project_id === p.id).map(b => (
                                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                                      <td className="p-2 font-medium">{b.building_name}</td>
                                      <td className="p-2 text-center"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">{b.floorplans?.length || 0}</span></td>
                                      <td className="p-2 text-center flex justify-center gap-1">
                                        <button disabled={!isAdmin} onClick={() => {
                                          const proj = (db.projects || []).find(proj => proj.id === b.project_id);
                                          setPbMode('edit_building'); setActiveParentId(b.id); setIsNewProject(false);
                                          setProjectForm({ project_id: proj?.id, project_name: proj?.project_name || '', project_address: proj?.project_address || '', building_name: b.building_name });
                                          setTempFloorplans(b.floorplans || []); window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }} className={`px-2 py-1 rounded ${isAdmin ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'}`}><Edit size={14}/></button>
                                        <button disabled={!isAdmin} onClick={() => handleDeleteBuilding(b.id)} className={`px-2 py-1 rounded ${isAdmin ? 'text-red-500 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}><Trash2 size={14}/></button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            <button disabled={!isAdmin} onClick={() => { setPbMode('add_building'); setActiveParentId(p.id); setIsNewProject(false); setProjectForm({ project_id: p.id, project_name: p.project_name, project_address: p.project_address, building_name: '' }); setTempFloorplans([]); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-md border ${isAdmin ? 'text-[#5cb85c] hover:text-[#4cae4c] bg-green-50 border-green-200' : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'}`}><Plus size={14}/> Tambah Bangunan</button>
                          </td>
                          <td className="p-4 text-center align-middle">
                            <div className="flex justify-center gap-2">
                              <button disabled={!isAdmin} onClick={() => { setPbMode('edit_project'); setActiveParentId(p.id); setIsNewProject(true); setProjectForm({ project_id: p.id, project_name: p.project_name, project_address: p.project_address, building_name: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`px-3 py-2 rounded-lg border ${isAdmin ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed'}`}><Edit size={14}/></button>
                              <button disabled={!isAdmin} onClick={() => handleDeleteProject(p.id)} className={`px-3 py-2 rounded-lg border ${isAdmin ? 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100' : 'text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed'}`}><Trash2 size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

// --- INPUT DEFECT VIEW ---
function InputDefectView({ db, setDb, currentUser, darkMode, primaryColor }) {
  const [marker, setMarker] = useState(null);
  const [photoPreview, setPhotoPreview] = useState([]);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newDefectType, setNewDefectType] = useState('');
  const [dynamicDefectTypes, setDynamicDefectTypes] = useState([]);
  
  const typeContainerRef = useRef(null);

  const nextId = (db.defects || []).length > 0 ? Math.max(...(db.defects || []).map(d => d.id)) + 1 : 1;
  const defectCodePreview = `DF-${nextId.toString().padStart(5, '0')}`;

  const isViewer = currentUser?.role === 'Viewer';
  // Admin dan User BISA melakukan input defect
  const canSubmit = !isViewer;

  const [formData, setFormData] = useState({
    inspector_id: currentUser?.id || '',
    project_id: '',
    building_id: '',
    floorplan_id: '',
    discipline: 'Struktur',
    defect_type: '',
    defect_category: 'Minor',
    defect_date: new Date().toISOString().split('T')[0],
    sla_days: 7,
    notes: ''
  });

  const inputClass = `w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-[#0F4C81] outline-none transition-all text-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'} ${isViewer ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500' : ''}`;
  const labelClass = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  const currentDiscipline = formData.discipline || 'Struktur';
  const baseTypesForDiscipline = DEFECT_DICTIONARY[currentDiscipline] || DEFECT_DICTIONARY['General'];
  const allDefectTypes = [...new Set([...baseTypesForDiscipline, ...(db.defects || []).filter(d => d.discipline === currentDiscipline).map(d => d.defect_type), ...dynamicDefectTypes])];

  useEffect(() => {
    if (!allDefectTypes.includes(formData.defect_type) && allDefectTypes.length > 0 && !isAddingNewType) {
       setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
    }
  }, [formData.discipline, allDefectTypes, isAddingNewType]);

  const handleCancelNewType = () => {
    setIsAddingNewType(false);
    setNewDefectType('');
    if (allDefectTypes.length > 0) {
      setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (isAddingNewType && typeContainerRef.current && !typeContainerRef.current.contains(event.target)) {
        handleCancelNewType();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingNewType, allDefectTypes]);

  const selectedBuilding = (db.buildings || []).find(b => b.id === formData.building_id);
  const availableFloorplans = selectedBuilding?.floorplans || [];
  const selectedFloorplanImage = availableFloorplans.find(fp => fp.id === parseInt(formData.floorplan_id))?.image;

  useEffect(() => {
    setMarker(null);
    if (availableFloorplans.length > 0) {
      setFormData(prev => ({...prev, floorplan_id: availableFloorplans[0].id}));
    } else {
      setFormData(prev => ({...prev, floorplan_id: ''}));
    }
  }, [formData.building_id]);

  const handleMapClick = (e) => {
    if (!selectedFloorplanImage || isViewer) return; 
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarker({ x, y });
  };

  const handlePhotoUpload = async (e) => {
    if (isViewer) return;
    const files = Array.from(e.target.files);
    const compressedImages = await Promise.all(files.map(f => compressImage(f)));
    setPhotoPreview([...photoPreview, ...compressedImages]);
  };

  const handleReset = () => {
    if (isViewer) return;
    setFormData({ ...formData, project_id: '', building_id: '', floorplan_id: '', notes: '', sla_days: 0 });
    setMarker(null); setPhotoPreview([]); setIsAddingNewType(false); setNewDefectType(''); setDynamicDefectTypes([]);
  };

  // VALIDASI KELENGKAPAN FORM SEBELUM SIMPAN
  const missingFields = [];
  if (!formData.project_id) missingFields.push("Nama Proyek");
  if (!formData.building_id) missingFields.push("Bangunan");
  if (!formData.defect_type || formData.defect_type === '') missingFields.push("Jenis Defect");
  if (!formData.defect_date) missingFields.push("Tanggal Defect");
  if (formData.sla_days === '' || formData.sla_days === null || formData.sla_days === undefined) missingFields.push("SLA Perbaikan");
  if (photoPreview.length === 0) missingFields.push("Foto Defect");
  if (availableFloorplans.length > 0 && !marker) missingFields.push("Lokasi Defect pada Denah");
  
  const isFormReady = missingFields.length === 0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmit || !isFormReady) return;
    
    try {
      const markedImage = (marker && selectedFloorplanImage) ? await generateMarkedImage(selectedFloorplanImage, marker.x, marker.y, '#ef4444') : null;
      
      const payload = {
        defect_code: defectCodePreview,
        inspector_id: formData.inspector_id ? parseInt(formData.inspector_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        building_id: formData.building_id ? parseInt(formData.building_id) : null,
        floorplan_id: formData.floorplan_id ? formData.floorplan_id.toString() : null,
        discipline: formData.discipline,
        defect_type: formData.defect_type,
        defect_category: formData.defect_category,
        defect_date: formData.defect_date,
        sla_days: formData.sla_days ? parseInt(formData.sla_days) : 0,
        notes: formData.notes,
        location_x: marker ? marker.x : null,
        location_y: marker ? marker.y : null,
        defect_photo: photoPreview,
        marked_floorplan_image: markedImage
      };
      
      const resDefect = await fetchSupabase('defects', 'POST', payload);
      const newDefectRecord = Array.isArray(resDefect) ? resDefect[0] : resDefect;
      if (!newDefectRecord) throw new Error("Data defect gagal dikembalikan dari server. Pastikan RLS dimatikan.");
      
      setDb(prev => ({ ...prev, defects: [...(prev.defects || []), newDefectRecord] }));
      alert(`Defect ${defectCodePreview} berhasil disimpan ke Cloud!`);
      
      setMarker(null);
      setPhotoPreview([]);
      setFormData(prev => ({...prev, notes: '', sla_days: 0}));
    } catch(err) { alert("Gagal menyimpan defect: " + err.message); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2"><AlertCircle className="text-[#0F4C81] dark:text-blue-400" /> Input Defect Baru</h2>
        <div className="flex items-center gap-2"><span className="px-4 py-1.5 bg-blue-100 text-[#0F4C81] rounded-full text-sm font-bold shadow-sm">{defectCodePreview}</span></div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Inspector Pelapor</label>
            <input type="text" className={`w-full p-2.5 rounded-lg border text-sm bg-gray-100 cursor-not-allowed font-medium text-gray-600 dark:text-gray-400`} value={currentUser?.name || ''} readOnly />
          </div>
          <div><label className={labelClass}>Nama Proyek</label><select className={inputClass} disabled={isViewer} value={formData.project_id} onChange={e => setFormData({...formData, project_id: parseInt(e.target.value), building_id: '', floorplan_id: ''})}><option value="">-- Pilih Proyek --</option>{(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Bangunan</label><select className={inputClass} disabled={isViewer} value={formData.building_id} onChange={e => setFormData({...formData, building_id: parseInt(e.target.value)})}><option value="">-- Pilih Bangunan --</option>{(db.buildings || []).filter(b => b.project_id === formData.project_id).map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}</select></div>
            <div><label className={labelClass}>Pilih Denah</label><select className={inputClass} disabled={isViewer || availableFloorplans.length === 0} value={formData.floorplan_id} onChange={e => {setFormData({...formData, floorplan_id: e.target.value}); setMarker(null);}}>{availableFloorplans.length === 0 ? <option value="">(Tidak ada denah)</option> : availableFloorplans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}</select></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Disiplin</label>
              <select className={inputClass} disabled={isViewer} value={formData.discipline} onChange={e => setFormData({...formData, discipline: e.target.value, defect_type: ''})}>
                <option>Struktur</option><option>Arsitektur</option><option>MEP</option><option>Landscape</option><option>Infrastructure</option><option>Interior</option><option>General</option>
              </select>
            </div>
            <div><label className={labelClass}>Kategori</label><select className={inputClass} disabled={isViewer} value={formData.defect_category} onChange={e => setFormData({...formData, defect_category: e.target.value})}><option>Minor</option><option>Major</option><option>Hard (NCR)</option></select></div>
          </div>

          <div ref={typeContainerRef} onBlur={(e) => {
             if (isAddingNewType && typeContainerRef.current && !typeContainerRef.current.contains(e.relatedTarget)) {
               handleCancelNewType();
             }
          }}>
            <label className={labelClass}>Jenis Defect</label>
            {!isAddingNewType ? (
              <select className={inputClass} disabled={isViewer} value={formData.defect_type} onChange={e => { if(e.target.value==='NEW') setIsAddingNewType(true); else setFormData({...formData, defect_type: e.target.value}); }}>
                {allDefectTypes.map(type => <option key={type} value={type}>{type}</option>)}
                {!isViewer && <option value="NEW" className="font-bold text-blue-600">+ Tambah Baru...</option>}
              </select>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-lg border">
                <input type="text" className={inputClass} disabled={isViewer} placeholder="Ketik jenis defect baru..." value={newDefectType} onChange={e => setNewDefectType(e.target.value)} autoFocus />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={handleCancelNewType} className="px-3 py-1 bg-gray-400 text-white text-xs rounded">Cancel</button>
                  <button type="button" onClick={() => { 
                    if (newDefectType.trim()) { 
                      setDynamicDefectTypes([...dynamicDefectTypes, newDefectType.trim()]); 
                      setFormData({...formData, defect_type: newDefectType.trim()}); 
                    } else {
                      if (allDefectTypes.length > 0) setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
                    }
                    setIsAddingNewType(false); 
                    setNewDefectType(''); 
                  }} className="px-3 py-1 bg-[#0F4C81] text-white text-xs rounded">Simpan</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Tanggal Defect</label><input type="date" disabled={isViewer} className={inputClass} value={formData.defect_date} onChange={e => setFormData({...formData, defect_date: e.target.value})} /></div>
            <div><label className={labelClass}>SLA (Hari)</label><input type="number" min="0" disabled={isViewer} className={inputClass} value={formData.sla_days} onChange={e => setFormData({...formData, sla_days: e.target.value === '' ? '' : parseInt(e.target.value)})} /></div>
          </div>
          
          <div><label className={labelClass}>Catatan Tambahan</label><textarea rows="2" disabled={isViewer} className={inputClass} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Deskripsi..."></textarea></div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Lokasi Defect pada Denah</label>
            <div className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 ${selectedFloorplanImage ? (isViewer ? 'border-solid cursor-not-allowed' : 'border-dashed cursor-crosshair') : 'border-solid cursor-not-allowed'} bg-gray-100`} onClick={isViewer ? undefined : handleMapClick}>
              {selectedFloorplanImage ? (
                <><img src={selectedFloorplanImage} className="w-full h-full object-contain pointer-events-none" />{!marker && !isViewer && <div className="absolute inset-0 flex items-center justify-center bg-black/10"><div className="bg-white/80 px-4 py-2 rounded-full text-sm font-medium"><MapPin size={16}/> Klik untuk tandai</div></div>}</>
              ) : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><MapPin size={32} className="opacity-50" /></div>}
              {marker && <div className="absolute w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
            </div>
          </div>

          <div>
            <label className={labelClass}>Foto Defect</label>
            <div className="flex gap-2 overflow-x-auto py-2">
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isViewer ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><UploadCloud size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Dari File</span><input type="file" disabled={isViewer} multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isViewer ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><Camera size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Kamera HP</span><input type="file" disabled={isViewer} multiple accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} /></label>
              {photoPreview.map((src, idx) => (
                <div key={idx} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden relative border"><img src={src} className="w-full h-full object-cover" />{!isViewer && <button type="button" onClick={() => setPhotoPreview(photoPreview.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 pt-4 border-t dark:border-gray-700 flex flex-col items-end gap-2 mt-4">
          {!isFormReady && canSubmit && (
            <div className="text-red-500 text-xs font-bold mb-2 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
              🚨 Data belum lengkap! Mohon isi data berikut: {missingFields.join(', ')}
            </div>
          )}
          <div className="flex gap-4">
            <button type="button" onClick={canSubmit ? handleReset : undefined} disabled={!canSubmit} className={`px-6 py-2.5 rounded-xl border font-medium transition-colors text-sm ${canSubmit ? 'border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700' : 'border-gray-200 bg-gray-200 text-gray-400 cursor-not-allowed'}`} title={!canSubmit ? "Akses ditolak (Viewer)" : ""}>Reset / Data Baru</button>
            <button type="button" onClick={canSubmit ? handleSubmit : undefined} disabled={!canSubmit || !isFormReady} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md text-sm ${canSubmit && isFormReady ? `${primaryColor} hover:bg-blue-800 text-white` : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} title={!canSubmit ? "Akses ditolak (Viewer)" : ""}><Save size={18} /> Simpan Defect</button>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- ACTION / PERBAIKAN DETAIL VIEW ---
function ActionDetailView({ defect, onBack, db, setDb, darkMode, currentUser }) {
  const [marker, setMarker] = useState(defect.location_x && defect.location_y ? {x: defect.location_x, y: defect.location_y} : null);
  const [photoPreview, setPhotoPreview] = useState(defect.defect_photo || []);
  
  const existingActions = (db.actions || []).filter(a => a.defect_id === defect.id);
  const latestAction = existingActions.length > 0 ? existingActions[existingActions.length - 1] : null;
  const [actionPhotoPreview, setActionPhotoPreview] = useState(latestAction?.action_photo || []);

  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newDefectType, setNewDefectType] = useState('');
  const [dynamicDefectTypes, setDynamicDefectTypes] = useState([]);

  const typeContainerRef = useRef(null);
  const bldg = (db.buildings || []).find(b => b.id === defect.building_id);
  
  const isViewer = currentUser?.role === 'Viewer';
  const isAdmin = currentUser?.role === 'Admin';
  const isUser = currentUser?.role === 'User';
  // Konversi tipe data id menjadi String agar tidak gagal saat evaluasi persaman
  const isReporter = String(defect.inspector_id) === String(currentUser?.id);
  
  const initialStatus = latestAction ? latestAction.status : 'Open';

  // LOGIKA DISABLE FIELD
  const isDefectSectionDisabled = isViewer || (isUser && !isReporter);
  const isActionSectionDisabled = isViewer; // Action Section aktif untuk User dan Admin

  let initialInspectorEdit = latestAction?.inspector_edit || defect.inspector_edit || '';
  if (initialStatus === 'Open') {
    initialInspectorEdit = '';
  } else if (!initialInspectorEdit && (initialStatus === 'Close' || initialStatus === 'Proses Perbaikan')) {
    initialInspectorEdit = defect.inspector_id || '';
  }

  const [formData, setFormData] = useState({
    inspector_id: defect.inspector_id || '',
    inspector_edit: initialInspectorEdit,
    project_id: bldg ? bldg.project_id : '',
    building_id: defect.building_id || '',
    floorplan_id: defect.floorplan_id || '',
    discipline: defect.discipline || 'Struktur',
    defect_type: defect.defect_type || '',
    defect_category: defect.defect_category || 'Minor',
    defect_date: defect.defect_date || new Date().toISOString().split('T')[0],
    sla_days: defect.sla_days !== undefined ? defect.sla_days : 7,
    notes: defect.notes || '', // Catatan Tambahan (Defect)
    action_date: latestAction ? latestAction.action_date : new Date().toISOString().split('T')[0],
    action_note: latestAction ? latestAction.action_note : '', // Catatan Perbaikan
    status: initialStatus,
  });

  const inputClassDefect = `w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-[#0F4C81] outline-none transition-all text-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'} ${isDefectSectionDisabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500' : ''}`;
  const inputClassAction = `w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-[#0F4C81] outline-none transition-all text-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'} ${isActionSectionDisabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70 text-gray-500' : ''}`;
  const labelClass = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  const currentDiscipline = formData.discipline || 'Struktur';
  const baseTypesForDiscipline = DEFECT_DICTIONARY[currentDiscipline] || DEFECT_DICTIONARY['General'];
  const allDefectTypes = [...new Set([...baseTypesForDiscipline, ...(db.defects || []).filter(d => d.discipline === currentDiscipline).map(d => d.defect_type), ...dynamicDefectTypes])];

  useEffect(() => {
    if (!allDefectTypes.includes(formData.defect_type) && allDefectTypes.length > 0 && !isAddingNewType) {
       setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
    }
  }, [formData.discipline, allDefectTypes, isAddingNewType]);

  const handleCancelNewType = () => {
    setIsAddingNewType(false);
    setNewDefectType('');
    if (allDefectTypes.length > 0) {
      setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (isAddingNewType && typeContainerRef.current && !typeContainerRef.current.contains(event.target)) {
        handleCancelNewType();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingNewType, allDefectTypes]);

  const selectedBuilding = (db.buildings || []).find(b => b.id === formData.building_id);
  const availableFloorplans = selectedBuilding?.floorplans || [];
  const selectedFloorplanImage = availableFloorplans.find(fp => fp.id === parseInt(formData.floorplan_id))?.image;

  const handleMapClick = (e) => {
    if (!selectedFloorplanImage || isDefectSectionDisabled) return; 
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarker({ x, y });
  };

  const handlePhotoUpload = async (e) => {
    if (isDefectSectionDisabled) return;
    const files = Array.from(e.target.files);
    const compressedImages = await Promise.all(files.map(f => compressImage(f)));
    setPhotoPreview([...photoPreview, ...compressedImages]);
  };

  const handleActionPhotoUpload = async (e) => {
    if (isActionSectionDisabled) return;
    const files = Array.from(e.target.files);
    const compressedImages = await Promise.all(files.map(f => compressImage(f)));
    setActionPhotoPreview([...actionPhotoPreview, ...compressedImages]);
    if (isUser && formData.status !== 'Open') {
      setFormData(prev => ({...prev, inspector_edit: currentUser?.id}));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isViewer) return;
    if (!formData.building_id) { alert('Pilih bangunan!'); return; }
    
    try {
      const markedImage = (marker && selectedFloorplanImage) ? await generateMarkedImage(selectedFloorplanImage, marker.x, marker.y, '#ef4444') : null;
      
      let finalInspectorEdit = formData.inspector_edit ? parseInt(formData.inspector_edit) : null;
      
      if (formData.status === 'Open') {
         finalInspectorEdit = null;
      } else if (isUser && !isReporter) {
         finalInspectorEdit = parseInt(currentUser.id);
      } else if (!finalInspectorEdit && (formData.status === 'Close' || formData.status === 'Proses Perbaikan')) {
         finalInspectorEdit = parseInt(currentUser.id);
      }

      // Payload untuk defects table 
      const defectPayload = {
        inspector_id: formData.inspector_id ? parseInt(formData.inspector_id) : null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        building_id: formData.building_id ? parseInt(formData.building_id) : null,
        floorplan_id: formData.floorplan_id ? formData.floorplan_id.toString() : null,
        discipline: formData.discipline,
        defect_type: formData.defect_type,
        defect_category: formData.defect_category,
        defect_date: formData.defect_date,
        sla_days: formData.sla_days ? parseInt(formData.sla_days) : 0,
        notes: formData.notes,
        location_x: marker ? marker.x : null,
        location_y: marker ? marker.y : null,
        defect_photo: photoPreview,
        marked_floorplan_image: markedImage || defect.marked_floorplan_image
      };
      
      const resDefect = await fetchSupabase(`defects?id=eq.${defect.id}`, 'PATCH', defectPayload);
      const updatedDefectRecord = Array.isArray(resDefect) ? resDefect[0] : (resDefect || { ...defect, ...defectPayload });
      
      // Payload untuk actions table
      const actionPayload = {
        defect_id: defect.id,
        inspector_id: currentUser?.id ? parseInt(currentUser.id) : null,
        inspector_edit: finalInspectorEdit,
        action_date: formData.action_date,
        status: formData.status,
        action_note: formData.action_note,
        action_photo: actionPhotoPreview
      };
      
      const resAction = await fetchSupabase('actions', 'POST', actionPayload);
      const newActionRecord = Array.isArray(resAction) ? resAction[0] : (resAction || { id: Date.now(), ...actionPayload, created_at: new Date().toISOString() });
      
      setDb(prev => ({
        ...prev, 
        defects: (prev.defects || []).map(d => d.id === defect.id ? updatedDefectRecord : d),
        actions: [...(prev.actions || []), newActionRecord]
      }));
      
      alert(`Data Defect ${defect.defect_code} berhasil diupdate ke Cloud!`);
      onBack();
    } catch(err) { 
      console.error("Update Error:", err);
      alert("Error: " + err.message); 
    }
  };

  const handleDelete = async () => {
    if(!window.confirm("Yakin hapus data ini secara permanen?")) return;
    try {
      await fetchSupabase(`actions?defect_id=eq.${defect.id}`, 'DELETE');
      await fetchSupabase(`defects?id=eq.${defect.id}`, 'DELETE');
    } catch(err) { console.warn("Penghapusan terhenti di cloud:", err.message); }
    
    setDb(prev => ({ 
        ...prev, 
        defects: (prev.defects || []).filter(d => d.id !== defect.id), 
        actions: (prev.actions || []).filter(a => a.defect_id !== defect.id) 
    }));
    alert('Data dihapus dari database!'); 
    onBack();
  };
  
  const slaInfo = calculateSlaStatus(formData.defect_date, formData.sla_days, formData.action_date);

  const missingFields = [];
  
  // Validasi form atas hanya dijalankan jika user memang PUNYA akses (bukan readonly)
  if (!isDefectSectionDisabled) {
    if (!formData.project_id) missingFields.push("Nama Proyek");
    if (!formData.building_id) missingFields.push("Bangunan");
    if (!formData.defect_type || formData.defect_type === '') missingFields.push("Jenis Defect");
    if (!formData.defect_date) missingFields.push("Tanggal Defect");
    if (formData.sla_days === '' || formData.sla_days === null || formData.sla_days === undefined) missingFields.push("SLA Perbaikan");
  }

  // Validasi form bawah (Action)
  if (!isActionSectionDisabled) {
    if (!formData.action_date) missingFields.push("Tanggal Selesai Perbaikan");
    if (!formData.status) missingFields.push("Status Perbaikan");
    
    if (formData.status === 'Close') {
      if (!formData.action_note || formData.action_note.trim() === '') missingFields.push("Catatan Perbaikan");
      if (actionPhotoPreview.length === 0) missingFields.push("Foto Perbaikan");
    }

    if (formData.status === 'Close' || formData.status === 'Proses Perbaikan') {
      // Jika yang login bukan admin dan status berubah, biarkan krn sistem akan isi auto pakai currentUser.id
      // Namun jika ADMIN, dia wajib milih dari dropdown
      if (!formData.inspector_edit && isAdmin) {
        missingFields.push("Inspector Closing Defect");
      }
    }
  }
  
  const isUpdateReady = missingFields.length === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2"><button onClick={onBack} className="mr-2 text-gray-500 hover:text-black"><X size={24}/></button><AlertCircle className="text-[#0F4C81]" /> Update / Hapus</h2>
        <div className="flex items-center gap-2"><span className="px-4 py-1.5 bg-blue-100 text-[#0F4C81] rounded-full text-sm font-bold">{defect.defect_code}</span></div>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Inspector Pelapor</label>
              <input type="text" className={`w-full p-2.5 rounded-lg border text-sm bg-gray-100 cursor-not-allowed font-medium text-gray-600 dark:text-gray-400`} value={(db.inspectors || []).find(i => i.id === defect.inspector_id)?.name || '-'} readOnly />
            </div>
            <div>
              <label className={labelClass}>Inspector Closing Defect</label>
              <select 
                className={`${inputClassDefect} ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-500 opacity-70' : ''}`} 
                value={formData.inspector_edit || ''} 
                onChange={e => setFormData({...formData, inspector_edit: e.target.value})}
                disabled={!isAdmin}
              >
                <option value="">-- Kosong --</option>
                {(db.inspectors || []).filter(i => i.authority === 'Admin' || i.authority === 'User').map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Nama Proyek</label><select className={inputClassDefect} disabled={isDefectSectionDisabled} required value={formData.project_id} onChange={e => setFormData({...formData, project_id: parseInt(e.target.value), building_id: '', floorplan_id: ''})}><option value="">-- Pilih Proyek --</option>{(db.projects || []).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass}>Bangunan</label><select className={inputClassDefect} disabled={isDefectSectionDisabled} required value={formData.building_id} onChange={e => setFormData({...formData, building_id: parseInt(e.target.value)})}><option value="">-- Pilih --</option>{(db.buildings || []).filter(b => b.project_id === formData.project_id).map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}</select></div>
            <div><label className={labelClass}>Denah</label><select className={inputClassDefect} disabled={isDefectSectionDisabled || availableFloorplans.length === 0} value={formData.floorplan_id} onChange={e => {setFormData({...formData, floorplan_id: e.target.value}); setMarker(null);}}>{availableFloorplans.length === 0 ? <option value="">(Kosong)</option> : availableFloorplans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}</select></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Disiplin</label><select className={inputClassDefect} disabled={isDefectSectionDisabled} value={formData.discipline} onChange={e => setFormData({...formData, discipline: e.target.value, defect_type: ''})}><option>Struktur</option><option>Arsitektur</option><option>MEP</option><option>Landscape</option><option>Infrastructure</option><option>Interior</option><option>General</option></select></div>
            <div><label className={labelClass}>Kategori</label><select className={inputClassDefect} disabled={isDefectSectionDisabled} value={formData.defect_category} onChange={e => setFormData({...formData, defect_category: e.target.value})}><option>Minor</option><option>Major</option><option>Hard (NCR)</option></select></div>
          </div>

          <div ref={typeContainerRef} onBlur={(e) => {
             if (isAddingNewType && typeContainerRef.current && !typeContainerRef.current.contains(e.relatedTarget)) {
               handleCancelNewType();
             }
          }}>
            <label className={labelClass}>Jenis Defect</label>
            {!isAddingNewType ? (
              <select className={inputClassDefect} disabled={isDefectSectionDisabled} value={formData.defect_type} onChange={e => { if(e.target.value === 'NEW') setIsAddingNewType(true); else setFormData({...formData, defect_type: e.target.value}); }}>
                {allDefectTypes.map(type => <option key={type} value={type}>{type}</option>)}
                {!isDefectSectionDisabled && <option value="NEW" className="text-blue-600 font-bold">+ Tambah Baru...</option>}
              </select>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-lg border">
                <input type="text" className={inputClassDefect} disabled={isDefectSectionDisabled} placeholder="Ketik baru..." value={newDefectType} onChange={e => setNewDefectType(e.target.value)} autoFocus />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={handleCancelNewType} className="px-3 py-1 bg-gray-400 text-white text-xs rounded">Cancel</button>
                  <button type="button" onClick={() => { 
                    if (newDefectType.trim()) { 
                      setDynamicDefectTypes([...dynamicDefectTypes, newDefectType.trim()]); 
                      setFormData({...formData, defect_type: newDefectType.trim()}); 
                    } else {
                      if (allDefectTypes.length > 0) setFormData(prev => ({...prev, defect_type: allDefectTypes[0]}));
                    }
                    setIsAddingNewType(false); 
                    setNewDefectType(''); 
                  }} className="px-3 py-1 bg-[#0F4C81] text-white text-xs rounded">Simpan</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Tanggal Defect</label><input type="date" disabled={isDefectSectionDisabled} className={inputClassDefect} required value={formData.defect_date} onChange={e => setFormData({...formData, defect_date: e.target.value})} /></div>
            <div><label className={labelClass}>SLA (Hari)</label><input type="number" min="0" disabled={isDefectSectionDisabled} className={inputClassDefect} required value={formData.sla_days} onChange={e => setFormData({...formData, sla_days: parseInt(e.target.value) || 0})} /></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
            <div><label className={labelClass}>Tanggal Selesai Perbaikan</label><input type="date" disabled={isActionSectionDisabled} className={inputClassAction} required value={formData.action_date} onChange={e => {
              let newInsp = formData.inspector_edit;
              if (isUser && formData.status !== 'Open') newInsp = currentUser?.id;
              setFormData({...formData, action_date: e.target.value, inspector_edit: newInsp});
            }} /></div>
            <div>
              <label className={labelClass}>Status Perbaikan</label>
              <select className={inputClassAction} disabled={isActionSectionDisabled} value={formData.status} onChange={e => {
                const val = e.target.value;
                let newInsp = formData.inspector_edit;
                if (val === 'Open') {
                  newInsp = ''; 
                } else if ((val === 'Close' || val === 'Proses Perbaikan') && (!isAdmin)) {
                  newInsp = currentUser?.id; 
                }
                setFormData({...formData, status: val, inspector_edit: newInsp});
              }}>
                <option value="Open">Open</option>
                <option value="Proses Perbaikan">Proses Perbaikan</option>
                <option value="Close">Close (Selesai)</option>
              </select>
            </div>
            <div className="col-span-2 bg-gray-50 p-3 rounded-lg border flex justify-between text-sm"><span className="font-bold text-gray-600">Status SLA (Terkalkulasi Real-time):</span><span className={slaInfo.style}>{slaInfo.text}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Lokasi Defect pada Denah</label>
            <div className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 ${selectedFloorplanImage ? (isDefectSectionDisabled ? 'border-solid cursor-not-allowed' : 'border-dashed cursor-crosshair') : 'border-solid cursor-not-allowed'} bg-gray-100`} onClick={isDefectSectionDisabled ? undefined : handleMapClick}>
              {selectedFloorplanImage ? <><img src={selectedFloorplanImage} className="w-full h-full object-contain pointer-events-none" />{!marker && !isDefectSectionDisabled && <div className="absolute inset-0 flex items-center justify-center bg-black/10"><div className="bg-white/80 px-4 py-2 rounded-full text-sm font-medium"><MapPin size={16}/> Klik untuk tandai</div></div>}</> : <div className="absolute inset-0 flex items-center justify-center text-gray-400"><MapPin size={32} /></div>}
              {marker && <div className="absolute w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
            </div>
          </div>
          
          <div><label className={labelClass}>Catatan Tambahan (Defect)</label><textarea rows="2" disabled={isDefectSectionDisabled} className={inputClassDefect} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>

          <div>
            <label className={labelClass}>Foto Defect</label>
            <div className="flex gap-2 overflow-x-auto py-2">
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isDefectSectionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><UploadCloud size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Dari File</span><input type="file" disabled={isDefectSectionDisabled} multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} /></label>
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isDefectSectionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><Camera size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Kamera HP</span><input type="file" disabled={isDefectSectionDisabled} multiple accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} /></label>
              {photoPreview.map((src, idx) => <div key={idx} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden relative border"><img src={src} className="w-full h-full object-cover" />{!isDefectSectionDisabled && <button type="button" onClick={() => setPhotoPreview(photoPreview.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>}</div>)}
            </div>
          </div>

          <div><label className={labelClass}>Catatan Perbaikan</label><textarea rows="2" disabled={isActionSectionDisabled} className={inputClassAction} value={formData.action_note} onChange={e => {
            let newInsp = formData.inspector_edit;
            if (isUser && formData.status !== 'Open') newInsp = currentUser?.id;
            setFormData({...formData, action_note: e.target.value, inspector_edit: newInsp});
          }}></textarea></div>

          <div>
            <label className={labelClass}>Foto Perbaikan</label>
            <div className="flex gap-2 overflow-x-auto py-2">
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isActionSectionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><UploadCloud size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Dari File</span><input type="file" disabled={isActionSectionDisabled} multiple accept="image/*" className="hidden" onChange={handleActionPhotoUpload} /></label>
              <label className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl ${isActionSectionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}><Camera size={20} className="text-gray-400 mb-1" /><span className="text-[10px]">Kamera HP</span><input type="file" disabled={isActionSectionDisabled} multiple accept="image/*" capture="environment" className="hidden" onChange={handleActionPhotoUpload} /></label>
              {actionPhotoPreview.map((src, idx) => <div key={idx} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden relative border"><img src={src} className="w-full h-full object-cover" />{!isActionSectionDisabled && <button type="button" onClick={() => setActionPhotoPreview(actionPhotoPreview.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>}</div>)}
            </div>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 pt-4 border-t flex flex-col items-end gap-2 mt-4">
          {(() => {
            const canDelete = isAdmin || (isReporter && !isViewer); 
            const canUpdate = isUpdateReady && !isViewer;
            
            return (
              <>
                {!isUpdateReady && !isViewer && (
                  <div className="text-red-500 text-sm font-medium mb-4 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                    🚨 <b>Aksi Tertahan:</b> Data belum lengkap! Lengkapi data berikut agar tombol Update aktif: <br/><span className="text-red-700 font-bold">{missingFields.join(', ')}</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <button type="button" onClick={canDelete ? handleDelete : undefined} disabled={!canDelete} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors shadow-sm ${canDelete ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} title={!canDelete ? "Akses Hapus Ditolak" : ""}><Trash2 size={18} /> Hapus</button>
                  <button type="submit" disabled={!canUpdate} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all shadow-md ${canUpdate ? 'bg-[#0F4C81] hover:bg-blue-800 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} title={!canUpdate ? "Akses Update Ditolak" : ""}><Edit size={18} /> Update</button>
                </div>
              </>
            )
          })()}
        </div>
      </form>
    </div>
  );
}

function ActionView({ db, setDb, currentUser, darkMode }) {
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [search, setSearch] = useState('');
  
  const getDefectStatus = (defectId) => {
    const actions = (db.actions || []).filter(a => a.defect_id === defectId);
    if(actions.length === 0) return 'Open';
    return actions[actions.length - 1].status;
  };

  const filteredDefects = (db.defects || []).filter(d => search === '' || d.defect_code === search || (db.buildings || []).find(b=>b.id===d.building_id)?.building_name.toLowerCase().includes(search.toLowerCase())).map(d => ({ ...d, current_status: getDefectStatus(d.id) })).sort((a, b) => new Date(b.created_at || b.defect_date) - new Date(a.created_at || a.defect_date));
  
  const handleDeleteDefect = async (id) => {
    if(!window.confirm("Yakin hapus data ini secara permanen?")) return;
    try {
      await fetchSupabase(`actions?defect_id=eq.${id}`, 'DELETE');
      await fetchSupabase(`defects?id=eq.${id}`, 'DELETE');
    } catch(err) { console.warn("Peringatan cloud:", err.message); }
    setDb(prev => ({ ...prev, defects: (prev.defects || []).filter(d => d.id !== id), actions: (prev.actions || []).filter(a => a.defect_id !== id) }));
  };

  if (selectedDefect) return <ActionDetailView defect={selectedDefect} onBack={() => setSelectedDefect(null)} db={db} setDb={setDb} darkMode={darkMode} currentUser={currentUser} />;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 flex flex-col h-[calc(100vh-10rem)]">
      <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 rounded-t-2xl">
        <h2 className="text-lg font-bold">Daftar Defect</h2>
        <div className="relative w-full sm:w-auto min-w-[250px]">
          <input type="text" list="defect-list" placeholder="Ketik Kode Defect..." className="w-full pl-4 py-2 border rounded-full text-sm" value={search} onChange={e => { setSearch(e.target.value); const dOpen = (db.defects || []).find(d => d.defect_code === e.target.value); if(dOpen) setSelectedDefect({...dOpen, current_status: getDefectStatus(dOpen.id)}); }} />
          <datalist id="defect-list">{(db.defects || []).map(d => <option key={d.id} value={d.defect_code}>{d.defect_code} - {(db.buildings || []).find(b=>b.id===d.building_id)?.building_name}</option>)}</datalist>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredDefects.length === 0 ? <p className="text-center py-10 text-gray-500 text-sm">Tidak ada data ditemukan.</p> : null}
        {filteredDefects.map(d => {
          const actionDate = (db.actions || []).filter(a => a.defect_id === d.id).slice(-1)[0]?.action_date || '-';
          const slaInfo = calculateSlaStatus(d.defect_date, d.sla_days, actionDate);
          const isAdmin = currentUser?.role === 'Admin';
          const canDelete = isAdmin || (String(d.inspector_id) === String(currentUser?.id) && currentUser?.role !== 'Viewer');
          return (
          <div key={d.id} className="p-4 rounded-xl border hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[#0F4C81]">{d.defect_code}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.current_status === 'Close' ? 'bg-green-100 text-green-700' : d.current_status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{d.current_status}</span>
                <span className={`text-xs ${slaInfo.style}`}>SLA: {slaInfo.text}</span>
              </div>
              <p className="text-sm font-medium">{(db.buildings || []).find(b=>b.id===d.building_id)?.building_name}</p>
              <p className="text-xs text-gray-500">{d.defect_type} • {d.defect_category}</p>
              <p className="text-xs text-gray-500 mt-1">Inspector Pelapor: <span className="font-semibold">{(db.inspectors || []).find(i => i.id === d.inspector_id)?.name || '-'}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => canDelete ? handleDeleteDefect(d.id) : undefined} disabled={!canDelete} className={`px-3 py-2 rounded-lg flex items-center justify-center ${canDelete ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} title={canDelete ? "Hapus Defect" : "Hanya Admin atau inspector pelapor yang bisa menghapus"}><Trash2 size={16} /></button>
              <button onClick={() => setSelectedDefect(d)} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-[#0F4C81] text-white"><Edit size={16} /> Update</button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

// --- REPORT VIEW ---
function ReportView({ db, darkMode }) {
  const [filterStatus, setFilterStatus] = useState('All');
  const [reportType, setReportType] = useState('tanpa_foto'); 
  const [sortOption, setSortOption] = useState('ID_DEFECT'); 
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const getDefectStatus = (defectId) => {
    const actions = (db.actions || []).filter(a => a.defect_id === defectId);
    if(actions.length === 0) return 'Open';
    return actions[actions.length - 1].status;
  };

  let reportData = (db.defects || []).map(d => {
    const b = (db.buildings || []).find(b=>b.id===d.building_id);
    const p = b ? (db.projects || []).find(p=>p.id===b.project_id) : null;
    
    const latestAction = (db.actions || []).filter(a => a.defect_id === d.id).slice(-1)[0];
    const inspector_edit_val = latestAction?.inspector_edit || d.inspector_edit;
    const i_close = (db.inspectors || []).find(i=>i.id === inspector_edit_val);
    const close_by_name = i_close ? i_close.initial : '-';
    
    const current_status = getDefectStatus(d.id);
    const action_photos = latestAction ? latestAction.action_photo : [];
    const action_date = latestAction ? latestAction.action_date : '-';
    const action_note = latestAction ? latestAction.action_note : '-';
    
    const fp = b && b.floorplans ? b.floorplans.find(f => f.id === parseInt(d.floorplan_id)) : null;
    const floorplan_name = fp ? fp.name.replace(/\.[^/.]+$/, "") : '-';
    const floorplan_image = d.marked_floorplan_image || (fp ? fp.image : null);
    
    return {
      ...d, building_name: b ? b.building_name : '-', building_id: b ? b.id : '', project_name: p ? p.project_name : '-', close_by_name, current_status, action_photos, action_date, action_note, floorplan_name, floorplan_image
    };
  }).filter(d => filterStatus === 'All' ? true : d.current_status === filterStatus);

  if (sortOption === 'BANGUNAN') { reportData.sort((a, b) => a.building_name.localeCompare(b.building_name)); } 
  else if (sortOption === 'SPESIFIK' && selectedBuildingFilter) { reportData = reportData.filter(d => d.building_id === parseInt(selectedBuildingFilter)); }

  const stats = {
    total: reportData.length, open: reportData.filter(d=>d.current_status === 'Open').length, proses: reportData.filter(d=>d.current_status === 'Proses Perbaikan').length, close: reportData.filter(d=>d.current_status === 'Close').length,
  };

  const uniqueProjects = [...new Set(reportData.map(d=>d.project_name))].filter(n => n !== '-');
  const projectTitle = uniqueProjects.length === 1 ? uniqueProjects[0] : (uniqueProjects.length > 1 ? 'Semua Proyek' : '-');

  const exportExcel = () => {
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body>
        <h3>LAPORAN QUALITY CONTROL</h3><p>Nama Proyek : ${projectTitle}</p><p>Tanggal cetak : ${new Date().toLocaleDateString('id-ID')}</p><br/>
        <table border="1" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th>No</th><th>ID Defect</th><th>Tanggal<br/>Defect</th><th>Bangunan</th><th>Lokasi<br/>Denah</th><th>Disiplin</th><th>Kategori</th><th>Jenis Defect</th>
              ${reportType === 'dengan_foto' ? '<th>Denah (Gambar)</th><th>Foto Defect</th>' : ''}
              <th>Catatan Tambahan</th><th>SLA</th><th>Tanggal<br/>Perbaikan</th>
              ${reportType === 'dengan_foto' ? '<th>Foto Perbaikan</th>' : ''}
              <th>Catatan Perbaikan</th><th>Close By</th><th>Status</th>
            </tr>
          </thead><tbody>
    `;

    reportData.forEach((d, i) => {
      let floorplanImageHtml = ''; let defectPhotosHtml = ''; let actionPhotosHtml = '';
      const slaInfo = calculateSlaStatus(d.defect_date, d.sla_days, d.action_date);
      const slaStyle = slaInfo.isLate ? 'color: red; font-weight: bold;' : 'color: green; font-weight: bold;';

      if (reportType === 'dengan_foto') {
        const tdStyle = "vertical-align: middle; text-align: center; height: 130px; width: 130px;";
        const imgStyle = "max-height: 120px; max-width: 120px; object-fit: contain;";
        
        floorplanImageHtml = d.floorplan_image ? `<td style="${tdStyle}"><img src="${d.floorplan_image}" style="${imgStyle}" /></td>` : `<td style="${tdStyle}">-</td>`;
        defectPhotosHtml = d.defect_photo && d.defect_photo.length > 0 ? `<td style="${tdStyle}">${d.defect_photo.map(p => `<img src="${p}" style="${imgStyle} margin-right: 5px;" />`).join('')}</td>` : `<td style="${tdStyle}">-</td>`;
        actionPhotosHtml = d.action_photos && d.action_photos.length > 0 ? `<td style="${tdStyle}">${d.action_photos.map(p => `<img src="${p}" style="${imgStyle} margin-right: 5px;" />`).join('')}</td>` : `<td style="${tdStyle}">-</td>`;
      }

      tableHtml += `<tr>
        <td style="vertical-align: middle; text-align: center;">${i + 1}</td>
        <td style="vertical-align: middle;">${d.defect_code}</td>
        <td style="vertical-align: middle;">${d.defect_date}</td>
        <td style="vertical-align: middle;">${d.building_name}</td>
        <td style="vertical-align: middle;">${d.floorplan_name}</td>
        <td style="vertical-align: middle;">${d.discipline}</td>
        <td style="vertical-align: middle;">${d.defect_category}</td>
        <td style="vertical-align: middle;">${d.defect_type}</td>
        ${reportType === 'dengan_foto' ? `${floorplanImageHtml}${defectPhotosHtml}` : ''}
        <td style="vertical-align: middle;">${d.notes || '-'}</td>
        <td style="vertical-align: middle; ${slaStyle}">${slaInfo.text}</td>
        <td style="vertical-align: middle;">${d.action_date}</td>
        ${reportType === 'dengan_foto' ? `${actionPhotosHtml}` : ''}
        <td style="vertical-align: middle;">${d.action_note || '-'}</td>
        <td style="vertical-align: middle; text-align: center;">${d.close_by_name}</td>
        <td style="vertical-align: middle; font-weight: bold;">${d.current_status}</td>
      </tr>`;
    });

    tableHtml += `</tbody></table></body></html>`;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `PQCS_Report_${new Date().toISOString().slice(0,10)}.xls`; a.click();
  };

  const handlePrint = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      const element = document.getElementById('printable-area');
      const opt = { 
        margin: [10, 5, 10, 5],
        filename: `PQCS_Report_${new Date().toISOString().slice(0,10)}.pdf`, 
        image: { type: 'jpeg', quality: 1 }, 
        html2canvas: { scale: 2, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' }
      };
      if (window.html2pdf) { window.html2pdf().set(opt).from(element).save().then(() => setIsExportingPDF(false));
      } else {
         const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
         script.onload = () => { window.html2pdf().set(opt).from(element).save().then(() => setIsExportingPDF(false)); };
         document.head.appendChild(script);
      }
    }, 500); 
  };

  const imgClass = reportType === 'dengan_foto' ? "max-h-24 max-w-full object-contain mx-auto border border-gray-300 rounded shadow-sm bg-white" : "";
  const thClass = "px-1.5 py-2 border border-gray-400 align-middle text-center font-bold bg-gray-200 text-[10px] text-black";
  const tdClass = "px-1.5 py-2 border border-gray-400 align-middle text-[10px] whitespace-normal break-words text-black";
  const tdPhotoClass = "px-1.5 py-2 border border-gray-400 align-middle text-center";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b dark:border-gray-700 flex flex-col gap-4 print:hidden bg-gray-50 rounded-t-2xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><label className="text-sm font-medium">Filter Status:</label><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm"><option value="All">Semua Status</option><option value="Open">Open</option><option value="Proses Perbaikan">Proses Perbaikan</option><option value="Close">Close</option></select></div>
              <div className="flex items-center gap-2"><label className="text-sm font-medium">Format Lampiran:</label><select value={reportType} onChange={e=>setReportType(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm"><option value="tanpa_foto">Tanpa Foto / Ringkas</option><option value="dengan_foto">Dengan Lampiran Foto</option></select></div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Urutan & Klasifikasi:</label>
              <select value={sortOption} onChange={e=>{setSortOption(e.target.value); setSelectedBuildingFilter('');}} className="border rounded-lg px-3 py-1.5 text-sm">
                <option value="ID_DEFECT">Berdasarkan ID Defect</option><option value="BANGUNAN">Kelompokkan Per Bangunan</option><option value="SPESIFIK">Fokus 1 Bangunan Spesifik</option>
              </select>
              {sortOption === 'SPESIFIK' && (
                <select value={selectedBuildingFilter} onChange={e=>setSelectedBuildingFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-blue-50 border-blue-200">
                  <option value="">-- Pilih Bangunan --</option>{(db.buildings || []).map(b => <option key={b.id} value={b.id}>{b.building_name}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"><Download size={16} className="inline mr-1"/> Export Excel</button>
            <button onClick={handlePrint} disabled={isExportingPDF} className="px-4 py-2 bg-[#0F4C81] hover:bg-blue-800 text-white rounded-lg text-sm font-medium shadow-sm"><Printer size={16} className="inline mr-1"/> {isExportingPDF ? 'Mengekspor PDF A3...' : 'Export PDF A3'}</button>
          </div>
        </div>
        <div className="flex gap-4 border-t pt-3 text-sm font-bold mt-2">
          <span>Ringkasan Data:</span><span className="text-[#0F4C81]">Total: {stats.total}</span><span className="text-red-500">Open: {stats.open}</span><span className="text-yellow-600">Proses: {stats.proses}</span><span className="text-green-500">Close: {stats.close}</span>
        </div>
      </div>

      <div id="printable-area" className={`p-6 ${isExportingPDF ? 'bg-white w-max text-black' : 'text-gray-900 flex-1 overflow-auto print:hidden'}`}>
        <div className="mb-6 pb-2 text-left">
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-2">LAPORAN QUALITY CONTROL PQCS</h1>
          <table className="text-sm font-medium"><tbody><tr><td className="pr-4 py-1">Nama Proyek</td><td>: {projectTitle} {sortOption === 'SPESIFIK' && selectedBuildingFilter ? `(${(db.buildings || []).find(b=>b.id===parseInt(selectedBuildingFilter))?.building_name})` : ''}</td></tr><tr><td className="pr-4 py-1">Tanggal Cetak</td><td>: {new Date().toLocaleDateString('id-ID')}</td></tr></tbody></table>
        </div>

        <div className={`border border-gray-400 bg-white ${isExportingPDF ? '' : 'overflow-auto max-h-full'}`}>
          <table style={{ width: reportType === 'dengan_foto' ? '1520px' : '1140px' }} className="text-left border-collapse table-fixed bg-white">
            <thead className={`bg-gray-200 uppercase font-bold ${isExportingPDF ? '' : 'sticky top-0 z-10 shadow-sm'}`}>
              <tr>
                <th style={{ width: '30px' }} className={thClass}>No</th>
                <th style={{ width: '70px' }} className={thClass}>ID Defect</th>
                <th style={{ width: '70px' }} className={thClass}>Tanggal<br/>Defect</th>
                <th style={{ width: '90px' }} className={thClass}>Bangunan</th>
                <th style={{ width: '70px' }} className={thClass}>Lokasi<br/>Denah</th>
                <th style={{ width: '70px' }} className={thClass}>Disiplin</th>
                <th style={{ width: '70px' }} className={thClass}>Kategori</th>
                <th style={{ width: '140px' }} className={thClass}>Jenis Defect</th>
                {reportType === 'dengan_foto' && <th style={{ width: '100px' }} className={thClass}>Denah (Gambar)</th>}
                {reportType === 'dengan_foto' && <th style={{ width: '140px' }} className={thClass}>Foto Defect</th>}
                <th style={{ width: '140px' }} className={thClass}>Catatan Tambahan</th>
                <th style={{ width: '40px' }} className={thClass}>SLA</th>
                <th style={{ width: '70px' }} className={thClass}>Tanggal<br/>Perbaikan</th>
                {reportType === 'dengan_foto' && <th style={{ width: '140px' }} className={thClass}>Foto Perbaikan</th>}
                <th style={{ width: '140px' }} className={thClass}>Catatan Perbaikan</th>
                <th style={{ width: '60px' }} className={thClass}>Close By</th>
                <th style={{ width: '80px' }} className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td colSpan={reportType === 'dengan_foto' ? "17" : "14"} className="text-center py-6 text-gray-500 border border-gray-400">Tidak ada data untuk laporan.</td></tr>
              ) : (
                reportData.map((d, i) => {
                  const slaInfo = calculateSlaStatus(d.defect_date, d.sla_days, d.action_date);
                  return (
                  <tr key={d.id} className="hover:bg-gray-50 border-b border-gray-400 bg-white" style={{ pageBreakInside: 'avoid' }}>
                    <td className={`${tdClass} text-center font-bold`}>{i + 1}</td>
                    <td className={`${tdClass} font-medium`}>{d.defect_code}</td>
                    <td className={tdClass}>{d.defect_date}</td>
                    <td className={tdClass}>{d.building_name}</td>
                    <td className={tdClass}>{d.floorplan_name}</td>
                    <td className={tdClass}>{d.discipline}</td>
                    <td className={tdClass}>{d.defect_category}</td>
                    <td className={tdClass}>{d.defect_type}</td>
                    {reportType === 'dengan_foto' && <td className={tdPhotoClass}>{d.floorplan_image ? <img src={d.floorplan_image} alt="denah" className={`${imgClass}`} /> : <span className="text-xs text-gray-400 italic">No Image</span>}</td>}
                    {reportType === 'dengan_foto' && <td className={tdPhotoClass}><div className="flex gap-2 flex-wrap justify-center">{d.defect_photo && d.defect_photo.length > 0 ? d.defect_photo.map((p, idx) => <img key={idx} src={p} alt="defect" className={imgClass} />) : <span className="text-xs text-gray-400 italic">No Image</span>}</div></td>}
                    <td className={tdClass}>{d.notes || '-'}</td>
                    <td className={`${tdClass} ${slaInfo.style}`}>{slaInfo.text}</td>
                    <td className={tdClass}>{d.action_date}</td>
                    {reportType === 'dengan_foto' && <td className={tdPhotoClass}><div className="flex gap-2 flex-wrap justify-center">{d.action_photos && d.action_photos.length > 0 ? d.action_photos.map((p, idx) => <img key={idx} src={p} alt="action" className={imgClass} />) : <span className="text-xs text-gray-400 italic">No Image</span>}</div></td>}
                    <td className={tdClass}>{d.action_note || '-'}</td>
                    <td className={`${tdClass} text-center`}>{d.close_by_name}</td>
                    <td className={`${tdClass} font-bold`}>{d.current_status}</td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- SETTINGS VIEW ---
function SettingsView({ setDb, darkMode, db, currentUser, setCurrentUser }) {
  const [activeTab, setActiveTab] = useState('inspectors');
  const [inspectorForm, setInspectorForm] = useState({ id: null, name: '', initial: '', authority: 'User', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(db); const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob); const link = document.createElement('a'); link.href = url;
      link.download = `PQCS_Backup_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (error) { alert('Gagal membuat file backup. Coba lagi.'); }
  };

  const inputClass = `w-full p-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-[#0F4C81] outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
  const labelClass = "block text-sm font-medium mb-1";

  const handleSaveInspector = async (e) => {
    if (e) e.preventDefault();
    if (!inspectorForm.name.trim() || !inspectorForm.initial.trim() || !inspectorForm.authority || !inspectorForm.password) { 
      alert('Peringatan: Semua field (Nama, Inisial, Otoritas, Password) wajib diisi!'); 
      return; 
    }
    
    try {
      const payload = { 
        name: inspectorForm.name.trim(), 
        initial: inspectorForm.initial.trim().toUpperCase(),
        authority: inspectorForm.authority,
        password: inspectorForm.password
      };
      
      if (inspectorForm.id) {
        const res = await fetchSupabase(`inspectors?id=eq.${inspectorForm.id}`, 'PATCH', payload);
        const data = Array.isArray(res) ? res[0] : res;
        if (!data) throw new Error("Gagal mengupdate. Pastikan RLS dimatikan.");
        setDb(prev => ({ ...prev, inspectors: (prev.inspectors || []).map(i => i.id === inspectorForm.id ? data : i) }));
        alert("Inspector berhasil diupdate!");
      } else {
        const res = await fetchSupabase('inspectors', 'POST', payload);
        const data = Array.isArray(res) ? res[0] : res;
        if (!data) throw new Error("Gagal menyimpan. Pastikan RLS dimatikan.");
        setDb(prev => ({ ...prev, inspectors: [...(prev.inspectors || []), data] }));
        alert("Inspector berhasil ditambahkan!");
      }
      setInspectorForm({ id: null, name: '', initial: '', authority: 'User', password: '' });
    } catch(err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteInspector = async (insId) => {
    if(!window.confirm("Hapus inspector ini?")) return;
    try {
       await fetchSupabase(`inspectors?id=eq.${insId}`, 'DELETE');
    } catch(err) { console.warn("Peringatan dari Cloud: " + err.message); }
    setDb(prev => ({...prev, inspectors: (prev.inspectors || []).filter(i => i.id !== insId)})); 
    if(inspectorForm.id === insId) setInspectorForm({id:null, name:'', initial:'', authority: 'User', password: ''});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* TAB MENU */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="flex border-b dark:border-gray-700 text-sm md:text-base font-bold text-gray-500 bg-gray-50 dark:bg-gray-900/50">
          <button onClick={() => setActiveTab('inspectors')} className={`flex-1 py-4 text-center font-bold capitalize transition-colors ${activeTab === 'inspectors' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81] dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            Inspectors
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex-1 py-4 text-center font-bold capitalize transition-colors ${activeTab === 'profile' ? 'border-b-2 border-[#0F4C81] text-[#0F4C81] dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            Profil & Sistem
          </button>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'inspectors' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Users size={20}/> {inspectorForm.id ? 'Edit Inspector' : 'Tambah Inspector'}</span>
                  {inspectorForm.id && <button onClick={() => setInspectorForm({id:null, name:'', initial:'', authority: 'User', password: ''})} className="text-sm font-normal text-blue-600 hover:underline">Batal Edit</button>}
                </h3>
                <form className="space-y-4">
                  <div>
                    <label className={labelClass}>Nama Lengkap</label>
                    <input type="text" value={inspectorForm.name} onChange={e=>setInspectorForm({...inspectorForm, name: e.target.value})} className={inputClass} placeholder="Cth: Budi Santoso" />
                  </div>
                  <div>
                    <label className={labelClass}>Inisial (Maks. 3 Huruf)</label>
                    <input type="text" value={inspectorForm.initial} onChange={e => setInspectorForm({...inspectorForm, initial: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)})} maxLength={3} className={inputClass} placeholder="Cth: BDI" />
                  </div>
                  <div>
                    <label className={labelClass}>Authority</label>
                    <select className={inputClass} value={inspectorForm.authority} onChange={e => setInspectorForm({...inspectorForm, authority: e.target.value})}>
                      <option value="Admin">Admin</option>
                      <option value="User">User</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={inspectorForm.password} onChange={e => setInspectorForm({...inspectorForm, password: e.target.value})} className={inputClass} placeholder="Ketik Password..." />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={handleSaveInspector} className={`px-6 py-2.5 mt-2 text-white rounded-lg flex items-center justify-center font-medium shadow-sm transition-colors ${inspectorForm.id ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#294B73] hover:bg-blue-900'}`}>
                    {inspectorForm.id ? <Save size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>} Simpan
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Daftar Inspector</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-700">
                      <tr>
                        <th className="p-3 text-center">No</th>
                        <th>Nama Lengkap</th>
                        <th className="text-center">Inisial</th>
                        <th className="text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(db.inspectors || []).length === 0 ? (
                        <tr><td colSpan="4" className="text-center p-6 text-gray-500">Belum ada data.</td></tr>
                      ) : (
                        (db.inspectors || []).map((ins, idx) => (
                          <tr key={ins.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                            <td className="p-3 font-semibold">{ins.name}</td>
                            <td className="p-3 text-center"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-bold text-xs">{ins.initial}</span></td>
                            <td className="p-3 text-center flex justify-center gap-1">
                              <button onClick={() => setInspectorForm({id: ins.id, name: ins.name, initial: ins.initial, authority: ins.authority || 'User', password: ins.password || ''})} className="text-blue-500 p-1.5"><Edit size={16}/></button>
                              <button onClick={() => handleDeleteInspector(ins.id)} className="text-red-500 p-1.5"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border dark:border-gray-700">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-[#0F4C81]"/> Profil Pengguna</h3>
                  <div>
                    <label className={labelClass}>Akses Sebagai</label>
                    <select className={inputClass} value={currentUser?.role || 'Admin'} onChange={e => setCurrentUser({...currentUser, role: e.target.value})}>
                      <option value="Admin">Admin (Akses Penuh)</option>
                      <option value="User">User (Akses Terbatas)</option>
                      <option value="Viewer">Viewer (Hanya Melihat)</option>
                    </select>
                  </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800 flex items-start gap-3">
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300">Terhubung ke Cloud Database</h3>
                    <p className="text-xs mt-1 text-green-700 dark:text-green-400">Aplikasi telah dikonfigurasi secara permanen untuk menggunakan REST API Supabase secara real-time. Pengaturan API key manual telah dinonaktifkan demi keamanan.</p>
                  </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">Backup JSON</h3>
                  <p className="text-xs text-gray-500">Unduh salinan data dari cloud ke komputer Anda</p>
                </div>
                <button onClick={handleBackup} className="px-6 py-2.5 bg-[#0F4C81] text-white rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-blue-800 transition-colors"><Download size={16} /> Download</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}