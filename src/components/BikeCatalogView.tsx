import React, { useEffect, useMemo, useState } from 'react';
import { RegisteredBicycle, BicycleSpot, SystemConfig, BikeCategory } from '../types';
import { getBikeReevaluationInfo } from '../utils/reevaluation';
import { getBikeFallbackPhoto } from '../utils/offlineBikes';
import {
  Bike,
  Search,
  Plus,
  MessageCircle,
  AlertTriangle,
  MapPin,
  Tag,
  User,
  Phone,
  Filter,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Clock,
  X,
  Edit3,
  ExternalLink,
  SlidersHorizontal,
  ShieldAlert,
  UserCheck,
  UserX,
  Trash2,
  Building,
  ArrowUpDown,
  FileDown,
  ArrowLeft,
} from 'lucide-react';
import { PdfExportModal } from './PdfExportModal';

interface BikeCatalogViewProps {
  bikes: RegisteredBicycle[];
  spots: BicycleSpot[];
  config: SystemConfig;
  onOpenRegisterModal: (bikeToEdit?: RegisteredBicycle) => void;
  onOpenReportModal: (bike: RegisteredBicycle) => void;
  onOpenReevaluationModal: (bike: RegisteredBicycle) => void;
  onAssignSpotToBike: (bike: RegisteredBicycle) => void;
  onRequestDeleteBike: (bike: RegisteredBicycle) => void;
  onToast?: (msg: string, type?: 'success' | 'info') => void;
  onBackToTasks?: () => void;
}

export const BikeCatalogView: React.FC<BikeCatalogViewProps> = ({
  bikes,
  spots,
  config,
  onOpenRegisterModal,
  onOpenReportModal,
  onOpenReevaluationModal,
  onAssignSpotToBike,
  onRequestDeleteBike,
  onToast,
  onBackToTasks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [spotFilter, setSpotFilter] = useState<'all' | 'with_spot' | 'no_spot' | 'due_reevaluation'>('all');
  const [sortBy, setSortBy] = useState<'apartment' | 'block' | 'resident' | 'brand' | 'recent'>('apartment');
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<string | null>(null);
  const [expandedBikeId, setExpandedBikeId] = useState<string | null>(null);
  const [closingBikeId, setClosingBikeId] = useState<string | null>(null);
  const [openingBikeId, setOpeningBikeId] = useState<string | null>(null);
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [catalogColumnCount, setCatalogColumnCount] = useState(3);

  useEffect(() => {
    const updateColumnCount = () => setCatalogColumnCount(window.innerWidth >= 1280 ? 3 : window.innerWidth >= 768 ? 2 : 1);
    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);
  const handleCardToggle = (bikeId: string) => {
    if (expandedBikeId === bikeId) {
      setOpeningBikeId(null);
      setClosingBikeId(bikeId);
      window.setTimeout(() => {
        setExpandedBikeId((current) => current === bikeId ? null : current);
        setClosingBikeId((current) => current === bikeId ? null : current);
      }, 480);
      return;
    }
    setClosingBikeId(null);
    setOpeningBikeId(null);
    setExpandedBikeId(bikeId);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setOpeningBikeId(bikeId)));
  };
  // Available spots count
  const availableSpotsCount = spots.filter((s) => !s.currentAllocation).length;

  // Bikes due for biennial reevaluation
  const dueBikesCount = useMemo(() => {
    return bikes.filter((b) => getBikeReevaluationInfo(b).isDue).length;
  }, [bikes]);

  // Search normalization helper
  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Smart Search & Scoring Algorithm with PRIORITY to Apartment & Resident Name
  const filteredAndRankedBikes = useMemo(() => {
    const rawTokens = searchTerm
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalize);

    return bikes
      .map((bike) => {
        // Compute relevance score if search is present
        let score = 0;
        const normalizedBrand = normalize(bike.brandModel);
        const normalizedColor = normalize(bike.color);
        const normalizedCategory = normalize(bike.category);
        const normalizedFeatures = normalize(bike.distinguishingFeatures);
        const normalizedNotes = normalize(bike.notes);
        const normalizedTag = normalize(bike.tagNumber);
        const normalizedSerial = normalize(bike.serialNumber);
        const normalizedResident = normalize(bike.residentName);
        const normalizedApt = normalize(bike.apartment);
        const normalizedBlock = normalize(bike.block);
        const normalizedSpot = normalize(bike.spotNumber);

        if (rawTokens.length > 0) {
          let matchedTokens = 0;

          for (const token of rawTokens) {
            let tokenMatched = false;

            // TOP PRIORITY: Apartment & Block Match (exact or partial)
            if (
              normalizedApt === token ||
              `apto ${normalizedApt}` === token ||
              `ap ${normalizedApt}` === token
            ) {
              score += 65; // Highest priority: exact apartment search
              tokenMatched = true;
            } else if (normalizedApt.includes(token) || normalizedBlock.includes(token)) {
              score += 45;
              tokenMatched = true;
            }

            // TOP PRIORITY: Resident Name Match
            if (normalizedResident.includes(token)) {
              score += 40; // Resident name priority
              tokenMatched = true;
            }

            // High Priority: Spot Number
            if (
              normalizedSpot === token ||
              `vaga ${normalizedSpot}` === token ||
              normalizedSpot.includes(token)
            ) {
              score += 25;
              tokenMatched = true;
            }

            // Seal / Tag or Chassis / Serial
            if (normalizedTag.includes(token) || normalizedSerial.includes(token)) {
              score += 22;
              tokenMatched = true;
            }

            // Secondary: Bike characteristics (features, model, color, category, notes)
            if (normalizedBrand.includes(token)) {
              score += 15;
              tokenMatched = true;
            }
            if (normalizedColor.includes(token)) {
              score += 12;
              tokenMatched = true;
            }
            if (normalizedFeatures.includes(token)) {
              score += 15;
              tokenMatched = true;
            }
            if (normalizedCategory.includes(token)) {
              score += 8;
              tokenMatched = true;
            }
            if (normalizedNotes.includes(token)) {
              score += 5;
              tokenMatched = true;
            }

            if (tokenMatched) {
              matchedTokens++;
            }
          }

          // If none of the words matched, score is 0
          if (matchedTokens === 0) {
            score = -1;
          }
        }

        return { bike, score };
      })
      .filter(({ bike, score }) => {
        // Filter by score if searching
        if (searchTerm.trim() && score < 0) {
          return false;
        }

        // Filter by category
        if (categoryFilter !== 'all' && bike.category !== categoryFilter) {
          return false;
        }

        // Filter by spot allocation or biennial reevaluation
        if (spotFilter === 'with_spot' && !bike.spotNumber) {
          return false;
        }
        if (spotFilter === 'no_spot' && bike.spotNumber) {
          return false;
        }
        if (spotFilter === 'due_reevaluation') {
          const info = getBikeReevaluationInfo(bike);
          if (!info.isDue) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // If searching, score always decides top results
        if (searchTerm.trim()) {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
        }

        // If filtering by due reevaluation, keep those on top
        if (spotFilter === 'due_reevaluation') {
          const aDue = getBikeReevaluationInfo(a.bike).isDue;
          const bDue = getBikeReevaluationInfo(b.bike).isDue;
          if (aDue && !bDue) return -1;
          if (!aDue && bDue) return 1;
        }

        // DEFAULT & USER SELECTED SORTING (Prioritizes Apartment & Resident Name)
        if (sortBy === 'apartment') {
          const numA = parseInt(a.bike.apartment.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.bike.apartment.replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) {
            return numA - numB;
          }
          const blockCompare = a.bike.block.localeCompare(b.bike.block);
          if (blockCompare !== 0) return blockCompare;
          return a.bike.residentName.localeCompare(b.bike.residentName);
        }

        if (sortBy === 'block') {
          const blockCompare = a.bike.block.localeCompare(b.bike.block, 'pt-BR', { numeric: true });
          if (blockCompare !== 0) return blockCompare;
          const apartmentCompare = a.bike.apartment.localeCompare(b.bike.apartment, 'pt-BR', { numeric: true });
          if (apartmentCompare !== 0) return apartmentCompare;
          return a.bike.residentName.localeCompare(b.bike.residentName, 'pt-BR');
        }

        if (sortBy === 'resident') {
          return a.bike.residentName.localeCompare(b.bike.residentName);
        }

        if (sortBy === 'brand') {
          return a.bike.brandModel.localeCompare(b.bike.brandModel);
        }

        if (sortBy === 'recent') {
          return new Date(b.bike.registeredAt).getTime() - new Date(a.bike.registeredAt).getTime();
        }

        return 0;
      })
      .map(({ bike }) => bike);
  }, [bikes, searchTerm, categoryFilter, spotFilter, sortBy]);

  const hasActiveFilters = Boolean(searchTerm.trim()) || spotFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'apartment';

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSpotFilter('all');
    setSortBy('apartment');
  };

  const bikeColumns = useMemo(() => {
    const columns = Array.from({ length: catalogColumnCount }, () => [] as { bike: RegisteredBicycle; index: number }[]);
    filteredAndRankedBikes.forEach((bike, index) => columns[index % catalogColumnCount].push({ bike, index }));
    return columns;
  }, [filteredAndRankedBikes, catalogColumnCount]);
  // Categories list for chips
  const categories: BikeCategory[] = [
    'Mountain Bike',
    'Urbana',
    'Elétrica',
    'Speed / Road',
    'Gravel',
    'Dobrável',
    'Infantil',
  ];

  return (
    <div className="space-y-6">
      {onBackToTasks && <button type="button" onClick={onBackToTasks} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"><ArrowLeft className="h-3.5 w-3.5 text-[#e87c0b]" />Voltar para tarefas</button>}
      {/* Photo Preview Modal */}
      {selectedPreviewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedPreviewPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPreviewPhoto}
              alt="Ampliação da bicicleta"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Smart Characteristic Search Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <input
            type="text"
            id="bike-characteristic-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Apartamento (ex: 302, 101), Morador, Bloco, Selo ou Modelo..."
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 bg-white/95 text-slate-900 text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Essential filters first; secondary controls are progressive. */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Total', count: bikes.length, active: 'bg-slate-900 text-white', icon: null },
              { id: 'with_spot', label: 'Com vaga', count: bikes.filter((bike) => bike.spotNumber).length, active: 'bg-emerald-700 text-white', icon: null },
              { id: 'no_spot', label: 'Sem vaga', count: bikes.filter((bike) => !bike.spotNumber).length, active: 'bg-amber-500 text-white', icon: null },
              { id: 'due_reevaluation', label: 'Reavaliar', count: dueBikesCount, active: 'bg-amber-500 text-white', icon: Clock },
            ].map(({ id, label, count, active, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSpotFilter(id as typeof spotFilter)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all duration-200 active:scale-95 ${spotFilter === id ? `${active} border-transparent shadow-sm` : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${spotFilter === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-900">
                Limpar seleção
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsViewOptionsOpen((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-all ${isViewOptionsOpen || categoryFilter !== 'all' || sortBy !== 'apartment' ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais opções
            </button>
          </div>
        </div>

        {isViewOptionsOpen && (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 animate-[fadeIn_.22s_ease-out] sm:grid-cols-2">
            <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
              Ordenar por
              <span className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="apartment">Apartamento e morador</option>
                  <option value="block">Bloco e apartamento</option>
                  <option value="resident">Nome do morador</option>
                  <option value="brand">Modelo da bicicleta</option>
                  <option value="recent">Mais recentes</option>
                </select>
              </span>
            </label>
            <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">
              Categoria
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:ring-2 focus:ring-slate-900">
                <option value="all">Todas as categorias</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>
        )}
        {/* Search Results feedback */}
        {searchTerm.trim() && (
          <div className="flex items-center justify-between text-xs font-mono text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>
              Encontrados <strong className="text-slate-900">{filteredAndRankedBikes.length}</strong> cadastro(s) para "{searchTerm}":
            </span>
            <button
              onClick={() => setSearchTerm('')}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>

      {/* Bicycle Cards Grid */}
      {filteredAndRankedBikes.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-200/90 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold font-mono text-slate-800">
            Nenhuma bicicleta encontrada com os critérios informados
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1 max-w-md mx-auto">
            Tente pesquisar por outros detalhes como cor ("vermelha"), marca ("Caloi", "Trek") ou o número do apartamento.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setSpotFilter('all');
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-700 hover:bg-slate-50"
            >
              Limpar Filtros
            </button>
            <button
              type="button"
              onClick={() => onOpenRegisterModal()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold hover:bg-slate-800"
            >
              + Cadastrar Esta Bike Agora
            </button>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: `repeat(${catalogColumnCount}, minmax(0, 1fr))` }}>
          {bikeColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="space-y-4">
              {column.map(({ bike, index }) => {
            const reevalInfo = getBikeReevaluationInfo(bike);
            const isDue = reevalInfo.isDue;
            const isExpanded = expandedBikeId === bike.id;
            const isClosing = closingBikeId === bike.id;
            const isOpening = openingBikeId === bike.id;
            return <article key={bike.id} className={`group self-start overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isDue ? 'border-amber-300 ring-1 ring-amber-200/70' : 'border-slate-200'}`} style={{ transitionDelay: `${Math.min(index, 8) * 35}ms` }}>
              <button type="button" onClick={() => handleCardToggle(bike.id)} className="block w-full text-left">
                <div className="relative h-36 overflow-hidden bg-slate-100"><img src={bike.photoUrl} alt={`Bicicleta de ${bike.residentName}`} onError={(event) => { event.currentTarget.src = getBikeFallbackPhoto(0); }} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#07142e]/85 via-[#07142e]/15 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-[#0d1733]/95 px-2.5 py-1 text-[10px] font-black text-white shadow-sm"><Building className="h-3 w-3 text-[#f19a00]" />Apto {bike.apartment}{bike.block ? ` · ${bike.block}` : ''}</span>
                  <span className={`absolute right-3 top-3 rounded-lg px-2 py-1 text-[9px] font-black ${bike.spotNumber ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-[#0d1733]'}`}>{bike.spotNumber ? `Vaga ${bike.spotNumber}` : 'Sem vaga'}</span>
                  <div className="absolute bottom-3 left-3 right-3"><p className="truncate text-base font-black text-white">{bike.residentName}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-white/80">{bike.brandModel} · {bike.color}</p></div>
                </div>
                <div className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">{bike.category || 'Bicicleta cadastrada'}</p><p className="mt-1 truncate text-xs font-semibold text-slate-600">{bike.spotNumber ? `Vinculada à vaga ${bike.spotNumber}` : 'Aguardando vínculo de vaga'}</p></div><span className="shrink-0 text-[10px] font-black text-[#e87c0b]">{isExpanded ? 'Fechar' : 'Ver ficha'} <ExternalLink className="ml-0.5 inline h-3 w-3" /></span></div>
              </button>
              {isDue ? (
                <button type="button" onClick={() => onOpenReevaluationModal(bike)} className="mx-3 mb-3 flex h-12 w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 text-left text-[10px] font-bold text-amber-900 transition hover:bg-amber-100">
                  <span><Clock className="mr-1 inline h-3.5 w-3.5 text-amber-600" />Reavaliação pendente</span><span>Resolver</span>
                </button>
              ) : (
                <div className="mx-3 mb-3 flex h-12 w-[calc(100%-1.5rem)] items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 text-[10px] font-semibold text-slate-500">
                  <span>Cadastro sem pendências</span><span className="text-emerald-700">Em dia</span>
                </div>
              )}
              {isExpanded && <div className={`bike-card-details ${isOpening ? 'bike-card-details--opening' : ''} ${isClosing ? 'bike-card-details--closing' : ''}`}><div className="grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg border border-slate-200 bg-white p-2"><p className="font-bold text-slate-400">Contato</p><p className="mt-1 font-bold text-[#0d1733]">{bike.residentPhone || 'Não informado'}</p></div><div className="rounded-lg border border-slate-200 bg-white p-2"><p className="font-bold text-slate-400">Cadastro</p><p className="mt-1 font-bold text-[#0d1733]">{new Date(bike.registeredAt).toLocaleDateString('pt-BR')}</p></div></div><p className="mt-3 rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-600"><strong className="text-[#0d1733]">Bicicleta:</strong> {bike.brandModel}{bike.tagNumber ? ` · Selo ${bike.tagNumber}` : ''}</p><div className="mt-3 grid grid-cols-2 gap-2">{!bike.spotNumber && availableSpotsCount > 0 ? <button type="button" onClick={() => onAssignSpotToBike(bike)} className="rounded-lg bg-[#0d1733] px-2 py-2 text-[10px] font-black text-white">Vincular vaga</button> : <button type="button" onClick={() => onOpenReportModal(bike)} className="rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-black text-white">Notificar</button>}<button type="button" onClick={() => onOpenRegisterModal(bike)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-black text-[#0d1733]">Editar</button></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => onOpenReportModal(bike)} className="text-[10px] font-bold text-emerald-700">Notificar</button><button type="button" onClick={() => setSelectedPreviewPhoto(bike.photoUrl)} className="text-[10px] font-bold text-slate-600">Ampliar foto</button><button type="button" onClick={() => onOpenReevaluationModal(bike)} className="text-[10px] font-bold text-[#b96500]">Reavaliar</button><button type="button" onClick={() => onRequestDeleteBike(bike)} className="text-[10px] font-bold text-rose-600">Excluir</button></div></div>}
            </article>;
              })}
            </div>
          ))}
        </div>      )}

    </div>
  );
};
