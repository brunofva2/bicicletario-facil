import React, { useState } from 'react';
import {
  BicycleSpot,
  CondoModuleConfig,
  CondominiumProfile,
  SystemConfig,
} from '../types';
import {
  DEFAULT_CONDO_PRESETS,
  DEFAULT_MASTER_PIN,
  calculateTotalSpots,
  generateSpotsFromModules,
} from '../utils/spotGenerator';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Layers,
  Plus,
  Trash2,
  Building2,
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Copy,
  RefreshCw,
  FolderDown,
  Eye,
  EyeOff,
  Monitor,
  Laptop,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface MasterMaintenancePanelProps {
  config: SystemConfig;
  spots: BicycleSpot[];
  onSaveConfig: (newConfig: SystemConfig) => void;
  onApplyNewStructure: (
    newSpots: BicycleSpot[],
    updatedConfig: SystemConfig,
    preserveAllocations: boolean
  ) => void;
  onExportCondoPackage: () => void;
  onImportCondoPackage: (packageData: any) => void;
}

export const MasterMaintenancePanel: React.FC<MasterMaintenancePanelProps> = ({
  config,
  spots,
  onSaveConfig,
  onApplyNewStructure,
  onExportCondoPackage,
  onImportCondoPackage,
}) => {
  // Authentication State
  const masterPin = config.masterPin || DEFAULT_MASTER_PIN;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Maintenance Sub-tabs
  const [maintTab, setMaintTab] = useState<'modules' | 'condo' | 'install' | 'profiles' | 'security'>('modules');

  // PWA Desktop installation state
  const { isInstallable, isInstalled, isIOS, isDesktop, install: triggerInstall } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Working state for Condo Data
  const [condoName, setCondoName] = useState(config.condominiumName);
  const [condoCode, setCondoCode] = useState(config.condominiumCode || '');
  const [condoCity, setCondoCity] = useState(config.condominiumCity || '');
  const [managerName, setManagerName] = useState(config.managerName || '');
  const [managerPhone, setManagerPhone] = useState(config.managerPhone || '');
  const [deploymentNotes, setDeploymentNotes] = useState(config.deploymentNotes || '');
  const [lockCondoName, setLockCondoName] = useState(!!config.lockCondoNameForSyndic);
  const [lockResetDemo, setLockResetDemo] = useState(!!config.lockResetDemoForSyndic);

  // Working state for Modules
  const initialModules: CondoModuleConfig[] =
    config.modules && config.modules.length > 0
      ? config.modules
      : [
          {
            id: 'mod-1',
            name: 'Módulo 1 - Subsolo G1 (Parede Norte)',
            prefix: 'S-',
            startNumber: 1,
            spotCount: Math.min(25, spots.length || 25),
            hookType: 'Gancho Vertical c/ Apoio de Pneu',
            maxWeightKg: 28,
          },
          ...(spots.length > 25
            ? [
                {
                  id: 'mod-2',
                  name: 'Módulo 2 - Térreo / Pátio',
                  prefix: 'T-',
                  startNumber: 26,
                  spotCount: spots.length - 25,
                  hookType: 'Suporte Articulado Giratório' as const,
                  maxWeightKg: 30,
                },
              ]
            : []),
        ];

  const [modules, setModules] = useState<CondoModuleConfig[]>(initialModules);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<'preserve' | 'clean'>('preserve');

  // Change PIN state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  // Saved client profiles
  const [savedProfiles, setSavedProfiles] = useState<CondominiumProfile[]>(
    config.clientProfiles || []
  );
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Handle PIN verification
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === masterPin) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Lock panel
  const handleLock = () => {
    setIsUnlocked(false);
    setPinInput('');
  };

  // Preset Selection
  const handleApplyPreset = (presetId: string) => {
    const found = DEFAULT_CONDO_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setModules(
        found.modules.map((m) => ({
          ...m,
          id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        }))
      );
    }
  };

  // Add Module
  const handleAddModule = () => {
    const currentTotal = calculateTotalSpots(modules);
    const nextStart = currentTotal + 1;
    const newMod: CondoModuleConfig = {
      id: `mod-${Date.now()}`,
      name: `Módulo ${modules.length + 1} - Setor Adicional`,
      prefix: `M${modules.length + 1}-`,
      startNumber: nextStart,
      spotCount: 25,
      hookType: 'Gancho Vertical c/ Apoio de Pneu',
      maxWeightKg: 28,
    };
    setModules([...modules, newMod]);
  };

  // Update Module field
  const handleUpdateModule = (
    id: string,
    field: keyof CondoModuleConfig,
    value: any
  ) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Remove Module
  const handleRemoveModule = (id: string) => {
    if (modules.length <= 1) {
      alert('O condomínio precisa ter ao menos 1 módulo de vagas.');
      return;
    }
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  // Save Governance Details
  const handleSaveGovernance = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemConfig = {
      ...config,
      condominiumName: condoName.trim() || config.condominiumName,
      condominiumCode: condoCode.trim(),
      condominiumCity: condoCity.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),
      deploymentNotes: deploymentNotes.trim(),
      lockCondoNameForSyndic: lockCondoName,
      lockResetDemoForSyndic: lockResetDemo,
      modules,
      totalSuspendedHooks: calculateTotalSpots(modules),
    };
    onSaveConfig(updated);
    setProfileSuccessMsg('Dados de governança e travas do condomínio atualizados com sucesso!');
    setTimeout(() => setProfileSuccessMsg(null), 3500);
  };

  // Confirm and Apply New Structure
  const handleExecuteStructureChange = () => {
    const totalSpots = calculateTotalSpots(modules);
    if (totalSpots <= 0) {
      alert('A quantidade total de vagas deve ser maior que 0.');
      return;
    }

    const preserveAllocations = applyMode === 'preserve';
    const newSpots = generateSpotsFromModules(modules, spots, preserveAllocations);

    const updatedConfig: SystemConfig = {
      ...config,
      condominiumName: condoName.trim() || config.condominiumName,
      condominiumCode: condoCode.trim(),
      condominiumCity: condoCity.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),
      deploymentNotes: deploymentNotes.trim(),
      lockCondoNameForSyndic: lockCondoName,
      lockResetDemoForSyndic: lockResetDemo,
      modules,
      totalSuspendedHooks: totalSpots,
      clientProfiles: savedProfiles,
    };

    onApplyNewStructure(newSpots, updatedConfig, preserveAllocations);
    setConfirmModalOpen(false);
    setProfileSuccessMsg(
      `Estrutura de ${totalSpots} vagas gerada com sucesso (${preserveAllocations ? 'alocações preservadas' : 'nova implantação limpa'})!`
    );
    setTimeout(() => setProfileSuccessMsg(null), 4000);
  };

  // Save current condo as client profile
  const handleSaveProfile = () => {
    const newProfile: CondominiumProfile = {
      id: `profile-${Date.now()}`,
      condominiumName: condoName.trim() || 'Novo Condomínio',
      condominiumCode: condoCode.trim(),
      city: condoCity.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),
      notes: deploymentNotes.trim(),
      modules,
      totalSpots: calculateTotalSpots(modules),
      savedAt: new Date().toISOString(),
    };

    const updated = [newProfile, ...savedProfiles.filter((p) => p.condominiumName !== newProfile.condominiumName)];
    setSavedProfiles(updated);

    const updatedConfig: SystemConfig = {
      ...config,
      clientProfiles: updated,
    };
    onSaveConfig(updatedConfig);
    setProfileSuccessMsg(`Perfil "${newProfile.condominiumName}" salvo na biblioteca de clientes!`);
    setTimeout(() => setProfileSuccessMsg(null), 3500);
  };

  // Load a saved profile into working state
  const handleLoadProfile = (profile: CondominiumProfile) => {
    if (
      window.confirm(
        `Carregar o condomínio "${profile.condominiumName}" (${profile.totalSpots} vagas)? Isso preencherá os módulos e dados para implantação.`
      )
    ) {
      setCondoName(profile.condominiumName);
      setCondoCode(profile.condominiumCode || '');
      setCondoCity(profile.city || '');
      setManagerName(profile.managerName || '');
      setManagerPhone(profile.managerPhone || '');
      setDeploymentNotes(profile.notes || '');
      setModules(profile.modules);
      setMaintTab('modules');
      setProfileSuccessMsg(`Perfil de "${profile.condominiumName}" carregado no editor! Clique em "Aplicar Estrutura" para provisionar.`);
      setTimeout(() => setProfileSuccessMsg(null), 4500);
    }
  };

  // Delete a saved profile
  const handleDeleteProfile = (profileId: string) => {
    const updated = savedProfiles.filter((p) => p.id !== profileId);
    setSavedProfiles(updated);
    onSaveConfig({
      ...config,
      clientProfiles: updated,
    });
  };

  // Change PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);

    if (newPin.length < 4) {
      setPinChangeError('A nova senha master deve ter no mínimo 4 dígitos ou caracteres.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('A confirmação da senha não coincide.');
      return;
    }

    const updatedConfig: SystemConfig = {
      ...config,
      masterPin: newPin.trim(),
    };
    onSaveConfig(updatedConfig);
    setPinChangeSuccess(true);
    setNewPin('');
    setConfirmPin('');
  };

  // Total spots in working configuration
  const totalCalculatedSpots = calculateTotalSpots(modules);
  const occupiedSpotsCount = spots.filter((s) => !!s.currentAllocation).length;

  // ================= RENDER: LOCKED STATE =================
  if (!isUnlocked) {
    return (
      <div className="p-6 space-y-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/40 shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Acesso Restrito ao Prestador do Serviço</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-sans tracking-tight text-white">
              Painel Avançado de Manutenção & Implantação
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-normal">
              Esta área é exclusiva para o desenvolvedor / prestador de serviços customizar a estrutura de cada condomínio (20, 50, 100, 200 até 500+ vagas), setores, módulos e travas de segurança patrimonial.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 max-w-md mx-auto py-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Digite a Senha Master do Prestador:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-mono font-normal flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPin ? 'Ocultar' : 'Ver'}</span>
              </button>
            </label>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                autoFocus
                required
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Digite o PIN / Senha Master..."
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border font-mono tracking-widest transition-all shadow-2xs ${
                  pinError
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600'
                }`}
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-600 font-mono flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Senha master incorreta. Verifique e tente novamente.</span>
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
            <p className="font-bold font-mono flex items-center gap-1.5 text-amber-950">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Chave de Fábrica Inicial:</span>
            </p>
            <p className="text-[11px] text-amber-800">
              A senha padrão inicial é <strong>1997</strong>. Após desbloquear, você pode alterá-la para sua senha pessoal na aba "Segurança".
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-mono font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Desbloquear Manutenção Master</span>
          </button>
        </form>
      </div>
    );
  }

  // ================= RENDER: UNLOCKED MASTER PANEL =================
  return (
    <div className="space-y-5 p-5">
      {/* Top Master Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Modo Prestador Ativo
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                {totalCalculatedSpots} Vagas
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate max-w-sm">
              Condomínio: <strong>{condoName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors"
            title="Bloquear painel para impedir acesso do síndico"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Trancar Painel</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {profileSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {/* Maintenance Sub Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-mono font-bold border border-slate-200">
        <button
          type="button"
          onClick={() => setMaintTab('modules')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            maintTab === 'modules'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dimensionamento de Vagas ({totalCalculatedSpots})</span>
        </button>

        <button
          type="button"
          onClick={() => setMaintTab('condo')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            maintTab === 'condo'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Dados & Travas do Cliente</span>
        </button>

        <button
          type="button"
          onClick={() => setMaintTab('profiles')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            maintTab === 'profiles'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderDown className="w-3.5 h-3.5" />
          <span>Clientes Salvos ({savedProfiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMaintTab('install')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            maintTab === 'install'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-indigo-600" />
          <span>Instalar App Desktop {isInstalled && '✓'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMaintTab('security')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            maintTab === 'security'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Alterar Senha Master</span>
        </button>
      </div>

      {/* ================= TAB 1: MODULES & CAPACITY BUILDER ================= */}
      {maintTab === 'modules' && (
        <div className="space-y-5">
          {/* Presets Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Presets Rápidos de Implantação (1 Clique):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DEFAULT_CONDO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all shadow-2xs group"
                >
                  <span className="block text-xs font-mono font-bold text-slate-900 group-hover:text-indigo-700">
                    {preset.badge}
                  </span>
                  <span className="block text-[10px] text-slate-500 line-clamp-1 font-mono">
                    {preset.modules.length} Módulo(s)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Modules List Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Módulos de Vagas / Setores Cadastrados:</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                Cada módulo agrupa uma quantidade específica de ganchos em paredes ou pavimentos
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddModule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Módulo</span>
            </button>
          </div>

          {/* Modules List Cards */}
          <div className="space-y-3">
            {modules.map((mod, idx) => {
              const start = Number(mod.startNumber) || 1;
              const count = Number(mod.spotCount) || 10;
              const end = start + count - 1;
              const prefix = mod.prefix ? mod.prefix.trim() : 'V-';
              const sampleStart = start < 10 ? `0${start}` : `${start}`;
              const sampleEnd = end < 10 ? `0${end}` : `${end}`;

              return (
                <div
                  key={mod.id}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={mod.name}
                        onChange={(e) => handleUpdateModule(mod.id, 'name', e.target.value)}
                        placeholder="Nome do Módulo (ex: Subsolo 1 - Parede Norte)"
                        className="text-xs font-mono font-bold text-slate-900 px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white bg-slate-50 transition-colors w-full max-w-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                        Ganchos: {prefix}{sampleStart} até {prefix}{sampleEnd}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(mod.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover este módulo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Module Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Prefixo do Gancho:</label>
                      <input
                        type="text"
                        value={mod.prefix}
                        onChange={(e) => handleUpdateModule(mod.id, 'prefix', e.target.value)}
                        placeholder="Ex: S-, V-, A-"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Nº Inicial:</label>
                      <input
                        type="number"
                        min="1"
                        value={mod.startNumber}
                        onChange={(e) =>
                          handleUpdateModule(mod.id, 'startNumber', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Qtd. de Vagas:</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={mod.spotCount}
                        onChange={(e) =>
                          handleUpdateModule(mod.id, 'spotCount', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 font-bold bg-indigo-50/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Tipo de Suporte:</label>
                      <select
                        value={mod.hookType}
                        onChange={(e) => handleUpdateModule(mod.id, 'hookType', e.target.value as any)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white text-[11px]"
                      >
                        <option value="Gancho Vertical c/ Apoio de Pneu">Gancho Vertical</option>
                        <option value="Suporte Articulado Giratório">Articulado Giratório</option>
                        <option value="Gancho Teto Suspenso">Gancho Teto Suspenso</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Capacidade Carga:</label>
                      <select
                        value={mod.maxWeightKg}
                        onChange={(e) =>
                          handleUpdateModule(mod.id, 'maxWeightKg', parseInt(e.target.value, 10) || 28)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white text-[11px]"
                      >
                        <option value="25">25 kg (Padrão)</option>
                        <option value="28">28 kg (Reforçado)</option>
                        <option value="30">30 kg (Heavy Duty)</option>
                        <option value="35">35 kg (E-Bikes)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Capacity Summary & Action Bar */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-slate-900">
                  Capacidade Total: <span className="text-indigo-600 text-base">{totalCalculatedSpots} Vagas</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({modules.length} {modules.length === 1 ? 'módulo' : 'módulos'})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                {occupiedSpotsCount} vaga(s) atualmente com moradores alocados no sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-mono font-bold transition-all shadow-sm w-full sm:w-auto justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Provisionar / Aplicar Vagas Deste Condomínio</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CONDO DATA & GOVERNANCE LOCKS ================= */}
      {maintTab === 'condo' && (
        <form onSubmit={handleSaveGovernance} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nome Oficial do Condomínio:</label>
              <input
                type="text"
                required
                value={condoName}
                onChange={(e) => setCondoName(e.target.value)}
                placeholder="Ex: Residencial Jardins das Palmeiras"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">CNPJ / Código do Contrato do Cliente:</label>
              <input
                type="text"
                value={condoCode}
                onChange={(e) => setCondoCode(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00 ou CONTRATO-2026-01"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Cidade / Estado (UF):</label>
              <input
                type="text"
                value={condoCity}
                onChange={(e) => setCondoCity(e.target.value)}
                placeholder="Ex: São Paulo - SP"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nome do Síndico / Gestor do Condomínio:</label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Ex: Maria Regina de Souza"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">WhatsApp / Telefone da Administração:</label>
              <input
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Notas Técnicas da Entrega / Implantação:</label>
              <textarea
                rows={2}
                value={deploymentNotes}
                onChange={(e) => setDeploymentNotes(e.target.value)}
                placeholder="Observações internas (ex: Vistoria realizada com o conselho em 10/09, chaves e plaquetas entregues ao zelador)."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          {/* Security Governance Locks */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2.5">
            <h4 className="text-xs font-bold font-mono text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Travas de Segurança para o Síndico (Evita Alterações Acidentais):</span>
            </h4>

            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockCondoName}
                  onChange={(e) => setLockCondoName(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900">
                    Bloquear alteração do Nome do Condomínio na tela comum
                  </span>
                  <p className="text-[11px] text-slate-600">
                    O síndico não poderá renomear o condomínio nos ajustes normais sem a sua senha master.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockResetDemo}
                  onChange={(e) => setLockResetDemo(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900">
                    Ocultar botão de "Restaurar Demonstração" para o síndico
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Evita que o síndico apague as vagas e moradores reais implantados por você clicando em resetar.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-bold transition-colors shadow-2xs"
              title="Salva este condomínio na lista de clientes para carregar futuramente"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Salvar na Lista de Clientes</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
            >
              Salvar Dados do Cliente
            </button>
          </div>
        </form>
      )}

      {/* ================= TAB 3: CLIENT PROFILES & PACKAGES ================= */}
      {maintTab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
                Biblioteca de Condomínios Salvos ({savedProfiles.length})
              </h4>
              <p className="text-[11px] text-slate-500 font-mono">
                Gerencie múltiplos condomínios atendidos ou exporte o pacote de implantação completo
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportCondoPackage}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-bold shadow-2xs"
                title="Exportar arquivo deste condomínio para entregar ou fazer backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Pacote (.JSON)</span>
              </button>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        onImportCondoPackage(parsed);
                      } catch {
                        alert('Arquivo JSON inválido.');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-bold shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar Pacote</span>
                </button>
              </div>
            </div>
          </div>

          {savedProfiles.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-mono text-slate-600">
                Nenhum condomínio salvo na biblioteca ainda.
              </p>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-mono font-bold"
              >
                Salvar Condomínio Atual Como Primeiro Cliente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedProfiles.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 shadow-2xs space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold font-mono text-slate-900">{p.condominiumName}</h5>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {p.city || 'Cidade não inf.'} • {p.totalSpots} Vagas em {p.modules.length} Módulo(s)
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                      {p.totalSpots} vagas
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleLoadProfile(p)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Carregar no Editor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(p.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Excluir este perfil salvo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: INSTALL DESKTOP APP (PWA) ================= */}
      {maintTab === 'install' && (
        <div className="space-y-5">
          {/* Main Hero Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-500/20 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                      Implantação no Cliente
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold font-mono">
                      PWA Nativo
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-sans text-white mt-0.5">
                    Instalar Aplicativo na Máquina do Condomínio
                  </h3>
                </div>
              </div>

              {isInstalled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>App Já Instalado</span>
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed max-w-2xl">
              Este recurso fica <strong>restrito à Manutenção Master</strong> para que o síndico e moradores não tenham acesso a prompts ou configurações. Como prestador de serviço, instale o aplicativo diretamente no computador da portaria ou administração. O sistema será aberto em janela dedicada, sem barra de navegador, com ícone oficial na Área de Trabalho e funcionamento 100% offline.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {isInstalled ? (
                <div className="w-full p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Aplicativo desktop ativo e fixado no sistema operacional deste computador.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInstallModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-mono font-bold transition-colors shrink-0"
                  >
                    Ver Instruções
                  </button>
                </div>
              ) : (
                <button
                  id="master-install-desktop-btn"
                  type="button"
                  onClick={async () => {
                    if (isInstallable) {
                      const outcome = await triggerInstall();
                      if (outcome !== 'accepted') {
                        setIsInstallModalOpen(true);
                      }
                    } else {
                      setIsInstallModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-md hover:shadow-indigo-500/30 transition-all active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Aplicativo no Computador Agora</span>
                </button>
              )}
            </div>
          </div>

          {/* Procedimento para o Prestador */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Laptop className="w-4 h-4 text-slate-700" />
              <span>Procedimento de Entrega ao Condomínio:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">1</span>
                  <span>Configurar Vagas</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Defina a quantidade de ganchos, setores e o nome oficial do condomínio no dimensionador ao lado.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">2</span>
                  <span>Instalar no PC</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Clique no botão acima para criar o ícone nativo "Bicicletário" na Área de Trabalho e Menu Iniciar do Windows/Mac.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">3</span>
                  <span>Trancar Painel</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Clique em "Trancar Painel" no topo. O síndico e portaria usarão o software sem ter acesso a estes ajustes.
                </p>
              </div>
            </div>
          </div>

          {/* Dica de Instalação Manual se o navegador exigir */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 text-xs font-mono space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Dica para Chrome / Edge / Brave:</span>
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Se você preferir ou se o navegador estiver em ambiente restrito, também é possível clicar no ícone <strong>🖥️ ou ⊕ (Instalar)</strong> que aparece no canto direito da barra de endereços (URL) do navegador, ou ir no menu <strong>⋮ &gt; Salvar e Compartilhar &gt; Instalar Bicicletário...</strong>
            </p>
          </div>
        </div>
      )}

      {/* ================= TAB 5: CHANGE MASTER PASSWORD ================= */}
      {maintTab === 'security' && (
        <form onSubmit={handleChangePin} className="max-w-md space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono space-y-1">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Segurança da Senha Master do Prestador:</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Altere a senha que dá acesso a este painel avançado. Guarde esta senha em local seguro para futuras manutenções ou novas implantações.
            </p>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nova Senha Master:</label>
              <input
                type="password"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Mínimo 4 caracteres..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Confirmar Nova Senha:</label>
              <input
                type="password"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repita a nova senha..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          {pinChangeError && (
            <p className="text-xs text-rose-600 font-mono bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {pinChangeError}
            </p>
          )}

          {pinChangeSuccess && (
            <p className="text-xs text-emerald-700 font-mono bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              Senha Master alterada com sucesso! Guarde-a com segurança.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
          >
            Salvar Nova Senha Master
          </button>
        </form>
      )}

      {/* ================= CONFIRMATION MODAL: APPLY NEW STRUCTURE ================= */}
      {confirmModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setConfirmModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900">
                  Confirmar Provisionamento de Estrutura
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {totalCalculatedSpots} Vagas em {modules.length} Módulo(s) para o condomínio "{condoName}"
                </p>
              </div>
            </div>

            <div className="space-y-3 py-2 text-xs font-mono">
              <p className="text-slate-700">
                Escolha como deseja aplicar a nova estrutura de ganchos suspensos:
              </p>

              {/* Mode A */}
              <label
                className={`p-3 rounded-xl border block cursor-pointer transition-all ${
                  applyMode === 'preserve'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="applyMode"
                    value="preserve"
                    checked={applyMode === 'preserve'}
                    onChange={() => setApplyMode('preserve')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <strong className="block text-slate-900">
                      Modo 1: Preservar Moradores e Alocações Existentes (Recomendado)
                    </strong>
                    <span className="text-[11px] text-slate-600 block mt-0.5">
                      Mantém os moradores alocados em seus ganchos correspondentes e apenas cria os novos ganchos adicionais. Ideal para ampliação de bicicletário.
                    </span>
                  </div>
                </div>
              </label>

              {/* Mode B */}
              <label
                className={`p-3 rounded-xl border block cursor-pointer transition-all ${
                  applyMode === 'clean'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-950'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="applyMode"
                    value="clean"
                    checked={applyMode === 'clean'}
                    onChange={() => setApplyMode('clean')}
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <strong className="block text-rose-900">
                      Modo 2: Nova Implantação Limpa do Zero (Novo Condomínio)
                    </strong>
                    <span className="text-[11px] text-rose-700 block mt-0.5">
                      Gera todas as {totalCalculatedSpots} vagas 100% livres e desocupadas. Ideal para entregar um condomínio novo pronto para inauguração.
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-mono font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteStructureChange}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold shadow-sm"
              >
                Confirmar e Gerar Vagas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Guide Modal when triggered inside Master Maintenance */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        isDesktop={isDesktop}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={triggerInstall}
      />
    </div>
  );
};
