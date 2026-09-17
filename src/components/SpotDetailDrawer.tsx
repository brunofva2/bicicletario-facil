import React, { useState, useRef } from 'react';
import { BicycleSpot, SystemConfig, UsageLog, ConcessionType } from '../types';
import { evaluateSpot, formatDatePt, formatRelativeTimePt } from '../utils';
import { getBikeFallbackPhoto } from '../utils/offlineBikes';
import { processImageFileToBase64 } from '../utils/imageUpload';
import {
  X,
  Bike,
  QrCode,
  User,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  History,
  Check,
  Camera,
  MapPin,
  Image as ImageIcon,
  Upload,
  Loader2,
} from 'lucide-react';

interface SpotDetailDrawerProps {
  readOnly?: boolean;
  spot: BicycleSpot | null;
  config: SystemConfig;
  logs: UsageLog[];
  onClose: () => void;
  onOpenQr: (spot: BicycleSpot) => void;
  onRegisterUsage: (spot: BicycleSpot) => void;
  onReleaseSpot: (spot: BicycleSpot) => void;
  onUpdateConcession: (
    spot: BicycleSpot,
    concessionType: ConcessionType,
    endDate?: string
  ) => void;
  onUpdatePhoto: (spot: BicycleSpot, newPhotoUrl: string) => void;
  onOpenSectorPhoto?: (sectorName: string) => void;
}

export const SpotDetailDrawer: React.FC<SpotDetailDrawerProps> = ({
  readOnly = false,
  spot,
  config,
  logs,
  onClose,
  onOpenQr,
  onRegisterUsage,
  onReleaseSpot,
  onUpdateConcession,
  onUpdatePhoto,
  onOpenSectorPhoto,
}) => {
  const [isEditingConcession, setIsEditingConcession] = useState(false);
  const [editConcessionType, setEditConcessionType] = useState<ConcessionType>('determinado');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [showConfirmRelease, setShowConfirmRelease] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!spot) return null;

  const allocation = spot.currentAllocation;
  if (!allocation) return null;

  const { status, daysRemaining, isExpiringSoon, isExpired } = evaluateSpot(
    spot,
    config.idleDaysThreshold,
    config.expiryWarningDays
  );

  // Filter logs for this spot
  const spotLogs = logs.filter((l) => l.spotId === spot.id);

  const handleStartEditConcession = () => {
    setEditConcessionType(allocation.concessionType);
    setEditEndDate(allocation.endDate ? allocation.endDate.substring(0, 10) : '');
    setIsEditingConcession(true);
  };

  const handleSaveConcession = () => {
    onUpdateConcession(
      spot,
      editConcessionType,
      editConcessionType === 'determinado' ? new Date(editEndDate).toISOString() : undefined
    );
    setIsEditingConcession(false);
  };

  const handlePresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEditEndDate(d.toISOString().substring(0, 10));
    setEditConcessionType('determinado');
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError(null);
    setIsProcessingPhoto(true);

    try {
      const base64Image = await processImageFileToBase64(file, 800, 800, 0.82);
      setCustomPhotoUrl(base64Image);
    } catch (err: any) {
      setPhotoUploadError(err?.message || 'Erro ao carregar a imagem. Tente outro arquivo.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveNewPhoto = () => {
    if (customPhotoUrl.trim()) {
      onUpdatePhoto(spot, customPhotoUrl.trim());
      setIsChangingPhoto(false);
      setCustomPhotoUrl('');
      setPhotoUploadError(null);
    }
  };

  return (
    <div
      id="spot-detail-overlay"
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="spot-detail-drawer"
        className="w-full max-w-xl glass-sidebar text-slate-800 h-full shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull/Close Handle indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white/80 border-b border-slate-200/50">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Top Header */}
        <div className="sticky top-0 z-10 glass-header px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-sm">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                  Vaga Suspensa {spot.spotNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenSectorPhoto?.(spot.sector)}
                  className="text-[11px] sm:text-xs px-2 py-0.5 rounded font-mono font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Visualizar foto real e referência do setor"
                >
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  <span>{spot.sector}</span>
                  <span className="text-[10px] text-indigo-500 font-normal underline ml-0.5">Ver local</span>
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
                Suporte: {spot.hookType} • Cap. Máx: {spot.maxWeightKg}kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="drawer-qr-btn"
              onClick={() => onOpenQr(spot)}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300/80 glass-input text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-colors shadow-xs active:scale-95"
              title="Visualizar e Imprimir QR Code da Vaga"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
            <button
              id="close-drawer-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Occupancy summary: keeps the important information readable before the detailed sections. */}
          <section className="spot-detail-summary relative overflow-hidden rounded-2xl border border-[#f5d9ad] bg-gradient-to-br from-[#fffdf9] via-white to-[#fff5e7] p-4 shadow-[0_10px_26px_rgba(15,35,72,0.07)]">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-[#F19A00]/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.16em] text-[#d97800]">OCUPAÇÃO ATUAL</p>
                <h3 className="mt-1 truncate text-lg font-black text-[#0d1733]">{allocation.residentName}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-600">Apto {allocation.apartment} · {allocation.block} <span className="mx-1 text-slate-300">•</span> Vaga {spot.spotNumber}</p>
                <p className="mt-2 truncate text-[11px] text-slate-500">{allocation.bicycle?.brandModel || 'Bicicleta cadastrada'} · {allocation.bicycle?.category || 'Convencional'}</p>
              </div>
              <div className={`shrink-0 rounded-xl border px-2.5 py-2 text-right ${isExpired ? 'border-rose-200 bg-rose-50 text-rose-700' : isExpiringSoon ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                <p className="text-[9px] font-black uppercase tracking-wider">Status</p>
                <p className="mt-0.5 text-xs font-black">{isExpired ? 'Vencida' : isExpiringSoon ? 'Atenção' : 'Regular'}</p>
              </div>
            </div>
          </section>

          {/* Status Alert Banner */}
          {isExpired ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-rose-900 text-sm font-mono">
                    Prazo Determinado Expirado
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    O período de concessão desta vaga suspensa encerrou. É necessário renovar o prazo ou solicitar a desocupação do gancho.
                  </p>
                </div>
              </div>
            </div>
          ) : isExpiringSoon ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-xs">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900 text-sm font-mono">
                    Concessão Vencendo em {daysRemaining} dias
                  </p>
                  <p className="text-amber-800">
                    O morador deve solicitar renovação antes da data de expiração ({formatDatePt(allocation.endDate)}).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-emerald-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-xs text-emerald-900 font-mono">
                    Ocupação Regular e em Uso
                  </p>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    Último registro de uso: {formatRelativeTimePt(spot.lastUsageDate)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 uppercase">
                Ativa
              </span>
            </div>
          )}

          {/* Quick Action: Register Usage / Check-in */}
          <div className="spot-detail-checkin flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#f3dfbd] bg-[#fffaf3] p-3.5 shadow-[0_8px_20px_rgba(15,35,72,0.04)] sm:flex-row">
            <div>
              <p className="text-xs font-semibold text-slate-900 font-mono">
                Registrar Movimentação / Uso da Vaga
              </p>
              <p className="text-[11px] text-slate-600">
                Confirma a atividade e registra o uso da bicicleta pelo morador.
              </p>
            </div>
            <button
              id="drawer-register-usage-btn"
              type="button"
              onClick={() => onRegisterUsage(spot)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0d1733] px-3.5 py-2.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-[#17254a] sm:w-auto"
            >
              <Check className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Registrar Check-in</span>
            </button>
          </div>

          {/* Foto Real da Vaga Suspensa / Bicicleta no Gancho */}
          <div className="spot-detail-photo overflow-hidden rounded-2xl border border-[#f1dec0] bg-white shadow-[0_10px_24px_rgba(15,35,72,0.06)]">
            <div className="spot-detail-photo-head flex items-center justify-between border-b border-[#f2e1c4] bg-[#fffaf3] p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono">
                <Camera className="w-4 h-4 text-slate-700" />
                <span>Foto da Vaga Suspensa & Bicicleta</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                className="text-xs text-slate-600 hover:text-slate-900 font-mono font-semibold"
              >
                {isChangingPhoto ? 'Cancelar' : 'Alterar Foto'}
              </button>
            </div>

            <div className="relative group">
              <img
                src={allocation.photoUrl}
                alt={`Bicicleta suspensa na vaga ${spot.spotNumber}`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = getBikeFallbackPhoto(0);
                }}
                className="h-64 w-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs border border-slate-700 text-white text-[10px] px-2 py-1 rounded font-mono">
                {spot.spotNumber} • {spot.hookType}
              </div>
            </div>

            {isChangingPhoto && (
              <div className="p-3.5 glass-input border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 font-mono">
                    Atualizar Foto da Bicicleta / Vaga:
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Câmera, Galeria ou Arquivo</span>
                </div>

                {/* File picker button for mobile and desktop */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 glass-card hover:bg-slate-100 text-slate-800 text-xs font-mono font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                  >
                    {isProcessingPhoto ? (
                      <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-700" />
                    )}
                    <span>{isProcessingPhoto ? 'Processando...' : 'Escolher da Galeria / Arquivo'}</span>
                  </button>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      value={customPhotoUrl}
                      onChange={(e) => setCustomPhotoUrl(e.target.value)}
                      placeholder="Ou cole o link da foto (URL)..."
                      className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewPhoto}
                      disabled={!customPhotoUrl.trim() || isProcessingPhoto}
                      className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-mono font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none shadow-xs"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                {photoUploadError && (
                  <p className="text-[11px] text-rose-600 font-mono">{photoUploadError}</p>
                )}

                {customPhotoUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Foto pronta para salvar!
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomPhotoUrl('')}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline font-mono"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Apartamento & Morador */}
          <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 glass-card shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                  Dados do Apartamento & Morador
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                Apto {allocation.apartment} • {allocation.block}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Nome do Morador:</span>
                <span className="font-semibold text-slate-900">{allocation.residentName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Telefone / Contato:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 font-mono">{allocation.residentPhone || 'Não informado'}</span>
                  {allocation.residentPhone && (
                    <a
                      aria-disabled={readOnly}
                      href={readOnly ? undefined : `https://wa.me/55${allocation.residentPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 text-[10px] font-mono inline-flex items-center gap-0.5 ml-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
              {allocation.residentEmail && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[11px] font-mono">E-mail:</span>
                  <span className="font-medium text-slate-800 font-mono">{allocation.residentEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Regras e Tempo de Concessão da Vaga */}
          <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 glass-card shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                  Tempo de Direito à Vaga
                </h3>
              </div>
              <button
                type="button"
                onClick={handleStartEditConcession}
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-mono font-semibold"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar Prazo</span>
              </button>
            </div>

            {!isEditingConcession ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg glass-input border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    {allocation.concessionType === 'vitalicio' ? (
                      <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        <Calendar className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-xs text-slate-900 font-mono">
                        {allocation.concessionType === 'vitalicio'
                          ? 'Direito Vitalício (Permanente)'
                          : 'Direito por Tempo Determinado'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Início: {formatDatePt(allocation.startDate)}
                      </p>
                    </div>
                  </div>

                  {allocation.concessionType === 'vitalicio' ? (
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Sem vencimento
                    </span>
                  ) : (
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-1 rounded border ${
                          isExpired
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {isExpired ? 'Vencido' : `${daysRemaining} dias restantes`}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Até {formatDatePt(allocation.endDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 glass-input rounded-lg border border-slate-300 text-xs">
                <p className="font-bold text-slate-900 font-mono">Ajustar modalidade de concessão:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditConcessionType('vitalicio')}
                    className={`p-2.5 rounded-lg border text-left font-mono font-semibold flex items-center justify-between ${
                      editConcessionType === 'vitalicio'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'glass-input text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>Vitalício</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditConcessionType('determinado')}
                    className={`p-2.5 rounded-lg border text-left font-mono font-semibold flex items-center justify-between ${
                      editConcessionType === 'determinado'
                        ? 'bg-slate-100 text-slate-900 border-slate-400'
                        : 'glass-input text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>Tempo Determinado</span>
                    <Clock className="w-4 h-4" />
                  </button>
                </div>

                {editConcessionType === 'determinado' && (
                  <div className="space-y-2 pt-2">
                    <span className="block text-[11px] text-slate-600 font-mono font-medium">
                      Atalhos rápidos de prorrogação:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePresetDays(30)}
                        className="px-2 py-1 rounded glass-card border border-slate-300 text-slate-700 hover:border-slate-500 text-[11px] font-mono shadow-xs"
                      >
                        +30 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDays(90)}
                        className="px-2 py-1 rounded glass-card border border-slate-300 text-slate-700 hover:border-slate-500 text-[11px] font-mono shadow-xs"
                      >
                        +90 dias (3 meses)
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDays(180)}
                        className="px-2 py-1 rounded glass-card border border-slate-300 text-slate-700 hover:border-slate-500 text-[11px] font-mono shadow-xs"
                      >
                        +6 meses
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetDays(365)}
                        className="px-2 py-1 rounded glass-card border border-slate-300 text-slate-700 hover:border-slate-500 text-[11px] font-mono shadow-xs"
                      >
                        +1 ano
                      </button>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-700 font-mono mb-1">
                        Data de encerramento do prazo:
                      </label>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 glass-input font-mono text-xs text-slate-900 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingConcession(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConcession}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-mono font-bold hover:bg-slate-800 shadow-xs"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Informações da Bicicleta */}
          <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 glass-card shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Bike className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Informações da Bicicleta
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Marca & Modelo:</span>
                <span className="font-semibold text-slate-900">{allocation.bicycle?.brandModel || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Categoria:</span>
                <span className="font-semibold text-slate-900">{allocation.bicycle?.category || 'Convencional'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Cor:</span>
                <span className="font-semibold text-slate-900">{allocation.bicycle?.color || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] font-mono">Selo / Tag Condomínio:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
                  {allocation.bicycle?.tagNumber || 'Sem Selo'}
                </span>
              </div>
              {allocation.bicycle?.notes && (
                <div className="col-span-2 pt-1">
                  <span className="text-slate-500 block text-[11px] font-mono">Observações:</span>
                  <p className="text-slate-700 italic glass-input p-2 rounded border border-slate-200">
                    {allocation.bicycle.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico Recente de Uso da Vaga */}
          <div className="rounded-xl border border-slate-200/90 p-4 space-y-3 glass-card shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                  Histórico de Uso & Auditoria
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {spotLogs.length} registro(s)
              </span>
            </div>

            {spotLogs.length > 0 ? (
              <div className="space-y-2">
                {spotLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 text-xs p-2.5 rounded-lg glass-input border border-slate-200 shadow-2xs"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {log.type === 'check_in_uso'
                            ? 'Check-in de Uso da Bike'
                            : log.type === 'alocacao'
                            ? 'Nova Concessão de Vaga'
                            : log.type === 'vistoria_ociosidade'
                            ? 'Vistoria de Ociosidade'
                            : log.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTimePt(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{log.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2 text-center font-mono">
                Nenhum evento registrado ainda para esta vaga.
              </p>
            )}
          </div>

          {/* Desocupação / Liberação de Vaga */}
          <div className="pt-2 border-t border-slate-200">
            {!showConfirmRelease ? (
              <button
                id="open-release-confirm-btn"
                type="button"
                onClick={() => setShowConfirmRelease(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100 text-xs font-mono font-semibold transition-colors shadow-xs"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Desocupar / Liberar Gancho Suspenso</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/90 space-y-2.5 shadow-xs">
                <p className="text-xs font-bold text-rose-900 font-mono">
                  Confirmar liberação da vaga {spot.spotNumber}?
                </p>
                <p className="text-[11px] text-rose-800">
                  O gancho ficará imediatamente livre para alocação a outro morador e a desocupação será registrada no histórico do condomínio.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmRelease(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 glass-input text-xs font-mono text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-release-btn"
                    type="button"
                    onClick={() => {
                      onReleaseSpot(spot);
                      setShowConfirmRelease(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-mono font-bold hover:bg-rose-500 shadow-xs"
                  >
                    Sim, Liberar Vaga
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
