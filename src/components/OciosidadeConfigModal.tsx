import React, { useState, useRef, useEffect } from 'react';
import { SystemConfig, BicycleSpot } from '../types';
import { MasterMaintenancePanel } from './MasterMaintenancePanel';
import { FloorPlanEditor } from './FloorPlanEditor';
import {
  X,
  Sliders,
  Check,
  Building2,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Database,
  Lock,
  Wrench,
} from 'lucide-react';

interface OciosidadeConfigModalProps {
  config: SystemConfig;
  spots: BicycleSpot[];
  isOpen: boolean;
  registeredBikesCount?: number;
  logsCount?: number;
  onClose: () => void;
  onSaveConfig: (newConfig: SystemConfig) => void;
  onSyncPlanSpots?: (sync: { created: BicycleSpot[]; attached: BicycleSpot[] }) => void;
  onExportBackup?: () => void;
  onImportBackup?: (backupData: any) => void;
  onResetDefaults?: () => void;
  onApplyNewStructure?: (
    newSpots: BicycleSpot[],
    updatedConfig: SystemConfig,
    preserveAllocations: boolean
  ) => void;
  onExportCondoPackage?: () => void;
  onImportCondoPackage?: (packageData: any) => void;
  canUseMasterMaintenance?: boolean;
}

export const OciosidadeConfigModal: React.FC<OciosidadeConfigModalProps> = ({
  config,
  spots,
  isOpen,
  registeredBikesCount = 0,
  logsCount = 0,
  onClose,
  onSaveConfig,
  onSyncPlanSpots,
  onExportBackup,
  onImportBackup,
  onResetDefaults,
  onApplyNewStructure,
  onExportCondoPackage,
  onImportCondoPackage,
  canUseMasterMaintenance = false,
}) => {
  const [activeTab, setActiveTab] = useState<'regras' | 'backup' | 'plant' | 'master'>('regras');
  const [condoName, setCondoName] = useState(config.condominiumName);
  const [expiryDays, setExpiryDays] = useState(config.expiryWarningDays);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCondoName(config.condominiumName);
    setExpiryDays(config.expiryWarningDays);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      condominiumName: condoName.trim() || 'Bicicletário do Condomínio',
      expiryWarningDays: Number(expiryDays) || 15,
    });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Arquivo JSON inválido.');
        }
        if (onImportBackup) {
          onImportBackup(parsed);
          onClose();
        }
      } catch (err: any) {
        setImportError(err.message || 'Erro ao processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="ociosidade-config-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="ociosidade-config-content"
        className={`glass-panel rounded-2xl w-full shadow-2xl overflow-hidden text-slate-800 border border-slate-200 my-auto transition-all duration-200 ${
          activeTab === 'master' || activeTab === 'plant' ? 'max-w-4xl max-h-[92vh] flex flex-col' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm">
              <Sliders className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-mono tracking-tight">
                Configurações & Gestão do Sistema
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {activeTab === 'master' || activeTab === 'plant'
                  ? 'Acesso avançado para implantação e manutenção de condomínios'
                  : 'Dados sincronizados na nuvem com contingência local'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {canUseMasterMaintenance && <button
            type="button"
            onClick={() => setActiveTab('plant')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'plant' ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg' : 'border-transparent text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/30 rounded-t-lg'}`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold">Planta baixa</span>
          </button>}
        </div>

        {/* Sub-tabs: Regras vs Backup Local vs Manutenção Master */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-100/70 px-4 sm:px-6 pt-2 gap-1.5 sm:gap-2 text-xs font-mono font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('regras')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'regras'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Regras do Condomínio</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Backup Local</span>
          </button>
          {canUseMasterMaintenance && <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ml-auto ${
              activeTab === 'master'
                ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/30 rounded-t-lg'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold">Manutenção Avançada</span>
          </button>}
        </div>

        {/* Tab 1: Regras do Condomínio */}
        {activeTab === 'regras' && (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Condominium Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5 font-mono">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Nome do Condomínio / Edifício:</span>
              </label>
              <input
                type="text"
                required
                disabled={config.lockCondoNameForSyndic}
                value={condoName}
                onChange={(e) => setCondoName(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-medium shadow-2xs ${
                  config.lockCondoNameForSyndic
                    ? 'border-slate-300 bg-slate-100/90 text-slate-600 cursor-not-allowed'
                    : 'border-slate-300 glass-input text-slate-900 focus:outline-none focus:border-slate-500'
                }`}
              />
              {config.lockCondoNameForSyndic && (
                <p className="text-[11px] text-amber-700 font-mono mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Nome fixado pelo prestador na implantação. Alterações via Manutenção Avançada.</span>
                </p>
              )}
            </div>

            {/* Expiry warning days */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-mono">
                Antecedência de alerta de vencimento (concessões com prazo):
              </label>
              <div className="flex gap-2">
                {[7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExpiryDays(days)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-mono font-semibold border transition-all shadow-2xs ${
                      expiryDays === days
                        ? 'bg-slate-900 text-white font-bold border-slate-900'
                        : 'glass-input text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {days} dias antes
                  </button>
                ))}
              </div>
            </div>

            {/* Total spots information */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-center justify-between">
              <span>Capacidade Contratada:</span>
              <strong className="text-slate-900 font-bold">{spots.length} Vagas Suspensas</strong>
            </div>

            {/* Buttons */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-mono font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
              >
                Salvar Regras
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Armazenamento Local & Backup */}
        {activeTab === 'backup' && (
          <div className="p-6 space-y-5">
            {/* Status do Armazenamento */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-900">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Armazenamento no Navegador (LocalStorage)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Todos os dados de vagas, bicicletas, moradores e histórico de check-ins são salvos diretamente no seu computador local. Não há envio de dados para servidores externos.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase">Vagas</span>
                  <strong className="text-slate-900 text-sm">{spots.length}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase">Bikes</span>
                  <strong className="text-slate-900 text-sm">{registeredBikesCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="block text-[10px] text-slate-500 uppercase">Histórico</span>
                  <strong className="text-slate-900 text-sm">{logsCount}</strong>
                </div>
              </div>
            </div>

            {/* Ações de Backup */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
                Gerenciamento de Arquivos
              </h3>

              {/* Botão Exportar Backup */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-900">
                    Exportar Backup Completo (.JSON)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Baixa um arquivo com todos os dados para guardar ou migrar de máquina.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              </div>

              {/* Botão Importar Backup */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-900">
                    Restaurar Backup (.JSON)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Carrega um arquivo salvo anteriormente para recuperar seus dados.
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar</span>
                  </button>
                </div>
              </div>

              {importError && (
                <p className="text-xs text-rose-600 font-mono bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {importError}
                </p>
              )}

              {/* Reset Defaults */}
              {config.lockResetDemoForSyndic ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Restauração de demonstração desativada pelo prestador para proteção patrimonial dos dados reais do condomínio.
                  </span>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onResetDefaults}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 text-xs font-mono font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Restaurar Dados de Demonstração Originais</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
              >
                Concluído
              </button>
            </div>
          </div>
        )}

        {canUseMasterMaintenance && activeTab === 'plant' && (
          <div className="flex-1 overflow-y-auto"><FloorPlanEditor config={config} spots={spots} onSave={onSaveConfig} onSyncSpots={onSyncPlanSpots} /></div>
        )}

        {/* Tab 3: Manutenção Avançada Master */}
        {canUseMasterMaintenance && activeTab === 'master' && (
          <div className="flex-1 overflow-y-auto">
            <MasterMaintenancePanel
              config={config}
              spots={spots}
              onSaveConfig={onSaveConfig}
              onApplyNewStructure={(newSpots, updatedConfig, preserve) => {
                if (onApplyNewStructure) {
                  onApplyNewStructure(newSpots, updatedConfig, preserve);
                }
              }}
              onExportCondoPackage={() => {
                if (onExportCondoPackage) {
                  onExportCondoPackage();
                }
              }}
              onImportCondoPackage={(packageData) => {
                if (onImportCondoPackage) {
                  onImportCondoPackage(packageData);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
