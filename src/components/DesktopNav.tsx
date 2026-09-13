import React from 'react';
import { LayoutDashboard, LayoutGrid, Bike, History, Clock, ListTodo } from 'lucide-react';

interface DesktopNavProps {
  activeTab: 'dashboard' | 'map' | 'history' | 'bikes' | 'requests' | 'tasks';
  spotsCount: number;
  registeredBikesCount: number;
  dueReevaluationsCount?: number;
  logsCount?: number;
  onTabChange: (tab: 'dashboard' | 'map' | 'history' | 'bikes' | 'requests' | 'tasks') => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
  activeTab,
  spotsCount,
  registeredBikesCount,
  dueReevaluationsCount = 0,
  logsCount = 0,
  onTabChange,
}) => {
  return (
    <nav
      id="desktop-main-navigation"
      aria-label="Navegação Principal Desktop"
      className="hidden sm:block border-b border-orange-100/90 bg-[#fffaf2]/90 backdrop-blur-md shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-2.5">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-orange-100 bg-white p-1.5 shadow-sm">
            <button type="button" onClick={() => onTabChange('dashboard')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-mono font-bold select-none ${activeTab === 'dashboard' ? 'bg-[#0d1733] text-white shadow-md shadow-slate-900/15' : 'text-slate-600 hover:text-[#0d1733] hover:bg-orange-50'}`} title="Visão geral do bicicletário"><LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-[#F19A00]' : 'text-slate-500'}`} /><span>Painel</span></button>
            {/* Tab 1: Mapa de Vagas */}
            <button
              type="button"
              id="nav-tab-map-btn"
              onClick={() => onTabChange('map')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-mono font-bold select-none ${
                activeTab === 'map'
                  ? 'bg-[#0d1733] text-white shadow-md shadow-slate-900/15'
                  : 'text-slate-600 hover:text-[#0d1733] hover:bg-orange-50'
              }`}
              title="Visualizar mapa interativo dos ganchos e vagas suspensas"
            >
              <LayoutGrid
                className={`w-4 h-4 transition-transform ${
                  activeTab === 'map' ? 'text-[#F19A00] stroke-[2.3]' : 'text-slate-500'
                }`}
              />
              <span>Mapa de Vagas</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  activeTab === 'map'
                    ? 'bg-white/15 text-white border border-white/15'
                    : 'bg-orange-50 text-slate-600'
                }`}
              >
                {spotsCount}
              </span>
            </button>

            {/* Tab 2: Cadastro de Bikes */}
            <button
              type="button"
              id="nav-tab-bikes-btn"
              onClick={() => onTabChange('bikes')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-mono font-bold select-none ${
                activeTab === 'bikes'
                  ? 'bg-[#0d1733] text-white shadow-md shadow-slate-900/15'
                  : 'text-slate-600 hover:text-[#0d1733] hover:bg-orange-50'
              }`}
              title="Inventário de bicicletas cadastradas e controle de moradores"
            >
              <Bike
                className={`w-4 h-4 transition-transform ${
                  activeTab === 'bikes' ? 'text-[#F19A00] stroke-[2.3]' : 'text-slate-500'
                }`}
              />
              <span>Cadastro de Bikes</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  activeTab === 'bikes'
                    ? 'bg-white/15 text-white'
                    : 'bg-orange-50 text-slate-700'
                }`}
              >
                {registeredBikesCount}
              </span>

              {dueReevaluationsCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300"
                  title={`${dueReevaluationsCount} bikes cadastradas há mais de 2 anos requerem reavaliação bienal`}
                >
                  <Clock className="w-3 h-3 text-amber-700 shrink-0 animate-spin-slow" />
                  <span>{dueReevaluationsCount} reavaliação</span>
                </span>
              )}
            </button>

            <button type="button" onClick={() => onTabChange('tasks')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-mono font-bold select-none ${activeTab === 'tasks' ? 'bg-[#0d1733] text-white shadow-md shadow-slate-900/15' : 'text-slate-600 hover:text-[#0d1733] hover:bg-orange-50'}`} title="Pendências, reavaliações e solicitações">
              <ListTodo className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-[#F19A00]' : 'text-slate-500'}`} />
              <span>Tarefas</span>
            </button>

            {/* Tab 3: Histórico de Movimentações */}
            <button
              type="button"
              id="nav-tab-history-btn"
              onClick={() => onTabChange('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs font-mono font-bold select-none ${
                activeTab === 'history'
                  ? 'bg-[#0d1733] text-white shadow-md shadow-slate-900/15'
                  : 'text-slate-600 hover:text-[#0d1733] hover:bg-orange-50'
              }`}
              title="Histórico de auditoria, concessões, liberações e ocorrências"
            >
              <History
                className={`w-4 h-4 transition-transform ${
                  activeTab === 'history' ? 'text-[#F19A00] stroke-[2.3]' : 'text-slate-500'
                }`}
              />
              <span>Histórico & Auditoria</span>
              {logsCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                    activeTab === 'history'
                      ? 'bg-white/15 text-white border border-white/15'
                      : 'bg-orange-50 text-slate-600'
                  }`}
                >
                  {logsCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};
