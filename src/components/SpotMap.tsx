import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BicycleSpot, FloorPlanModule, SystemConfig, SectorPhotoData } from '../types';
import { evaluateSpot } from '../utils';
import { SpotCard } from './SpotCard';
import { SectorPhotoModal } from './SectorPhotoModal';
import {
  Search,
  Filter,
  Layers,
  Bike,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Sparkles,
  X,
  Camera,
  MapPin,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SpotMapProps {
  spots: BicycleSpot[];
  config: SystemConfig;
  selectedSpot: BicycleSpot | null;
  onSelectSpot: (spot: BicycleSpot) => void;
  onQuickQr: (spot: BicycleSpot, e: React.MouseEvent) => void;
  onSaveSectorPhoto?: (sectorName: string, data: SectorPhotoData | null) => void;
}

export const SpotMap: React.FC<SpotMapProps> = ({
  spots,
  config,
  selectedSpot,
  onSelectSpot,
  onQuickQr,
  onSaveSectorPhoto,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'disponivel' | 'ocupada' | 'vencida' | 'vitalicio'
  >('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Sector Photo Modal state
  const [sectorModalTarget, setSectorModalTarget] = useState<{
    sectorName: string;
    spotCount: number;
    initialData?: SectorPhotoData;
  } | null>(null);

  // Distinct sectors
  const sectors: string[] = useMemo(() => Array.from(new Set(spots.map((s) => s.sector))), [spots]);
  const floorPlans = useMemo(
    () => Object.entries(config.sectorFloorPlans || {}).map(([id, plan]) => ({
      id,
      name: plan.name || 'Planta geral do bicicletário',
      sectors: [...new Set(plan.modules
        .filter((module) => (module.kind || 'bike_module') === 'bike_module')
        .map((module) => module.assignedSector || id))],
    })),
    [config.sectorFloorPlans]
  );
  const floorModules = useMemo(
    () => Object.entries(config.sectorFloorPlans || {}).flatMap(([planSector, plan]) =>
      plan.modules
        .filter((module) => (module.kind || 'bike_module') === 'bike_module')
        .map((module, index) => ({
          id: module.id,
          name: module.name || `Módulo ${index + 1}`,
          sector: module.assignedSector || planSector,
        }))
    ),
    [config.sectorFloorPlans]
  );

  // Filter spots
  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      // Sector filter
      const selectedPlan = sectorFilter.startsWith('plan:')
        ? floorPlans.find((plan) => plan.id === sectorFilter.slice(5))
        : null;
      if (selectedPlan && !selectedPlan.sectors.includes(spot.sector)) {
        return false;
      }
      if (!selectedPlan && sectorFilter !== 'all' && spot.sector !== sectorFilter) {
        return false;
      }

      if (moduleFilter !== 'all' && spot.floorPlanModuleId !== moduleFilter) {
        return false;
      }

      // Status evaluation
      const { status, isExpiringSoon, isExpired } = evaluateSpot(
        spot,
        config.idleDaysThreshold,
        config.expiryWarningDays
      );

      // Type filter
      if (activeFilter === 'disponivel' && status !== 'disponivel') return false;
      if (activeFilter === 'ocupada' && !spot.currentAllocation) return false;
      if (activeFilter === 'vencida' && !(isExpired || isExpiringSoon)) return false;
      if (activeFilter === 'vitalicio' && spot.currentAllocation?.concessionType !== 'vitalicio')
        return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = spot.spotNumber.toLowerCase().includes(term);
        const matchApto = spot.currentAllocation?.apartment.toLowerCase().includes(term);
        const matchResident = spot.currentAllocation?.residentName.toLowerCase().includes(term);
        const matchBike = spot.currentAllocation?.bicycle.brandModel.toLowerCase().includes(term);
        const matchTag = spot.currentAllocation?.bicycle.tagNumber.toLowerCase().includes(term);

        return matchNumber || matchApto || matchResident || matchBike || matchTag;
      }

      return true;
    });
  }, [spots, sectorFilter, moduleFilter, activeFilter, searchTerm, floorPlans, config.idleDaysThreshold, config.expiryWarningDays]);

  // Group by sector for cinema/rack wall layout
  const groupedBySector = useMemo(() => {
    return sectors.reduce((acc, sector) => {
      acc[sector] = filteredSpots.filter((s) => s.sector === sector);
      return acc;
    }, {} as Record<string, BicycleSpot[]>);
  }, [sectors, filteredSpots]);

  // Counts for pills
  const totalCount = spots.length;
  const availableCount = useMemo(() => spots.filter((s) => !s.currentAllocation).length, [spots]);
  const occupiedCount = useMemo(() => spots.filter((s) => !!s.currentAllocation).length, [spots]);
  const expiredCount = useMemo(() => {
    return spots.filter((s) => {
      const { isExpired, isExpiringSoon } = evaluateSpot(
        s,
        config.idleDaysThreshold,
        config.expiryWarningDays
      );
      return isExpired || isExpiringSoon;
    }).length;
  }, [spots, config.idleDaysThreshold, config.expiryWarningDays]);

  const [showMobileLegend, setShowMobileLegend] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const hasFloorPlans = Object.values(config.sectorFloorPlans || {}).some((plan) => plan.modules.length > 0);
  const [viewMode, setViewMode] = useState<'cards' | 'floor'>(() => hasFloorPlans ? 'floor' : 'cards');

  // Ao salvar a primeira planta, ela se torna a visualização principal do mapa.
  // A opção em cartões continua disponível para a operação detalhada.
  useEffect(() => {
    if (hasFloorPlans) setViewMode('floor');
  }, [hasFloorPlans]);

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Search & Filter Bar */}
      <div className="glass-panel grid gap-2.5 rounded-xl p-3 shadow-md sm:p-3.5 xl:grid-cols-[minmax(620px,1fr)_auto] xl:items-center xl:gap-6">
        {/* Search input & Sector select on mobile */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 xl:max-w-[760px] xl:gap-4">
          <div className="relative w-full flex-1 xl:max-w-[320px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#e87c0b]" />
            <input
              id="search-spots-input"
              type="text"
              placeholder="Buscar Apto, Morador, Vaga ou Selo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-orange-200 bg-white py-2 pl-9 pr-7 text-xs font-mono text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus:border-[#f19a00] focus:outline-none focus:ring-1 focus:ring-orange-200 sm:py-2"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-[#a85000] shadow-xs md:hidden"
            aria-expanded={showMobileFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            {showMobileFilters ? 'Ocultar filtros' : 'Mais filtros'}
          </button>

          {/* Sector selector (integrated for mobile & desktop) */}
          <div className={`w-full shrink-0 ${showMobileFilters ? 'block' : 'hidden'} md:block md:w-40 xl:w-44`}>
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setModuleFilter('all');
              }}
              className="w-full px-2.5 py-2 sm:py-1.5 rounded-lg border border-slate-300/90 glass-input font-mono text-xs text-slate-700 focus:outline-none focus:border-slate-500 shadow-xs"
            >
              <option value="all">Plantas (Todas)</option>
              {floorPlans.map((plan) => (
                <option key={`plan-${plan.id}`} value={`plan:${plan.id}`} className="bg-white text-slate-800">
                  Planta: {plan.name}
                </option>
              ))}
            </select>
          </div>

          {floorModules.length > 0 && (
            <div className={`w-full shrink-0 ${showMobileFilters ? 'block' : 'hidden'} md:block md:w-40 xl:w-44`}>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 font-mono text-xs text-slate-700 shadow-xs focus:border-orange-400 focus:outline-none sm:py-1.5"
              >
                <option value="all">Módulos (Todos)</option>
                {floorModules.map((module) => (
                  <option key={module.id} value={module.id} className="bg-white text-slate-800">
                    {module.name} · {module.sector}
                  </option>
                ))}
              </select>
            </div>
          )}          
        </div>
      </div>

      {/* Visual Guide / Legend: Compact & Toggleable on Mobile, Full on Desktop */}
      <div className="glass-panel rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-widest font-bold text-[10px] font-mono">
              Legenda do Mapa:
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400 font-mono italic">
              • Toque na vaga para ver detalhes e foto
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileLegend(!showMobileLegend)}
            className="sm:hidden text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200"
          >
            {showMobileLegend ? 'Ocultar' : 'Ver Cores'}
          </button>
        </div>

        <div
          className={`mt-2 sm:mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono ${
            showMobileLegend ? 'block' : 'hidden sm:flex'
          }`}
        >
          <div className="flex items-center gap-1.5 text-slate-700">
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shadow-xs"></div>
            <span className="font-medium">Livre</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <div className="w-2.5 h-2.5 rounded-xs bg-indigo-600 shadow-xs"></div>
            <span className="font-medium">Ocupado (Vitalício)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <div className="w-2.5 h-2.5 rounded-xs bg-slate-700 shadow-xs"></div>
            <span className="font-medium">Ocupado (Temporário)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <div className="w-2.5 h-2.5 rounded-xs bg-rose-600 shadow-xs"></div>
            <span className="font-medium">Prazo Vencido</span>
          </div>
        </div>
        {hasFloorPlans && <div className="mt-3 flex flex-col gap-2 border-t border-orange-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Visualização do mapa</span>
          <div className="inline-flex w-full rounded-xl border border-orange-100 bg-white p-1 shadow-sm sm:w-auto">
            <button type="button" onClick={() => setViewMode('cards')} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black transition sm:flex-none ${viewMode === 'cards' ? 'bg-[#0d1733] text-white' : 'text-slate-500 hover:bg-orange-50'}`}>Mapa em cartões</button>
            <button type="button" onClick={() => setViewMode('floor')} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black transition sm:flex-none ${viewMode === 'floor' ? 'bg-[#F19A00] text-[#0d1733]' : 'text-slate-500 hover:bg-orange-50'}`}>Visualização em planta</button>
          </div>
          <p className="text-[10px] text-slate-500">{viewMode === 'cards' ? 'Cartões ajudam a consultar e agir rápido; a planta mostra a posição física dos módulos.' : 'Use a planta para localizar módulos e vagas no espaço físico.'}</p>
        </div>}
      </div>

      {!hasFloorPlans && <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/60 p-3 text-xs text-slate-600"><strong className="text-[#0d1733]">Ainda não há uma planta operacional.</strong> Use Ajustes para configurar a planta e representar a implantação entregue pela Nobrutec.</div>}
      {spots.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600"><strong className="block text-[#0d1733]">Nenhuma vaga foi cadastrada.</strong><span className="mt-1 block">Configure a planta e adicione os módulos para criar as vagas do bicicletário.</span></div>}
      {viewMode === 'floor' && hasFloorPlans && <div className="map-view-entry space-y-5">{Object.entries(config.sectorFloorPlans || {}).map(([planName, plan]) => { const selectedPlanId = sectorFilter.startsWith('plan:') ? sectorFilter.slice(5) : null; const visibleModules = selectedPlanId ? (selectedPlanId === planName ? plan.modules : []) : sectorFilter === 'all' ? plan.modules : plan.modules.filter((module) => (module.kind || 'bike_module') !== 'bike_module' || (module.assignedSector || planName) === sectorFilter); return visibleModules.length ? <FloorPlanPreview key={planName} sector={planName} planTitle={plan.name || 'Planta geral do bicicletário'} modules={visibleModules} spots={filteredSpots} config={config} onSelectSpot={onSelectSpot} /> : null; })}</div>}

      {/* Sectors & Wall Hook Cinema Layout */}
      <div className={viewMode === 'floor' ? 'hidden' : 'space-y-6'}>
        {sectors.map((sector, sectorIndex) => {
          const sectorSpots = groupedBySector[sector] || [];
          if (sectorSpots.length === 0 && sectorFilter !== 'all') return null;

          const sectorPhotoData = config.sectorPhotos?.[sector];
          const freeInSector = sectorSpots.filter((spot) => !spot.currentAllocation).length;
          const attentionInSector = sectorSpots.filter((spot) => {
            const state = evaluateSpot(spot, config.idleDaysThreshold, config.expiryWarningDays);
            return !!spot.currentAllocation && (state.isExpired || state.isExpiringSoon);
          }).length;

          return (
            <div
              key={sector}
              className="map-sector-entry overflow-hidden rounded-2xl border border-orange-100 bg-white p-3 shadow-md sm:p-4" style={{ animationDelay: `${Math.min(sectorIndex, 4) * 55}ms` }}
            >
              {/* Sector Header with Wall Mounting Rail Graphic & Photo Action */}
              <div className="sector-card-header mb-3 rounded-xl p-3 sm:p-3.5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f4a000] shadow-[0_0_0_4px_rgba(244,160,0,.16)]" />
                    <h3 className="truncate text-xs font-black tracking-tight text-white sm:text-sm">
                      {sector}
                    </h3>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{sectorSpots.length} vagas</span>
                  </div>

                  {/* Visualizar Local / Anexar Foto Button */}
                  <div className="flex items-center gap-3.5 shrink-0 sm:gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">{freeInSector} livres</span>
                      {attentionInSector > 0 && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">{attentionInSector} atenção</span>}
                    </div>
                    <button
                      id={`sector-photo-btn-${sector.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      type="button"
                      onClick={() =>
                        setSectorModalTarget({
                          sectorName: sector,
                          spotCount: sectorSpots.length,
                          initialData: sectorPhotoData,
                        })
                      }
                      className="sector-local-btn inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-mono font-bold text-[#0d1733] shadow-sm transition-all hover:border-[#f19a00] hover:bg-orange-50"
                      title="Visualizar local deste setor"
                    >
                      {sectorPhotoData?.photoUrl ? (
                        <>
                          <ImageIcon className="h-3 w-3 text-[#f4a000]" />
                          <span>Visualizar local</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f4a000]" />
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3 text-slate-600" />
                          <span>Visualizar local</span>
                        </>
                      )}
                    </button>

                    <span className="hidden text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 xl:inline">
                      Trilho Industrial de Aço
                    </span>
                  </div>
                </div>

                {/* Optional Sector Description Bar if added */}
                {sectorPhotoData?.description && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#f4a000] shrink-0" />
                    <span className="truncate">
                      <strong>Ref:</strong> {sectorPhotoData.description}
                    </span>
                  </div>
                )}

                {/* Industrial Mounting Beam (Trilho Estrutural de Parede/Teto onde os ganchos são fixados) */}
                <div className="relative mt-3 flex h-2 items-center justify-around rounded-sm border border-slate-500/60 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 px-2 shadow-inner sm:px-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 w-1 rounded-full bg-slate-950/70 shadow-xs"
                      title="Fixação Industrial"
                    />
                  ))}
                </div>
              </div>

              {/* Grid of Hooks (Cinema / Parking bay rack layout) */}
              {sectorSpots.length > 0 ? (
                <div key={`spots-${sector}-${activeFilter}-${sectorFilter}-${moduleFilter}-${searchTerm}`} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                  {sectorSpots.map((spot, spotIndex) => (
                    <div key={spot.id} className="map-spot-entry" style={{ animationDelay: `${Math.min(spotIndex, 10) * 24}ms` }}><SpotCard
                      key={spot.id}
                      spot={spot}
                      config={config}
                      isSelected={selectedSpot?.id === spot.id}
                      onSelect={onSelectSpot}
                      onQuickQr={onQuickQr}
                    /></div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-mono text-slate-500 italic glass-input rounded-lg border border-dashed border-slate-300">
                  Nenhuma vaga deste setor corresponde aos filtros aplicados.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sector Photo & Identification Modal */}
      {sectorModalTarget && (
        <SectorPhotoModal
          isOpen={!!sectorModalTarget}
          sectorName={sectorModalTarget.sectorName}
          sectorSpotCount={sectorModalTarget.spotCount}
          initialData={sectorModalTarget.initialData}
          onClose={() => setSectorModalTarget(null)}
          onSave={(sectorName, data) => {
            if (onSaveSectorPhoto) {
              onSaveSectorPhoto(sectorName, data);
            }
          }}
        />
      )}
    </div>
  );
};

function FloorPlanPreview({
  sector,
  planTitle,
  modules,
  spots,
  config,
  onSelectSpot,
}: {
  sector: string;
  planTitle: string;
  modules: FloorPlanModule[];
  spots: BicycleSpot[];
  config: SystemConfig;
  onSelectSpot: (spot: BicycleSpot) => void;
}) {
  const [previewSpot, setPreviewSpot] = useState<BicycleSpot | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isPreviewPinned, setIsPreviewPinned] = useState(false);
  const [isPreviewDetailVisible, setIsPreviewDetailVisible] = useState(false);
  const [isFullscreenDetailOpen, setIsFullscreenDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [plantStatusFilter, setPlantStatusFilter] = useState<'all' | 'free' | 'occupied' | 'attention'>('all');
  const [previewAnchor, setPreviewAnchor] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const plantModuleIds = new Set(modules.filter((module) => (module.kind || 'bike_module') === 'bike_module').map((module) => module.id));
  const plantSectors = new Set(modules.filter((module) => (module.kind || 'bike_module') === 'bike_module').map((module) => module.assignedSector || sector));
  const plantSpots = spots.filter((spot) => plantModuleIds.has(spot.floorPlanModuleId || '') || (!spot.floorPlanModuleId && plantSectors.has(spot.sector)));
  const plantFreeCount = plantSpots.filter((spot) => !spot.currentAllocation).length;
  const plantOccupiedCount = plantSpots.filter((spot) => !!spot.currentAllocation).length;
  const plantAttentionCount = plantSpots.filter((spot) => {
    const state = evaluateSpot(spot, config.idleDaysThreshold, config.expiryWarningDays);
    return !!spot.currentAllocation && (state.isExpired || state.isExpiringSoon);
  }).length;
  const legacyCursorsBySector: Record<string, number> = {};
  let bikeModuleNumber = 0;
  const previewEvaluation = previewSpot ? evaluateSpot(previewSpot, config.idleDaysThreshold, config.expiryWarningDays) : null;
  const previewIsFree = previewSpot ? !previewSpot.currentAllocation : false;
  const previewLabel = !previewSpot ? '' : previewIsFree ? 'Livre' : previewEvaluation?.isExpired ? 'Vencida' : previewEvaluation?.isExpiringSoon ? 'Atenção' : 'Ocupada';
  const previewTone = previewIsFree ? 'emerald' : previewEvaluation?.isExpired || previewEvaluation?.isExpiringSoon ? 'rose' : 'orange';
  const matchesPlantStatusFilter = (spot: BicycleSpot) => {
    if (plantStatusFilter === 'all') return true;
    if (plantStatusFilter === 'free') return !spot.currentAllocation;
    const state = evaluateSpot(spot, config.idleDaysThreshold, config.expiryWarningDays);
    if (plantStatusFilter === 'attention') return !!spot.currentAllocation && (state.isExpired || state.isExpiringSoon);
    return !!spot.currentAllocation && !state.isExpired && !state.isExpiringSoon;
  };
  const setSpotPreview = (spot: BicycleSpot, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (isFullscreen && isPreviewPinned && previewSpot?.id === spot.id) return;
    setPreviewSpot(spot);
    setIsPreviewExpanded(true);
    setIsPreviewPinned(false);
    setIsPreviewDetailVisible(false);
    if (event) setPreviewAnchor({ x: event.clientX, y: event.clientY });
  };
  const handleSpotActivation = (spot: BicycleSpot, event: React.MouseEvent<HTMLButtonElement>) => {
    if (isFullscreen) {
      if (isPreviewPinned && previewSpot?.id === spot.id) {
        setIsFullscreenDetailOpen(true);
        return;
      }
      setPreviewSpot(spot);
      setPreviewAnchor({ x: event.clientX, y: event.clientY });
      setIsPreviewExpanded(true);
      setIsPreviewPinned(true);
      setIsPreviewDetailVisible(false);
      return;
    }
    const hasPreciseHover = typeof window !== 'undefined' && window.innerWidth >= 768 && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasPreciseHover || previewSpot?.id === spot.id) onSelectSpot(spot);
    else setSpotPreview(spot, event);
  };
  const toggleFullscreen = async () => {
    if (!previewRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await previewRef.current.requestFullscreen();
  };
  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === previewRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const fullscreenPreviewPlacement = previewAnchor && typeof window !== 'undefined'
    ? `${previewAnchor.x < window.innerWidth / 2 ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2`
    : 'right-5 top-1/2 -translate-y-1/2';

  const previewContent = previewSpot ? (
    <div className="spot-preview-card rounded-xl border border-[#f0d9b5] bg-white p-3 shadow-[0_12px_28px_rgba(15,35,72,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#dc7a00]">Prévia da vaga</p>
          <h4 className="mt-1 text-sm font-black text-[#0d1733]">Vaga {previewSpot.spotNumber}</h4>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${previewTone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : previewTone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'}`}>{previewLabel}</span>
      </div>
      <div className="mt-2 border-t border-slate-100 pt-2">
        {previewIsFree ? <><p className="text-xs font-bold text-[#0d1733]">Pronta para vincular</p><p className="mt-1 text-[11px] text-slate-500">Escolha esta vaga para uma bicicleta já cadastrada.</p></> : <><p className="truncate text-xs font-black text-[#0d1733]">{previewSpot.currentAllocation?.residentName}</p><p className="mt-1 text-[11px] font-semibold text-slate-600">Apto {previewSpot.currentAllocation?.apartment} · {previewSpot.currentAllocation?.block}</p><p className="mt-1 truncate text-[10px] text-slate-500">{previewSpot.currentAllocation?.bicycle?.brandModel || 'Bicicleta cadastrada'}</p></>}
      </div>
      {!isPreviewDetailVisible && <p className="mt-2 text-[9px] font-semibold text-slate-400">{typeof window !== 'undefined' && window.innerWidth >= 768 && window.matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Clique novamente na vaga para abrir a ficha completa' : 'Toque novamente para abrir a ficha completa'}</p>}
    </div>
  ) : null;

  return (
    <section ref={previewRef} className={`floor-plan-shell relative glass-panel overflow-visible rounded-2xl border border-orange-100 p-4 shadow-sm sm:p-5 ${isFullscreen ? 'floor-plan-fullscreen h-screen overflow-y-auto rounded-none bg-[#fffaf3] sm:p-7' : ''}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="floor-plan-title-block">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#e87c0b]">Planta operacional</p>
          <h3 className="floor-plan-title mt-1 text-sm font-black text-[#0d1733]">{planTitle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="floor-plan-subtitle text-[11px] text-slate-500">Representação configurada pela Nobrutec</p>
            <span className="floor-plan-layout-tag rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Layout do setor</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
          <button type="button" onClick={() => void toggleFullscreen()} className="floor-plan-fullscreen-button inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black text-[#a85000] transition hover:bg-orange-100" title={isFullscreen ? 'Sair da tela cheia' : 'Abrir planta em tela cheia'}>{isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</button>
          <button type="button" onClick={() => setPlantStatusFilter('all')} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${plantStatusFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><span>Total</span> <b>{plantSpots.length}</b></button>
          <button type="button" onClick={() => setPlantStatusFilter('free')} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${plantStatusFilter === 'free' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><i className={`h-2 w-2 rounded-full ${plantStatusFilter === 'free' ? 'bg-white' : 'bg-emerald-500'}`} />Livres <b>{plantFreeCount}</b></button>
          <button type="button" onClick={() => setPlantStatusFilter('occupied')} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${plantStatusFilter === 'occupied' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}><i className={`h-2 w-2 rounded-full ${plantStatusFilter === 'occupied' ? 'bg-white' : 'bg-orange-500'}`} />Ocupadas <b>{plantOccupiedCount}</b></button>
          <button type="button" onClick={() => setPlantStatusFilter('attention')} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${plantStatusFilter === 'attention' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}><i className={`h-2 w-2 rounded-full ${plantStatusFilter === 'attention' ? 'bg-white' : 'bg-rose-500'}`} />Atenção <b>{plantAttentionCount}</b></button>
        </div>
      </div>

      {isFullscreen && <div className="floor-plan-rotate-hint" role="status"><RotateCw className="h-4 w-4" /><span>Para visualizar melhor a planta, gire o aparelho na horizontal.</span></div>}

      <div
        className={`floor-plan-canvas relative overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfe] p-2 shadow-inner ${isFullscreen ? 'min-h-[calc(100vh-190px)]' : 'min-h-[420px]'}`}
        style={{ backgroundImage: 'linear-gradient(#eaf0f6 1px, transparent 1px), linear-gradient(90deg, #eaf0f6 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >

        {modules.map((module) => {
          const kind = module.kind || 'bike_module';
          const assignedSector = module.assignedSector || sector;
          const linkedByModule = spots.filter((spot) => spot.floorPlanModuleId === module.id);
          const legacySectorSpots = spots.filter((spot) => spot.sector === assignedSector && !spot.floorPlanModuleId);
          const legacyCursor = legacyCursorsBySector[assignedSector] || 0;
          const moduleCapacity = module.spotCapacity || 0;
          const legacyForModule = kind === 'bike_module'
            ? legacySectorSpots.slice(legacyCursor, legacyCursor + Math.max(0, moduleCapacity - linkedByModule.length))
            : [];
          const linkedSpots = kind === 'bike_module' ? [...linkedByModule, ...legacyForModule] : [];
          if (kind === 'bike_module') {
            legacyCursorsBySector[assignedSector] = legacyCursor + legacyForModule.length;
          }
          const moduleNumber = kind === 'bike_module' ? ++bikeModuleNumber : 0;
          const availableCount = linkedSpots.filter((spot) => !spot.currentAllocation).length;
          const configuredCapacity = kind === 'bike_module' ? Math.max(1, module.spotCapacity || 8) : 0;
          const unlinkedPositions = Math.max(0, configuredCapacity - linkedSpots.length);
          const visibleLinkedSpots = linkedSpots.filter(matchesPlantStatusFilter);
          const visibleUnlinkedPositions = plantStatusFilter === 'all' || plantStatusFilter === 'free' ? unlinkedPositions : 0;
          const isCompactModule = module.height < 15 || module.width < 18;
          const displayName = module.name.replace(/\s+\(cópia\)/gi, '').trim() || `Módulo ${moduleNumber}`;
          const layout = { left: `${module.x}%`, top: `${module.y}%`, width: `${module.width}%`, height: `${module.height}%` };

          if (kind === 'wall') {
            return <div key={module.id} aria-label={module.name} className="floor-plan-wall absolute rounded-md border border-slate-500 bg-slate-600 shadow-sm" style={{ ...layout, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.18) 0 3px, transparent 3px 8px)' }} />;
          }
          if (kind === 'column') {
            return <div key={module.id} title={module.name} className="floor-plan-column absolute rounded-lg border-2 border-slate-700 bg-slate-800 shadow-md" style={layout}><span className="absolute inset-1 rounded border border-white/20" /></div>;
          }
          if (kind === 'entrance') {
            return <div key={module.id} className="floor-plan-entrance absolute flex items-center justify-center rounded-xl border-2 border-orange-400 bg-orange-50 px-2 text-center shadow-sm" style={layout}><span className="text-[10px] font-black uppercase tracking-wide text-orange-800">Entrada <b className="ml-1 text-base">→</b></span></div>;
          }
          if (kind === 'corridor') {
            const vertical = module.flowDirection === 'vertical';
            return <div key={module.id} className={`floor-plan-corridor absolute flex items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 ${vertical ? 'flex-col' : ''}`} style={layout}><span className={`relative z-10 rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${vertical ? '' : 'whitespace-nowrap'}`}>{vertical ? '↕ Fluxo' : '↔ Fluxo'}</span><span className={`absolute flex w-full justify-around text-emerald-300/70 ${vertical ? 'flex-col items-center gap-5' : 'items-center'}`}>{Array.from({ length: vertical ? 5 : 10 }, (_, index) => <i key={index} className="not-italic text-sm">{vertical ? '↕' : '↔'}</i>)}</span></div>;
          }

          return (
            <div
              key={module.id}
              className="floor-plan-module floor-module-entry absolute overflow-hidden rounded-xl border border-[#b7c9e5] bg-white/95 p-2 shadow-md shadow-slate-900/5"
              style={{ ...layout, animationDelay: `${Math.min(moduleNumber, 12) * 28}ms` }}
              title={module.name}
            >
              {isCompactModule ? (
                <div className="flex h-full min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[10px] font-black text-[#0d1733]">M{String(moduleNumber).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-500">{displayName}</span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">{configuredCapacity} vagas</span>
                  <span className="shrink-0 text-[8px] font-bold text-emerald-700">{availableCount} livres</span>
                  <div className="flex min-w-0 items-center gap-1 overflow-x-auto py-1">
                    {visibleLinkedSpots.map((spot) => {
                      const state = evaluateSpot(spot, config.idleDaysThreshold, config.expiryWarningDays);
                      const color = !spot.currentAllocation ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white' : state.isExpired || state.isExpiringSoon ? 'border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white' : 'border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white';
                      const stateName = !spot.currentAllocation ? 'free' : state.isExpired || state.isExpiringSoon ? 'attention' : 'occupied';
                      return <button key={spot.id} type="button" onMouseEnter={(event) => setSpotPreview(spot, event)} onMouseLeave={() => { if (!isPreviewPinned) { setIsPreviewExpanded(false); setIsPreviewDetailVisible(false); } }} onFocus={() => setSpotPreview(spot)} onClick={(event) => handleSpotActivation(spot, event)} title={`${spot.spotNumber} · ${!spot.currentAllocation ? 'Livre' : 'Ocupada'}`} className={`floor-plan-spot floor-plan-spot--${stateName} grid h-5 w-5 shrink-0 place-items-center rounded border text-[8px] font-black transition hover:scale-110 ${color}${previewSpot?.id === spot.id && isPreviewPinned ? ' ring-2 ring-[#0d1733] ring-offset-1' : ''}`}>{spot.spotNumber.replace(/\D/g, '').slice(-2)}</button>;
                    })}
                    {Array.from({ length: visibleUnlinkedPositions }, (_, index) => <span key={`pending-${index}`} title="Posição configurada aguardando criação da vaga" className="grid h-5 w-5 shrink-0 place-items-center rounded border border-dashed border-slate-300 bg-slate-50 text-[8px] font-bold text-slate-400">+</span>)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1">
                    <span className="truncate text-[10px] font-black text-[#0d1733]">Módulo {String(moduleNumber).padStart(2, '0')}</span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">{configuredCapacity} vagas</span>
                  </div>
                  <p className="mt-1 truncate text-[9px] font-semibold leading-tight text-slate-500">{displayName}</p>
                  <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(17px, 1fr))' }}>
                    {visibleLinkedSpots.map((spot) => {
                      const state = evaluateSpot(spot, config.idleDaysThreshold, config.expiryWarningDays);
                      const color = !spot.currentAllocation ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white' : state.isExpired || state.isExpiringSoon ? 'border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-500 hover:text-white' : 'border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white';
                      const stateName = !spot.currentAllocation ? 'free' : state.isExpired || state.isExpiringSoon ? 'attention' : 'occupied';
                      return <button key={spot.id} type="button" onMouseEnter={(event) => setSpotPreview(spot, event)} onMouseLeave={() => { if (!isPreviewPinned) { setIsPreviewExpanded(false); setIsPreviewDetailVisible(false); } }} onFocus={() => setSpotPreview(spot)} onClick={(event) => handleSpotActivation(spot, event)} title={`${spot.spotNumber} · ${!spot.currentAllocation ? 'Livre' : 'Ocupada'}`} className={`floor-plan-spot floor-plan-spot--${stateName} grid aspect-square min-h-4 place-items-center rounded border text-[8px] font-black transition hover:scale-110 ${color}${previewSpot?.id === spot.id && isPreviewPinned ? ' ring-2 ring-[#0d1733] ring-offset-1' : ''}`}>{spot.spotNumber.replace(/\D/g, '').slice(-2)}</button>;
                    })}
                    {Array.from({ length: visibleUnlinkedPositions }, (_, index) => <span key={`pending-${index}`} title="Posição configurada aguardando criação da vaga" className="grid aspect-square min-h-4 place-items-center rounded border border-dashed border-slate-300 bg-slate-50 text-[8px] font-bold text-slate-400">+</span>)}
                  </div>
                  <div className="absolute bottom-1.5 right-2 flex gap-2 text-[8px] font-bold"><span className="text-emerald-700">{availableCount} livres</span>{unlinkedPositions > 0 && <span className="text-slate-400">{unlinkedPositions} a criar</span>}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {previewSpot && <aside onMouseEnter={() => { if (isFullscreen && isPreviewPinned) setIsPreviewDetailVisible(true); }} onMouseLeave={() => { if (isFullscreen) setIsPreviewDetailVisible(false); }} className={`absolute z-20 transition-[width] duration-200 ${isFullscreen ? `${isPreviewExpanded ? (isPreviewDetailVisible ? 'w-60' : 'w-52') : 'w-9'} block ${fullscreenPreviewPlacement}` : `left-[calc(100%+1.25rem)] top-24 hidden ${isPreviewExpanded ? 'w-64' : 'w-9'} 2xl:block`}`} aria-live="polite">
        {isPreviewExpanded ? <div className="rounded-xl border border-[#f0d9b5] bg-white shadow-[0_12px_28px_rgba(15,35,72,0.12)]">{previewContent}{isFullscreen && isPreviewPinned && isPreviewDetailVisible && <div className="mx-3 border-t border-slate-100 pb-3 pt-2 text-[10px] leading-relaxed text-slate-600"><p className="font-bold text-[#0d1733]">{previewIsFree ? 'Disponível para nova vinculação' : `Bicicleta: ${previewSpot.currentAllocation?.bicycle?.brandModel || 'Cadastrada'}`}</p>{!previewIsFree && <p className="mt-1">Concessão: {previewSpot.currentAllocation?.concessionType === 'vitalicio' ? 'Vitalícia' : `até ${previewSpot.currentAllocation?.endDate ? new Date(previewSpot.currentAllocation.endDate).toLocaleDateString('pt-BR') : 'data não definida'}`}</p>}<button type="button" onClick={() => setIsFullscreenDetailOpen(true)} className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#0d1733] px-2 py-2 text-[10px] font-black text-white transition hover:bg-[#1b2b55]">Mostrar mais</button></div>}</div> : <button type="button" onClick={() => setIsPreviewExpanded(true)} className="grid h-12 w-9 place-items-center rounded-lg border border-[#f0d9b5] bg-white text-[#0d1733] shadow-[0_8px_20px_rgba(15,35,72,0.14)] transition hover:bg-orange-50" title="Mostrar prévia da vaga" aria-label="Mostrar prévia da vaga">
          {fullscreenPreviewPlacement.includes('left-5') ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>}
      </aside>}
      {isFullscreen && isFullscreenDetailOpen && previewSpot && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07142e]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Detalhes da vaga ${previewSpot.spotNumber}`}>
        <article className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#f0d9b5] bg-[#fffdf9] p-5 shadow-2xl sm:p-6">
          <header className="flex items-start justify-between gap-4 border-b border-orange-100 pb-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#dc7a00]">Ficha da vaga</p><h4 className="mt-1 text-xl font-black text-[#0d1733]">Vaga {previewSpot.spotNumber}</h4><p className="mt-1 text-xs text-slate-500">{previewSpot.sector}</p></div>
            <button type="button" onClick={() => setIsFullscreenDetailOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Fechar ficha"><X className="h-4 w-4" /></button>
          </header>
          {previewIsFree ? <div className="py-6 text-center"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Livre</span><h5 className="mt-3 text-lg font-black text-[#0d1733]">Pronta para vincular</h5><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">Esta vaga está disponível para receber uma bicicleta já cadastrada.</p></div> : <div className="space-y-4 py-5"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Morador</p><p className="mt-1 font-black text-[#0d1733]">{previewSpot.currentAllocation?.residentName}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Apartamento</p><p className="mt-1 font-black text-[#0d1733]">Apto {previewSpot.currentAllocation?.apartment} · {previewSpot.currentAllocation?.block}</p></div></div><div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50/60 p-3">{previewSpot.currentAllocation?.photoUrl ? <img src={previewSpot.currentAllocation.photoUrl} alt={`Bicicleta na vaga ${previewSpot.spotNumber}`} className="h-48 w-full rounded-xl border border-slate-200/80 bg-white/80 object-contain p-3 shadow-[inset_0_0_0_1px_rgba(15,35,72,0.04)]" /> : <div className="grid h-28 place-items-center rounded-xl bg-orange-50 text-xs font-bold text-orange-700">Foto não disponível</div>}<div className="px-1 pb-1 pt-4"><p className="text-[9px] font-black uppercase tracking-wide text-[#b96500]">Bicicleta cadastrada</p><p className="mt-1 font-black text-[#0d1733]">{previewSpot.currentAllocation?.bicycle?.brandModel || 'Bicicleta cadastrada'}</p><p className="mt-1 text-xs text-slate-600">Concessão {previewSpot.currentAllocation?.concessionType === 'vitalicio' ? 'vitalícia' : `até ${previewSpot.currentAllocation?.endDate ? new Date(previewSpot.currentAllocation.endDate).toLocaleDateString('pt-BR') : 'data não definida'}`}</p></div></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Contato</p><p className="mt-1 font-bold text-[#0d1733]">{previewSpot.currentAllocation?.residentPhone || 'Não informado'}</p></div></div>}
        </article>
      </div>}
      <p className="mt-3 text-[11px] text-slate-500">Em tela cheia, clique na vaga para selecioná-la. Passe o mouse na prévia para ver os detalhes e use “Mostrar mais” para ver a ficha sem sair da planta.</p>
      {previewContent && isPreviewExpanded && <div className="mt-3 2xl:hidden">{previewContent}</div>}
    </section>
  );
}
