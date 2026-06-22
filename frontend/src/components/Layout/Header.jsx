import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getRoleLabel } from '../../utils/helpers';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);

  useEffect(() => {
    api.get('/notifications?limit=10').then(r => setNotifications(r.data.data || [])).catch(() => {});
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  }

  function handleLogout() { logout(); navigate('/login'); }

  const typeBgs = { info: 'bg-blue-50', warning: 'bg-yellow-50', alert: 'bg-red-50', success: 'bg-green-50' };
  const typeDots = { info: 'bg-blue-500', warning: 'bg-yellow-500', alert: 'bg-red-500', success: 'bg-green-500' };

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm">
      <div className="flex-1" />

      <div className="relative">
        <button onClick={() => { setShowNotif(v => !v); setShowUser(false); }}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {showNotif && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-800">Notifikasi</p>
              {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline font-medium">Tandai semua dibaca</button>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Tidak ada notifikasi</p>
              ) : notifications.slice(0, 8).map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 ${!n.is_read ? typeBgs[n.type] || 'bg-blue-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? typeDots[n.type] || 'bg-blue-500' : 'bg-slate-200'}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button onClick={() => { setShowUser(v => !v); setShowNotif(false); }}
          className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{(user?.employee_name || user?.username || '?')[0].toUpperCase()}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.employee_name || user?.username}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{getRoleLabel(user?.role)}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
        </button>
        {showUser && (
          <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-800">{user?.employee_name || user?.username}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <Link to="/profile" onClick={() => setShowUser(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <User className="w-4 h-4 text-slate-400" /> Profil Saya
            </Link>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        )}
      </div>

      {(showNotif || showUser) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotif(false); setShowUser(false); }} />
      )}
    </header>
  );
}
