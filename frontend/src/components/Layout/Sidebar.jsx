import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../utils/helpers';
import {
  LayoutDashboard, Users, Building2, Calendar, ClipboardList,
  BarChart3, FileText, UserCog, ChevronLeft, ChevronRight, Sparkles, Sliders,
} from 'lucide-react';

const navItems = [
  { section: 'Utama', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: null },
  ]},
  { section: 'DAMAI Engine', items: [
    { to: '/kpi/input', icon: ClipboardList, label: 'Input KPI', roles: ['admin', 'manajer_unit', 'dosen_tendik'] },
    { to: '/kpi/scores', icon: BarChart3, label: 'Skor DAMAI', roles: ['yayasan', 'admin', 'pimpinan', 'manajer_unit', 'dosen_tendik'] },
    { to: '/kpi/weights', icon: Sliders, label: 'Bobot KPI', roles: ['admin'] },
    { to: '/reviews', icon: FileText, label: 'Performance Review', roles: ['yayasan', 'admin', 'pimpinan', 'manajer_unit', 'dosen_tendik'] },
  ]},
  { section: 'Master Data', items: [
    { to: '/organization', icon: Building2, label: 'Unit & Fakultas', roles: ['yayasan', 'admin'] },
    { to: '/employees', icon: Users, label: 'Pegawai', roles: ['yayasan', 'admin', 'pimpinan', 'manajer_unit'] },
    { to: '/periods', icon: Calendar, label: 'Periode', roles: ['admin'] },
  ]},
  { section: 'Administrasi', items: [
    { to: '/users', icon: UserCog, label: 'Manajemen User', roles: ['admin'] },
  ]},
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const canAccess = (roles) => !roles || roles.includes(user?.role);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-primary-900 min-h-screen flex flex-col transition-all duration-300`}>
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-primary-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">DAMAI</p>
            <p className="text-primary-400 text-[10px] font-medium leading-tight mt-0.5">Yayasan Dhyana Pura</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(section => {
          const visible = section.items.filter(i => canAccess(i.roles));
          if (visible.length === 0) return null;
          return (
            <div key={section.section} className="mb-4">
              {!collapsed && <p className="px-4 mb-1 text-[10px] font-bold text-primary-500 uppercase tracking-widest">{section.section}</p>}
              {visible.map(item => (
                <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 mx-2 rounded-lg mb-0.5 ${
                      isActive ? 'bg-primary-700 text-white' : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`
                  }>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{(user?.employee_name || user?.username || '?')[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.employee_name || user?.username}</p>
              <p className="text-[10px] text-primary-400 truncate">{getRoleLabel(user?.role)}</p>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-center py-3 border-t border-primary-800 text-primary-400 hover:text-white hover:bg-primary-800 transition-colors">
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4 mr-2" /><span className="text-xs">Sembunyikan</span></>}
      </button>
    </aside>
  );
}
