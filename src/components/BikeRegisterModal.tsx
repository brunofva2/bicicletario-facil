import React, { useMemo, useState, useRef } from 'react';
import { RegisteredBicycle, BikeCategory, BicycleSpot } from '../types';
import { SAMPLE_BIKE_PHOTOS } from '../mockData';
import { getBikeReevaluationInfo } from '../utils/reevaluation';
import { processImageFileToBase64 } from '../utils/imageUpload';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import {
  X,
  Bike,
  User,
  Phone,
  Sparkles,
  Camera,
  Check,
  ShieldCheck,
  Tag,
  FileText,
  Clock,
  MessageCircle,
  Trash2,
  Building,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface BikeRegisterModalProps {
  initialBike?: RegisteredBicycle | null;
  availableSpots: BicycleSpot[];
  existingBikes: RegisteredBicycle[];
  blockOptions?: string[];
  preselectedSpotId?: string;
  onClose: () => void;
  onSave: (
    bikeData: Omit<RegisteredBicycle, 'id' | 'registeredAt'> & {
      id?: string;
      registeredAt?: string;
      lastReevaluatedAt?: string;
      reevaluationStatus?: 'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada';
      reevaluationNotes?: string;
    }
  ) => void;
  onOpenReportWhatsApp?: (bike: RegisteredBicycle) => void;
  onDeleteRequest?: (bike: RegisteredBicycle) => void;
}

export const BikeRegisterModal: React.FC<BikeRegisterModalProps> = ({
  initialBike,
  availableSpots,
  existingBikes,
  blockOptions = [],
  preselectedSpotId,
  onClose,
  onSave,
  onOpenReportWhatsApp,
  onDeleteRequest,
}) => {
  // Form states
  const [residentName, setResidentName] = useState(initialBike?.residentName || '');
  const [apartment, setApartment] = useState(initialBike?.apartment || '');
  // Nunca presumir o bloco: um valor padrão silencioso grava moradores de
  // outras torres como "Bloco A". Em novos cadastros a unidade é obrigatória.
  const [block, setBlock] = useState(initialBike?.block || '');
  const [residentPhone, setResidentPhone] = useState(initialBike?.residentPhone || '');
  const [residentEmail, setResidentEmail] = useState(initialBike?.residentEmail || '');

  const [brandModel, setBrandModel] = useState(initialBike?.brandModel || '');
  const [color, setColor] = useState(initialBike?.color || '');
  const [category, setCategory] = useState<BikeCategory>(initialBike?.category || 'Mountain Bike');
  const [tagNumber, setTagNumber] = useState(
    initialBike?.tagNumber || `TAG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [serialNumber, setSerialNumber] = useState(initialBike?.serialNumber || '');
  const [distinguishingFeatures, setDistinguishingFeatures] = useState(
    initialBike?.distinguishingFeatures || ''
  );
  const [notes, setNotes] = useState(initialBike?.notes || '');
  const [photoUrl, setPhotoUrl] = useState(initialBike?.photoUrl || SAMPLE_BIKE_PHOTOS[0]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isPhotoUploaded, setIsPhotoUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalAccessibility<HTMLDivElement>(true, onClose);

  // Dates & Biennial Reevaluation states
  const [registeredAtDate, setRegisteredAtDate] = useState<string>(
    initialBike?.registeredAt ? initialBike.registeredAt.substring(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [lastReevaluatedAt, setLastReevaluatedAt] = useState<string>(
    initialBike?.lastReevaluatedAt ? initialBike.lastReevaluatedAt.substring(0, 10) : ''
  );
  const [reevaluationNotes, setReevaluationNotes] = useState(initialBike?.reevaluationNotes || '');
  const [reevaluationStatus, setReevaluationStatus] = useState<
    'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada'
  >(initialBike?.reevaluationStatus || 'em_dia');

  // Optional spot assignment
  const [selectedSpotId, setSelectedSpotId] = useState<string>(
    initialBike?.spotId || preselectedSpotId || ''
  );

  const normalizeAddressPart = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
  const bikesAtSameAddress = useMemo(
    () => existingBikes.filter((bike) =>
      bike.id !== initialBike?.id &&
      normalizeAddressPart(bike.apartment) === normalizeAddressPart(apartment) &&
      normalizeAddressPart(bike.block) === normalizeAddressPart(block)
    ),
    [existingBikes, initialBike?.id, apartment, block]
  );
  const knownBlocks = useMemo(
    () => [...new Set([...blockOptions, ...existingBikes.map((bike) => bike.block)].map((item) => item.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    [blockOptions, existingBikes]
  );
  const useResidentFromAddress = (bike: RegisteredBicycle) => {
    setResidentName(bike.residentName);
    setResidentPhone(bike.residentPhone || '');
    setResidentEmail(bike.residentEmail || '');
  };
  // Reevaluation computation for this form state
  const tempBikeObj: RegisteredBicycle = {
    id: initialBike?.id || 'temp',
    residentName,
    apartment,
    block,
    residentPhone,
    brandModel,
    color,
    category,
    tagNumber,
    photoUrl,
    spotId: selectedSpotId,
    spotNumber: availableSpots.find((s) => s.id === selectedSpotId)?.spotNumber || initialBike?.spotNumber,
    registeredAt: registeredAtDate ? `${registeredAtDate}T12:00:00Z` : new Date().toISOString(),
    lastReevaluatedAt: lastReevaluatedAt ? `${lastReevaluatedAt}T12:00:00Z` : undefined,
    reevaluationStatus,
  };

  const reevalInfo = getBikeReevaluationInfo(tempBikeObj);
  const nextReevaluationDate = useMemo(() => {
    const date = new Date(`${registeredAtDate || new Date().toISOString().slice(0, 10)}T12:00:00`);
    date.setFullYear(date.getFullYear() + 2);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [registeredAtDate]);

  const handleMarkReevaluationToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setLastReevaluatedAt(todayStr);
    setReevaluationStatus('em_dia');
    setReevaluationNotes('Reavaliação bienal realizada: morador ativo confirmado na unidade e bike vistoriada.');
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError(null);
    setIsProcessingPhoto(true);

    try {
      // Compresses and converts image to optimized base64
      const base64Image = await processImageFileToBase64(file, 800, 800, 0.82);
      setPhotoUrl(base64Image);
      setCustomPhotoInput(base64Image);
      setIsPhotoUploaded(true);
    } catch (err: any) {
      setPhotoUploadError(err?.message || 'Erro ao carregar a imagem. Tente outro arquivo.');
    } finally {
      setIsProcessingPhoto(false);
      // Reset input so user can choose the same file again if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentName.trim() || !apartment.trim() || !block.trim() || !brandModel.trim() || !color.trim()) {
      return;
    }

    const chosenSpot = availableSpots.find((s) => s.id === selectedSpotId);

    const bikePayload: Omit<RegisteredBicycle, 'id' | 'registeredAt'> & {
      id?: string;
      registeredAt?: string;
      lastReevaluatedAt?: string;
      reevaluationStatus?: 'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada';
      reevaluationNotes?: string;
    } = {
      ...(initialBike?.id ? { id: initialBike.id } : {}),
      residentName: residentName.trim(),
      apartment: apartment.trim(),
      block: block.trim(),
      residentPhone: residentPhone.trim() || '(11) 90000-0000',
      residentEmail: residentEmail.trim() || undefined,
      brandModel: brandModel.trim(),
      color: color.trim(),
      category,
      tagNumber: tagNumber.trim(),
      serialNumber: serialNumber.trim() || undefined,
      distinguishingFeatures: distinguishingFeatures.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: customPhotoInput.trim() || photoUrl,
      spotId: chosenSpot ? chosenSpot.id : initialBike?.spotId,
      spotNumber: chosenSpot ? chosenSpot.spotNumber : initialBike?.spotNumber,
      registeredAt: registeredAtDate ? `${registeredAtDate}T12:00:00Z` : '2024-03-15T12:00:00Z',
      lastReevaluatedAt: lastReevaluatedAt ? `${lastReevaluatedAt}T12:00:00Z` : undefined,
      reevaluationStatus,
      reevaluationNotes: reevaluationNotes.trim() || undefined,
    };

    onSave(bikePayload);
  };

  return (
    <div
      id="bike-register-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        id="bike-register-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bike-register-modal-title"
        tabIndex={-1}
        className="glass-panel rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 text-slate-800 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Building className="w-5 h-5 text-amber-400 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="bike-register-modal-title" className="text-base font-bold text-slate-900 font-mono tracking-tight">
                {initialBike ? 'Ficha da bicicleta' : 'Cadastrar bicicleta'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Primeiro identifique o morador e a unidade; depois complete os dados da bicicleta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha da bicicleta"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto text-xs">
          {/* Section 1: Resident & Apartment Info (PRIMARY IDENTIFICATION) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-700" />
                <span>1. Identificação Principal: Morador & Apartamento (Prioritário)</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Índice Principal do Condomínio
              </span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1 font-mono">
                    Apartamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 402 ou 101"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1 font-mono">
                    Bloco / Torre *
                  </label>
                  <input
                    list="known-condominium-blocks"
                    type="text"
                    required
                    placeholder="Ex.: Bloco A ou Torre 2"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <datalist id="known-condominium-blocks">
                    {knownBlocks.map((knownBlock) => <option key={knownBlock} value={knownBlock} />)}
                  </datalist>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    Selecione uma sugestão ou digite o nome real do bloco/torre.
                  </p>
                </div>
              </div>

              {apartment.trim() && block.trim() && bikesAtSameAddress.length > 0 && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 animate-[fadeIn_.22s_ease-out]" aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-emerald-900">Este endereço já possui {bikesAtSameAddress.length} bicicleta{bikesAtSameAddress.length > 1 ? 's' : ''} cadastrada{bikesAtSameAddress.length > 1 ? 's' : ''}</p>
                      <p className="mt-1 text-[11px] text-emerald-800">Você pode associar esta nova bicicleta ao morador já cadastrado ou informar outro responsável do mesmo apartamento.</p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-emerald-800 shadow-sm">Apto {apartment} · {block}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...new Map(bikesAtSameAddress.map((bike) => [bike.residentName, bike])).values()].map((bike) => (
                      <button key={bike.id} type="button" onClick={() => useResidentFromAddress(bike)} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100">
                        Associar a {bike.residentName}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1 font-mono">
                    Nome Completo do Morador Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Mendes"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1 font-mono">
                    WhatsApp (Notificações) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={residentPhone}
                    onChange={(e) => setResidentPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  E-mail do Morador (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="morador@email.com"
                  value={residentEmail}
                  onChange={(e) => setResidentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bike Physical Characteristics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Bike className="w-3.5 h-3.5 text-slate-600" />
              <span>2. Características Físicas da Bicicleta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Marca e Modelo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Caloi Vulcan, Trek Marlin"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Categoria da Bicicleta
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BikeCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  <option value="Mountain Bike">Mountain Bike</option>
                  <option value="Urbana">Urbana</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Speed / Road">Speed / Road</option>
                  <option value="Gravel">Gravel</option>
                  <option value="Dobrável">Dobrável</option>
                  <option value="Infantil">Infantil</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Selo / Plaqueta Condomínio *
                </label>
                <input
                  type="text"
                  required
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-600 mb-1 font-mono">
                  Chassi / Número de Série do Quadro
                </label>
                <input
                  type="text"
                  placeholder="Ex: TRK-7890-MTB (gravado sob a caixa de centro)"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text-slate-600 mb-1 font-mono flex items-center justify-between">
                  <span>Características Marcantes / Acessórios (Facilita busca)</span>
                  <span className="text-[10px] text-slate-400">Adesivos, cestos, suportes</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Adesivo da bandeira no quadro, cestinha preta na frente, manopla amarela, cadeado U-Lock preso ao selim..."
                  value={distinguishingFeatures}
                  onChange={(e) => setDistinguishingFeatures(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 font-mono"><Clock className="h-4 w-4 text-amber-600" /><span>{initialBike ? '3. Gestão predial e reavaliação' : '3. Acompanhamento futuro'}</span></h3>
              {initialBike ? <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${reevalInfo.isDue ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-emerald-300 bg-emerald-100 text-emerald-800'}`}>{reevalInfo.isDue ? 'Reavaliação pendente' : 'Reavaliação em dia'}</span> : <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800">Controle iniciado</span>}
            </div>
            {!initialBike ? <div className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold text-slate-800">A primeira reavaliação será solicitada em {nextReevaluationDate}.</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Nenhuma vistoria, parecer ou status é necessário agora. O cadastro começa regular e a tarefa aparecerá no momento certo.</p></div><label className="text-[10px] font-bold text-slate-600">Data de entrada<input type="date" value={registeredAtDate} onChange={(e) => setRegisteredAtDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs" /></label></div> : <><div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] font-mono leading-relaxed text-slate-600"><strong>Regra condominial:</strong> revise o vínculo do morador e o estado da bicicleta a cada dois anos, mesmo quando ela estiver vinculada a uma vaga.</div><div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2"><label className="block font-medium text-slate-600 font-mono">Data do cadastro<input type="date" value={registeredAtDate} onChange={(e) => setRegisteredAtDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900" /></label><label className="block font-medium text-slate-600 font-mono">Última reavaliação<div className="mt-1 flex gap-2"><input type="date" value={lastReevaluatedAt} onChange={(e) => { setLastReevaluatedAt(e.target.value); if (e.target.value) setReevaluationStatus('em_dia'); }} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900" /><button type="button" onClick={handleMarkReevaluationToday} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white">Hoje</button></div></label></div><label className="block font-medium text-slate-700 font-mono">Situação atual<select value={reevaluationStatus} onChange={(e) => setReevaluationStatus(e.target.value as 'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"><option value="em_dia">Regular</option><option value="pendente">Pendente de reavaliação</option><option value="abandonada">Sinais de abandono</option><option value="morador_inativo">Morador não reside mais</option></select></label><label className="block font-medium text-slate-600 font-mono">Parecer da reavaliação<input type="text" placeholder="Resumo da última vistoria, se houver." value={reevaluationNotes} onChange={(e) => setReevaluationNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900" /></label></>}
          </div>

          {/* Section 4: Photo Selection & Direct Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>4. Foto da Bicicleta</span>
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
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm shrink-0 bg-slate-200">
                <img
                  src={customPhotoInput || photoUrl}
                  alt="Prévia da bicicleta"
                  className="w-full h-full object-cover"
                />
                {isProcessingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin text-white mb-1" />
                    <span className="text-[9px] font-mono">Processando...</span>
                  </div>
                )}
                {isPhotoUploaded && !isProcessingPhoto && (
                  <div className="absolute top-1 right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                {/* Upload Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-xs active:scale-98 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto da Galeria / Arquivo do PC</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => {
                      if (fileInputRef.current) {
                        // Capture camera directly if supported
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                        fileInputRef.current.removeAttribute('capture');
                      }
                    }}
                    className="py-2 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tirar Foto Agora</span>
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

                {/* Or choose default sample */}
                <div className="pt-1">
                  <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                    <span>Ou selecione uma foto ilustrativa de amostra:</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SAMPLE_BIKE_PHOTOS.slice(0, 5).map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(sample);
                          setCustomPhotoInput('');
                          setIsPhotoUploaded(false);
                        }}
                        className={`relative rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          photoUrl === sample && !customPhotoInput
                            ? 'border-indigo-600 scale-105 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={sample} alt="Amostra" className="w-11 h-11 object-cover" />
                        {photoUrl === sample && !customPhotoInput && (
                          <div className="absolute inset-0 bg-indigo-900/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Optional Spot Linkage */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block font-bold text-slate-700 font-mono text-xs">
              Vincular a uma Vaga Suspensa Agora? (Opcional)
            </label>
            <select
              value={selectedSpotId}
              onChange={(e) => setSelectedSpotId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 glass-input font-mono text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="">Nenhuma vaga vinculada (Bicicleta avulsa / Fila de espera)</option>
              {availableSpots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  Vaga {spot.spotNumber} • {spot.sector} (Suporte: {spot.hookType})
                </option>
              ))}
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div>
              {initialBike && onDeleteRequest && (
                <button
                  type="button"
                  id="modal-delete-bike-btn"
                  onClick={() => onDeleteRequest(initialBike)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-mono text-xs font-semibold transition-colors"
                  title="Excluir cadastro desta bicicleta com confirmação"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Excluir Cadastro</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-mono font-bold hover:bg-slate-100 transition-colors text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold shadow-md transition-all text-xs"
              >
                {initialBike ? 'Salvar Alterações' : 'Salvar Cadastro da Bicicleta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
