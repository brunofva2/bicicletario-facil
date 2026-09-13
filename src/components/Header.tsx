import React from 'react';
import { SystemConfig, BicycleSpot } from '../types';
import {
  Sliders,
  Building,
  HardDrive,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

interface HeaderProps {
  config: SystemConfig;
  spots: BicycleSpot[];
  dueReevaluationsCount?: number;
  canManageSettings?: boolean;
  isCloudMode?: boolean;
  onSignOut?: () => Promise<void>;
  supportModeLabel?: string;
  onExitSupportMode?: () => void;
  onTabChange?: (tab: 'map' | 'history' | 'bikes') => void;
  onOpenConfig: () => void;
  onOpenHelpGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  spots,
  dueReevaluationsCount = 0,
  canManageSettings = true,
  isCloudMode = false,
  onSignOut,
  supportModeLabel,
  onExitSupportMode,
  onTabChange,
  onOpenConfig,
  onOpenHelpGuide,
}) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="brand-topbar sticky top-0 z-30" data-theme={isDark ? 'dark' : 'light'}>
      {supportModeLabel && <div className="bg-amber-500 px-4 py-1.5 text-center text-[11px] font-mono font-bold text-slate-950">Demonstração Nobrutec <button onClick={onExitSupportMode} className="ml-3 underline">Voltar à Central</button></div>}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Condominium Title */}
          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="shrink-0">
                <img src={isDark ? '/logo-bicicletario-facil-white.png' : '/logo-bicicletario-facil-navy.png'} alt="Bicicletário Fácil" className="h-auto w-28 sm:w-32" />
              </div>

              {/* Condominium identification */}
              <div className="min-w-0 border-l border-white/20 pl-2.5 sm:pl-3">
                <p className="flex min-w-0 items-center gap-1 text-[10px] font-mono text-white/70 sm:text-[11px]">
                  <Building className="h-3 w-3 shrink-0 text-white/55" />
                  <span className="max-w-[185px] truncate font-semibold sm:max-w-none" title={config.condominiumName}>
                    {config.condominiumName}
                  </span>
                </p>
              </div>
            </div>

            {/* Mobile Top-Right Actions */}
            <div className="grid grid-cols-4 items-center gap-1.5 md:hidden">
              <button type="button" onClick={toggleTheme} className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors" title={isDark ? 'Usar modo claro' : 'Usar modo escuro'}>{isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}</button>
              {canManageSettings && <button
                type="button"
                onClick={onOpenConfig}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                title="Ajustes do condomínio"
              ><Sliders className="w-4 h-4" /></button>}
              {onSignOut && <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title="Sair da conta"
              ><LogOut className="w-4 h-4" /></button>}
              <button
                id="mobile-header-help-btn"
                type="button"
                onClick={onOpenHelpGuide}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/90 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs font-mono text-xs font-bold active:scale-95"
                title="Manual & Guia do Síndico"
              >
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[11px]">Ajuda</span>
              </button>
            </div>
          </div>

          {/* Desktop Quick Actions (Help & Config) */}
          <div className="header-quick-actions hidden md:flex items-center gap-2 shrink-0">
            <button type="button" onClick={toggleTheme} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs text-xs font-mono font-semibold" title={isDark ? 'Usar modo claro' : 'Usar modo escuro'}>{isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}<span className="hidden lg:inline">{isDark ? 'Claro' : 'Escuro'}</span></button>
            <button
              id="header-help-btn"
              type="button"
              onClick={onOpenHelpGuide}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100 text-xs font-bold font-mono transition-colors shadow-2xs active:scale-95"
              title="Manual, Apresentação & Guia do Síndico"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="hidden xl:inline">Guia</span>
            </button>

            {canManageSettings && <button
              id="header-config-btn"
              type="button"
              onClick={onOpenConfig}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs text-xs font-mono font-semibold"
              title="Configurações do Condomínio e Backup Local"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Ajustes</span>
            </button>}
            {onSignOut && <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs text-xs font-mono font-semibold"
              title="Sair da conta"
            ><LogOut className="w-4 h-4 text-slate-600" /><span className="hidden md:inline">Sair</span></button>}
          </div>
        </div>
      </div>
    </header>
  );
};
