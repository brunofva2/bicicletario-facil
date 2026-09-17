import React, { useMemo, useState, useRef } from 'react';
import { BicycleSpot, ConcessionType, ResidentAllocation, RegisteredBicycle, BikeCategory } from '../types';
import { SAMPLE_BIKE_PHOTOS } from '../mockData';
import { processImageFileToBase64 } from '../utils/imageUpload';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import {
  X,
  Bike,
  Check,
  ShieldCheck,
  Clock,
  Camera,
  Sparkles,
  Search,
  User,
  Phone,
  Tag,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface AllocateModalProps {
  spot: BicycleSpot | null;
  registeredBikes?: RegisteredBicycle[];
  blockOptions?: string[];
  initialSelectedBike?: RegisteredBicycle | null;
  initialResident?: { residentName: string; apartment: string; block: string; residentPhone?: string | null; notes?: string | null } | null;
  onClose: () => void;
  onConfirm: (
    spot: BicycleSpot,
    allocation: Omit<ResidentAllocation, 'id' | 'allocatedAt'>,
    registeredBikeId?: string
  ) => void | boolean | Promise<void | boolean>;
}

export const AllocateModal: React.FC<AllocateModalProps> = (props) => props.spot
  ? <AllocateForm key={`${props.spot.id}:${props.initialSelectedBike?.id || 'new'}`} {...props} spot={props.spot} />
  : null;

const AllocateForm: React.FC<AllocateModalProps & { spot: BicycleSpot }> = ({
  spot,
  registeredBikes = [],
  blockOptions = [],
  initialSelectedBike,
  initialResident,
  onClose,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);

  // Mode: 'pick_existing' or 'new'
  const [allocationMode, setAllocationMode] = useState<'pick_existing' | 'new'>(
    initialSelectedBike ? 'pick_existing' : 'new'
  );
  const [selectedBikeId, setSelectedBikeId] = useState<string>(initialSelectedBike?.id || '');
  const [bikeSearchTerm, setBikeSearchTerm] = useState<string>('');

  // Form states
  const [apartment, setApartment] = useState(initialSelectedBike?.apartment || initialResident?.apartment || '');
  // O bloco deve vir da bicicleta/morador ou ser informado pelo operador.
  // Presumir "Bloco A" cria cadastros válidos visualmente, porém incorretos.
  const [block, setBlock] = useState(initialSelectedBike?.block || initialResident?.block || '');
  const [residentName, setResidentName] = useState(initialSelectedBike?.residentName || initialResident?.residentName || '');
  const [residentPhone, setResidentPhone] = useState(initialSelectedBike?.residentPhone || initialResident?.residentPhone || '');
  const [residentEmail, setResidentEmail] = useState(initialSelectedBike?.residentEmail || '');

  const [concessionType, setConcessionType] = useState<ConcessionType>('determinado');
  const [presetDurationDays, setPresetDurationDays] = useState<number>(180); // 6 meses padrão
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 180);
    return d.toISOString().substring(0, 10);
  });

  const [brandModel, setBrandModel] = useState(initialSelectedBike?.brandModel || '');
  const [color, setColor] = useState(initialSelectedBike?.color || '');
  const [category, setCategory] = useState<BikeCategory>(initialSelectedBike?.category || 'Mountain Bike');
  const [tagNumber, setTagNumber] = useState(
    initialSelectedBike?.tagNumber || `TAG-2026-${spot.spotNumber.replace(/\D/g, '') || '01'}`
  );
  const [distinguishingFeatures, setDistinguishingFeatures] = useState(
    initialSelectedBike?.distinguishingFeatures || ''
  );
  const [notes, setNotes] = useState(initialSelectedBike?.notes || initialResident?.notes || '');
  const [photoUrl, setPhotoUrl] = useState(initialSelectedBike?.photoUrl || SAMPLE_BIKE_PHOTOS[0]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalAccessibility<HTMLDivElement>(true, onClose);

  // Handler for selecting an existing bike from catalog
  const handleSelectExistingBike = (bike: RegisteredBicycle) => {
    setSelectedBikeId(bike.id);
    setApartment(bike.apartment);
    setBlock(bike.block);
    setResidentName(bike.residentName);
    setResidentPhone(bike.residentPhone);
    setResidentEmail(bike.residentEmail || '');
    setBrandModel(bike.brandModel);
    setColor(bike.color);
    setCategory(bike.category);
    setTagNumber(bike.tagNumber || `TAG-2026-${spot.spotNumber.replace(/\D/g, '') || '01'}`);
    setDistinguishingFeatures(bike.distinguishingFeatures || '');
    setNotes(bike.notes || '');
    setPhotoUrl(bike.photoUrl);
    setCustomPhotoInput('');
  };

  const knownBlocks = useMemo(
    () => [...new Set([...blockOptions, ...registeredBikes.map((bike) => bike.block)].map((item) => item.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    [blockOptions, registeredBikes]
  );

  const handlePresetDays = (days: number) => {
    setPresetDurationDays(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setCustomEndDate(d.toISOString().substring(0, 10));
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError(null);
    setIsProcessingPhoto(true);

    try {
      const base64Image = await processImageFileToBase64(file, 800, 800, 0.82);
      setPhotoUrl(base64Image);
      setCustomPhotoInput(base64Image);
      setIsPhotoUploaded(true);
    } catch (err: any) {
      setPhotoUploadError(err?.message || 'Erro ao carregar a imagem. Tente outro arquivo.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter available registered bikes for search
  const filteredBikes = registeredBikes.filter((b) => {
    if (b.spotId || b.spotNumber) return false;
    if (!bikeSearchTerm.trim()) return true;
    const term = bikeSearchTerm.toLowerCase();
    return (
      b.brandModel.toLowerCase().includes(term) ||
      b.color.toLowerCase().includes(term) ||
      b.residentName.toLowerCase().includes(term) ||
      b.apartment.toLowerCase().includes(term) ||
      (b.distinguishingFeatures && b.distinguishingFeatures.toLowerCase().includes(term)) ||
      (b.tagNumber && b.tagNumber.toLowerCase().includes(term))
    );
  });
  const selectedRegisteredBike = registeredBikes.find((bike) => bike.id === selectedBikeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!apartment.trim() || !block.trim() || !residentName.trim()) {
      return;
    }

    const allocationData: Omit<ResidentAllocation, 'id' | 'allocatedAt'> = {
      spotId: spot.id,
      apartment: apartment.trim(),
      block: block.trim(),
      residentName: residentName.trim(),
      residentPhone: residentPhone.trim() || '(11) 90000-0000',
      residentEmail: residentEmail.trim() || undefined,
      concessionType,
      startDate: new Date().toISOString(),
      endDate: concessionType === 'determinado' ? new Date(customEndDate).toISOString() : undefined,
      bicycle: {
        brandModel: brandModel.trim() || 'Bicicleta Padrão',
        color: color.trim() || 'Preta',
        category,
        tagNumber: tagNumber.trim() || 'TAG-NOVA',
        distinguishingFeatures: distinguishingFeatures.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      photoUrl: customPhotoInput.trim() || photoUrl,
      bicycleId: selectedBikeId || undefined,
    };

    setSubmitting(true);
    try {
      await onConfirm(spot, allocationData, selectedBikeId || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="allocate-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        id="allocate-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocate-modal-title"
        tabIndex={-1}
        className="glass-panel rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 text-slate-800 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="allocate-modal-title" className="text-base font-bold text-slate-900 font-mono tracking-tight">
                Vincular vaga {spot.spotNumber}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {spot.sector} · {spot.hookType} · capacidade de até {spot.maxWeightKg} kg
              </p>
            </div>
          </div>
          <button
            id="close-allocate-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Fechar vínculo de vaga"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Bicicleta Já Registrada vs Nova) */}
        <div className="px-6 pt-4 pb-2 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAllocationMode('pick_existing')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              allocationMode === 'pick_existing'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Vincular Bicicleta Já Cadastrada ({registeredBikes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAllocationMode('new');
              setSelectedBikeId('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              allocationMode === 'new'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>+ Cadastrar Nova Bicicleta</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs">
          {/* If Mode: Pick Existing Registered Bike */}
          {allocationMode === 'pick_existing' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 font-mono text-xs flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>Selecione a bicicleta registrada no condomínio:</span>
                </span>
                {selectedBikeId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    Bicicleta Selecionada
                  </span>
                )}
              </div>

              {selectedRegisteredBike && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                  <img src={selectedRegisteredBike.photoUrl} alt={selectedRegisteredBike.brandModel} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-emerald-700">Bicicleta desta solicitação</p>
                    <p className="truncate text-xs font-bold text-slate-900">{selectedRegisteredBike.residentName} · Apto {selectedRegisteredBike.apartment} / {selectedRegisteredBike.block}</p>
                    <p className="truncate text-[11px] text-slate-600">{selectedRegisteredBike.brandModel} · {selectedRegisteredBike.color} · {selectedRegisteredBike.tagNumber}</p>
                  </div>
                </div>
              )}

              {/* Quick Search */}
              <input
                type="text"
                placeholder="Filtrar por nome, modelo, cor ou apartamento..."
                value={bikeSearchTerm}
                onChange={(e) => setBikeSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />

              {/* Bikes Selection List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredBikes.map((b) => {
                  const isSelected = selectedBikeId === b.id;
                  const hasSpot = !!b.spotNumber;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectExistingBike(b)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-800'
                      }`}
                    >
                      <img
                        src={b.photoUrl}
                        alt={b.brandModel}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200/50 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold font-mono text-xs truncate">
                            Apto {b.apartment} ({b.block}) • {b.residentName}
                          </h4>
                          {hasSpot && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              Vaga {b.spotNumber}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-mono truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          Bike: {b.brandModel} ({b.color}) {b.tagNumber ? `• Selo ${b.tagNumber}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: Morador & Apartamento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span>1. Identificação do Apartamento & Morador</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Apartamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 304"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Bloco / Torre
                </label>
                <input
                  list="known-allocation-blocks"
                  type="text"
                  required
                  placeholder="Ex.: Bloco B ou Torre 2"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
                <datalist id="known-allocation-blocks">
                  {knownBlocks.map((knownBlock) => <option key={knownBlock} value={knownBlock} />)}
                </datalist>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  Selecione uma sugestão ou digite o nome real do bloco/torre.
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Nome do Morador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  WhatsApp / Celular
                </label>
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  E-mail do Morador
                </label>
                <input
                  type="email"
                  placeholder="morador@email.com"
                  value={residentEmail}
                  onChange={(e) => setResidentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Concession Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span>2. Tipo de Concessão da Vaga Suspensa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  concessionType === 'determinado'
                    ? 'border-slate-900 bg-slate-900/5 text-slate-900 font-semibold'
                    : 'border-slate-200 glass-input text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <input
                  type="radio"
                  name="concessionType"
                  value="determinado"
                  checked={concessionType === 'determinado'}
                  onChange={() => setConcessionType('determinado')}
                  className="mt-0.5 accent-slate-900"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-700" />
                    <span>Tempo Determinado (Recomendado)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Permite sorteio e rotação periódica entre moradores de forma justa.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                  concessionType === 'vitalicio'
                    ? 'border-slate-900 bg-slate-900/5 text-slate-900 font-semibold'
                    : 'border-slate-200 glass-input text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <input
                  type="radio"
                  name="concessionType"
                  value="vitalicio"
                  checked={concessionType === 'vitalicio'}
                  onChange={() => setConcessionType('vitalicio')}
                  className="mt-0.5 accent-slate-900"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                    <span>Vinculação Contínua</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Permanece com a unidade até desocupação voluntária ou venda do imóvel.
                  </p>
                </div>
              </label>
            </div>

            {concessionType === 'determinado' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 font-mono">Prazo de Validade:</span>
                  <div className="flex items-center gap-1.5">
                    {[90, 180, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handlePresetDays(d)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          presetDurationDays === d
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d === 365 ? '1 ano' : `${d / 30} meses`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">Data final:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setPresetDurationDays(0);
                    }}
                    className="px-2.5 py-1 text-xs rounded border border-slate-300 font-mono bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Bicycle Specs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span>3. Dados da Bicicleta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Marca & Modelo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trek Marlin 7, Caloi City Tour"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BikeCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                >
                  <option value="Mountain Bike">Mountain Bike</option>
                  <option value="Urbana">Urbana</option>
                  <option value="Speed / Road">Speed / Road</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Gravel">Gravel</option>
                  <option value="Dobrável">Dobrável</option>
                  <option value="Infantil">Infantil</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Cor Predominante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Azul Metálico, Preto Fosco"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Selo de Identificação (Tag)
                </label>
                <input
                  type="text"
                  placeholder="TAG-2026-01"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Características Marcantes
                </label>
                <input
                  type="text"
                  placeholder="Cesto, adesivos, farol"
                  value={distinguishingFeatures}
                  onChange={(e) => setDistinguishingFeatures(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Observações / Detalhes de Segurança
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cadeado em U reforçado, pneu aro 29"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input text-slate-900 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Photo Selection & Direct Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>4. Registro Fotográfico da Bicicleta</span>
              </span>
              <span className="text-[10px] text-indigo-700 font-mono font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                <Upload className="w-3 h-3 text-indigo-600" />
                <span>Galeria Celular / Arquivo PC</span>
              </span>
            </h3>

            {/* Hidden native file input supporting mobile gallery, camera, and desktop file explorer */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileUpload}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm shrink-0 bg-slate-200">
                <img
                  src={customPhotoInput || photoUrl}
                  alt="Prévia da bicicleta"
                  className="w-full h-full object-cover"
                />
                {isProcessingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-4 h-4 animate-spin text-white mb-1" />
                    <span className="text-[8px] font-mono">Processando...</span>
                  </div>
                )}
                {isPhotoUploaded && !isProcessingPhoto && (
                  <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                {/* Upload Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-98 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto da Galeria / PC</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                        fileInputRef.current.removeAttribute('capture');
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tirar Foto</span>
                  </button>
                </div>

                <p className="text-[11px] font-mono text-slate-500 leading-tight">
                  Formatos aceitos: JPG, PNG, WEBP. A imagem é otimizada e salva no backup local automaticamente.
                </p>

                {photoUploadError && (
                  <p className="text-[11px] font-mono text-rose-600 font-semibold bg-rose-50 p-1.5 rounded border border-rose-200">
                    {photoUploadError}
                  </p>
                )}

                {/* Or sample photos */}
                <div className="pt-1">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                    <span>Ou selecione foto de amostra:</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {SAMPLE_BIKE_PHOTOS.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(img);
                          setCustomPhotoInput('');
                          setIsPhotoUploaded(false);
                        }}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          photoUrl === img && !customPhotoInput
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-105'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Opção ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-11 object-cover"
                        />
                        {photoUrl === img && !customPhotoInput && (
                          <div className="absolute top-0.5 right-0.5 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 glass-input text-slate-700 text-xs font-mono font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Cancelar
            </button>
            <button
              id="confirm-allocation-submit-btn"
              type="submit"
              disabled={submitting || isProcessingPhoto}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
            >
              Confirmar e Alocar Vaga {spot.spotNumber}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
