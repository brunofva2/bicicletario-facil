import React, { useState } from 'react';
import { LayoutDashboard, LayoutGrid, Bike, History, Sliders, ListTodo, MoreHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'dashboard' | 'map' | 'bikes' | 'history' | 'requests' | 'tasks';
  registeredBikesCount: number;
  dueReevaluationsCount: number;
  onTabChange: (tab: 'dashboard' | 'map' | 'bikes' | 'history' | 'requests' | 'tasks') => void;
  onOpenConfig: () => void;
  canManageSettings?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, registeredBikesCount, dueReevaluationsCount, onTabChange, onOpenConfig, canManageSettings = true }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigate = (tab: 'dashboard' | 'map' | 'bikes' | 'history' | 'requests' | 'tasks') => { setIsMoreOpen(false); onTabChange(tab); };
  const primaryItem = (tab: 'dashboard' | 'map' | 'tasks', label: string, icon: React.ReactNode) => <button type="button" onClick={() => navigate(tab)} className={`flex h-full flex-col items-center justify-center py-1 transition ${activeTab === tab ? 'font-bold text-[#0d1733]' : 'text-slate-500 hover:text-slate-800'}`}><span className="relative">{icon}{activeTab === tab && <i className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f19a00]" />}</span><span className="mt-1 text-[10px] font-mono leading-none">{label}</span></button>;
  return <>
    {isMoreOpen && <div className="fixed bottom-[4.5rem] right-3 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
      <button type="button" onClick={() => navigate('bikes')} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 hover:bg-orange-50"><Bike className="h-4 w-4 text-[#e87c0b]" />Cadastro <span className="ml-auto text-[10px] text-slate-400">{registeredBikesCount}</span></button>
      <button type="button" onClick={() => navigate('history')} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 hover:bg-orange-50"><History className="h-4 w-4 text-[#e87c0b]" />Histórico</button>
      {canManageSettings && <button type="button" onClick={() => { setIsMoreOpen(false); onOpenConfig(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-700 hover:bg-orange-50"><Sliders className="h-4 w-4 text-[#e87c0b]" />Ajustes</button>}
    </div>}
    <nav id="mobile-bottom-navigation" aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md safe-area-bottom sm:hidden">
      <div className="grid h-16 grid-cols-4 items-center px-1">
        {primaryItem('dashboard', 'Painel', <LayoutDashboard className="h-5 w-5" />)}
        {primaryItem('map', 'Mapa', <LayoutGrid className="h-5 w-5" />)}
        <button type="button" onClick={() => navigate('tasks')} className={`flex h-full flex-col items-center justify-center py-1 transition ${activeTab === 'tasks' ? 'font-bold text-[#0d1733]' : 'text-slate-500 hover:text-slate-800'}`}><span className="relative"><ListTodo className="h-5 w-5" />{dueReevaluationsCount > 0 && <i className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-amber-500" />}{activeTab === 'tasks' && <i className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#f19a00]" />}</span><span className="mt-1 text-[10px] font-mono leading-none">Tarefas</span></button>
        <button type="button" onClick={() => setIsMoreOpen((open) => !open)} className={`flex h-full flex-col items-center justify-center py-1 transition ${isMoreOpen || activeTab === 'bikes' || activeTab === 'history' ? 'font-bold text-[#0d1733]' : 'text-slate-500 hover:text-slate-800'}`}><MoreHorizontal className="h-5 w-5" /><span className="mt-1 text-[10px] font-mono leading-none">Mais</span></button>
      </div>
    </nav>
  </>;
};
