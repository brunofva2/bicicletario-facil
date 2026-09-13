import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BicycleSpot, FloorPlanModule, SystemConfig } from '../types';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, Columns3, Copy, LogIn, PanelTop, Plus, Save, Trash2 } from 'lucide-react';

type ElementKind = NonNullable<FloorPlanModule['kind']>;
const KIND_META: Record<ElementKind, { label: string; color: string; defaultWidth: number; defaultHeight: number; icon: React.ReactNode }> = {
  bike_module: { label: 'Módulo de vagas', color: 'border-indigo-500 bg-indigo-100 text-indigo-950', defaultWidth: 16, defaultHeight: 13, icon: <Building2 className="h-3.5 w-3.5" /> },
  wall: { label: 'Parede', color: 'border-slate-600 bg-slate-500 text-white', defaultWidth: 32, defaultHeight: 4, icon: <PanelTop className="h-3.5 w-3.5" /> },
  column: { label: 'Coluna', color: 'border-slate-800 bg-slate-700 text-white', defaultWidth: 6, defaultHeight: 6, icon: <Columns3 className="h-3.5 w-3.5" /> },
  corridor: { label: 'Corredor de passagem', color: 'border-emerald-600 bg-emerald-300/90 text-emerald-950', defaultWidth: 26, defaultHeight: 10, icon: <ArrowRight className="h-3.5 w-3.5" /> },
  entrance: { label: 'Entrada', color: 'border-orange-500 bg-orange-200 text-[#0d1733]', defaultWidth: 14, defaultHeight: 10, icon: <LogIn className="h-3.5 w-3.5" /> },
};

type PlanSpotSync = { created: BicycleSpot[]; attached: BicycleSpot[] };

function createStableId(prefix: string) {
  const uniquePart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uniquePart}`;
}

export function FloorPlanEditor({ config, spots, onSave, onSyncSpots }: { config: SystemConfig; spots: BicycleSpot[]; onSave: (config: SystemConfig) => void; onSyncSpots?: (sync: PlanSpotSync) => void }) {
  const sectors = useMemo(() => [...new Set(spots.map((spot) => spot.sector))].filter(Boolean), [spots]);
  const [newSectors, setNewSectors] = useState<string[]>(() => config.customSectors || []);
  const allSectors = useMemo(() => [...new Set([...sectors, ...(config.customSectors || []), ...newSectors])], [sectors, config.customSectors, newSectors]);
  const [sector, setSector] = useState(sectors[0] || 'Setor principal');
  const [planName, setPlanName] = useState('Planta geral do bicicletário');
  const [elements, setElements] = useState<FloorPlanModule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isWideLayout, setIsWideLayout] = useState(() => window.matchMedia('(min-width: 1050px)').matches);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => { if (!allSectors.includes(sector)) setSector(allSectors[0] || 'Setor principal'); }, [allSectors, sector]);
  useEffect(() => { setElements(config.sectorFloorPlans?.[sector]?.modules || []); setPlanName(config.sectorFloorPlans?.[sector]?.name || 'Planta geral do bicicletário'); setSelectedId(null); }, [sector, config.sectorFloorPlans]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1050px)');
    const updateLayout = () => setIsWideLayout(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const selected = elements.find((element) => element.id === selectedId);
  const createSector = () => {
    const name = window.prompt('Nome do novo setor ou bloco do bicicletário:')?.trim();
    if (!name || allSectors.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    setNewSectors((current) => [...current, name]);
  };
  const addElement = (kind: ElementKind) => {
    const meta = KIND_META[kind];
    const count = elements.filter((element) => (element.kind || 'bike_module') === kind).length + 1;
    const element: FloorPlanModule = {
      id: createStableId(kind),
      name: kind === 'bike_module' ? `Módulo ${count}` : `${meta.label} ${count}`,
      x: 8 + (elements.length % 4) * 20,
      y: 12 + Math.floor(elements.length / 4) * 18,
      width: meta.defaultWidth,
      height: meta.defaultHeight,
      spotCapacity: kind === 'bike_module' ? 8 : 0,
      style: 'regular',
      flowDirection: kind === 'corridor' ? 'horizontal' : undefined,
      assignedSector: kind === 'bike_module' ? sector : undefined,
      kind,
    };
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
  };
  const updateSelected = (patch: Partial<FloorPlanModule>) => setElements((current) => current.map((element) => element.id === selectedId ? { ...element, ...patch } : element));
  const duplicateSelected = () => {
    if (!selected) return;
    const copy: FloorPlanModule = {
      ...selected,
      id: createStableId(selected.kind || 'element'),
      name: `${selected.name} (cópia)`,
      // Um módulo de vagas nunca deve perder sua capacidade ao ser duplicado.
      spotCapacity: (selected.kind || 'bike_module') === 'bike_module'
        ? Math.max(1, selected.spotCapacity || 8)
        : 0,
      x: Math.min(100 - selected.width, selected.x + 4),
      y: Math.min(100 - selected.height, selected.y + 4),
    };
    setElements((current) => [...current, copy]);
    setSelectedId(copy.id);
  };
  const save = () => {
    const invalidModules = elements.filter((element) => (element.kind || 'bike_module') === 'bike_module' && (!(element.assignedSector || sector) || !element.spotCapacity || element.spotCapacity < 1));
    if (invalidModules.length) {
      setValidationMessage(`Revise ${invalidModules.length} módulo(s): cada módulo precisa de setor e pelo menos uma vaga.`);
      return;
    }
    const moduleIds = elements.filter((element) => (element.kind || 'bike_module') === 'bike_module').map((element) => element.id);
    if (new Set(moduleIds).size !== moduleIds.length) {
      setValidationMessage('Há módulos com a mesma identificação. Duplique o módulo novamente para gerar uma identificação segura.');
      return;
    }
    const modulesBelowExistingCapacity = elements.filter((element) =>
      (element.kind || 'bike_module') === 'bike_module'
      && spots.filter((spot) => spot.floorPlanModuleId === element.id).length > Math.max(1, element.spotCapacity || 1)
    );
    if (modulesBelowExistingCapacity.length) {
      setValidationMessage(`A capacidade de ${modulesBelowExistingCapacity.length} módulo(s) está menor que as vagas já vinculadas. Aumente a capacidade para preservar o mapa.`);
      return;
    }
    setValidationMessage(null);
    const created: BicycleSpot[] = [];
    const attached: BicycleSpot[] = [];
    const existingIds = new Set(spots.map((spot) => spot.id));
    const legacyUsageBySector: Record<string, number> = {};

    elements.filter((element) => (element.kind || 'bike_module') === 'bike_module').forEach((element) => {
      const capacity = Math.max(1, element.spotCapacity || 8);
      const currentCount = spots.filter((spot) => spot.floorPlanModuleId === element.id).length;
      const assignedSector = element.assignedSector || sector;
      const legacySpots = spots.filter((spot) => spot.sector === assignedSector && !spot.floorPlanModuleId);
      const availableLegacySpots = Math.max(0, legacySpots.length - (legacyUsageBySector[assignedSector] || 0));
      const legacyUsedHere = Math.min(availableLegacySpots, Math.max(0, capacity - currentCount));
      const legacyStart = legacyUsageBySector[assignedSector] || 0;
      legacyUsageBySector[assignedSector] = (legacyUsageBySector[assignedSector] || 0) + legacyUsedHere;
      attached.push(...legacySpots.slice(legacyStart, legacyStart + legacyUsedHere).map((spot) => ({ ...spot, floorPlanModuleId: element.id })));
      const missing = Math.max(0, capacity - currentCount - legacyUsedHere);

      for (let index = 0; index < missing; index += 1) {
        const serial = currentCount + index + 1;
        const id = `plan-${element.id}-${serial}`;
        if (existingIds.has(id)) continue;
        existingIds.add(id);
        created.push({
          id,
          spotNumber: `${element.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'MOD'}-${String(serial).padStart(2, '0')}`,
          sector: assignedSector,
          wallPosition: serial,
          maxWeightKg: 30,
          hookType: 'Gancho Vertical c/ Apoio de Pneu',
          qrCodeValue: `CONDO-BIKE-${id.toUpperCase()}`,
          floorPlanModuleId: element.id,
        });
      }
    });

    if (created.length || attached.length) onSyncSpots?.({ created, attached });
    onSave({ ...config, customSectors: allSectors, sectorFloorPlans: { ...(config.sectorFloorPlans || {}), [sector]: { name: planName.trim() || 'Planta geral do bicicletário', modules: elements, updatedAt: new Date().toISOString() } } });
  };
  const startDrag = (event: React.PointerEvent, element: FloorPlanModule) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { id: element.id, offsetX: event.clientX - rect.left - (element.x / 100) * rect.width, offsetY: event.clientY - rect.top - (element.y / 100) * rect.height };
    setSelectedId(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent) => {
    const drag = dragRef.current; const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    setElements((current) => current.map((element) => element.id !== drag.id ? element : { ...element, x: Math.max(0, Math.min(100 - element.width, ((event.clientX - rect.left - drag.offsetX) / rect.width) * 100)), y: Math.max(0, Math.min(100 - element.height, ((event.clientY - rect.top - drag.offsetY) / rect.height) * 100)) }));
  };

  return <div className="p-5 sm:p-6 space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-bold text-slate-900">Planta baixa operacional</h3><p className="mt-1 text-xs text-slate-500">Adicione e arraste módulos, paredes, entradas e corredores para representar o bicicletário completo.</p></div><div className="flex flex-col items-end gap-1"><button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />Salvar planta</button>{validationMessage && <p role="alert" className="max-w-xs text-right text-[10px] font-semibold text-rose-600">{validationMessage}</p>}</div></div><div className="grid max-w-2xl gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600">Planta em edição<select value={sector} onChange={(event) => setSector(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{allSectors.map((item) => <option key={item} value={item}>{config.sectorFloorPlans?.[item]?.name || 'Planta geral do bicicletário'}</option>)}</select></label><div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label="Nome da planta" value={planName} onChange={setPlanName} /></div><button type="button" onClick={createSector} className="mb-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800"><Plus className="h-3.5 w-3.5" />Novo setor</button></div></div><p className="-mt-1 text-[11px] text-slate-500">Uma planta pode reunir módulos de diversos setores ou blocos. Atribua o setor correto dentro de cada módulo.</p><div className="grid gap-4" style={{ gridTemplateColumns: isWideLayout ? 'minmax(0, 1fr) 255px' : 'minmax(0, 1fr)' }}><div ref={canvasRef} onPointerMove={move} onPointerUp={() => { dragRef.current = null; }} className="relative min-h-[420px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100" style={{ minHeight: 420, width: '100%', backgroundImage: 'linear-gradient(#dbe4ee 1px, transparent 1px), linear-gradient(90deg, #dbe4ee 1px, transparent 1px)', backgroundSize: '20px 20px' }}><span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-[10px] font-mono font-bold text-slate-500">REPRESENTAÇÃO DO BICICLETÁRIO</span>{elements.map((element, elementIndex) => { const kind = element.kind || 'bike_module'; const meta = KIND_META[kind]; const code = kind === 'bike_module' ? `M${elements.slice(0, elementIndex + 1).filter((item) => (item.kind || 'bike_module') === 'bike_module').length}` : kind === 'wall' ? `P${elements.slice(0, elementIndex + 1).filter((item) => (item.kind || 'bike_module') === 'wall').length}` : kind === 'column' ? `C${elements.slice(0, elementIndex + 1).filter((item) => (item.kind || 'bike_module') === 'column').length}` : kind === 'entrance' ? `E${elements.slice(0, elementIndex + 1).filter((item) => (item.kind || 'bike_module') === 'entrance').length}` : `R${elements.slice(0, elementIndex + 1).filter((item) => (item.kind || 'bike_module') === 'corridor').length}`; return <button key={element.id} type="button" onPointerDown={(event) => startDrag(event, element)} onClick={() => setSelectedId(element.id)} className={`absolute select-none rounded-lg border-2 p-1.5 text-left shadow-sm touch-none ${meta.color} ${selectedId === element.id ? 'ring-4 ring-slate-900/20' : ''}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%` }}>{kind === 'corridor' ? (element.flowDirection === 'vertical' ? <span className="flex h-full flex-col items-center justify-center gap-2"><ArrowUp className="h-4 w-4 animate-flow-up" /><ArrowDown className="h-4 w-4 animate-flow-down" /></span> : <span className="flex h-full items-center justify-center gap-4"><ArrowLeft className="h-4 w-4 animate-flow-left" /><ArrowRight className="h-4 w-4 animate-flow-right" /></span>) : <span className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-black"><span className="shrink-0">{meta.icon}</span><span>{code}</span></span>}</button>; })}{elements.length === 0 && <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-slate-500">Use os botões ao lado para desenhar a distribuição do bicicletário.</p>}</div><aside style={isWideLayout ? { alignSelf: 'start', position: 'sticky', top: 0 } : undefined} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold text-slate-800">Adicionar à planta</p><div className="mt-3 grid grid-cols-2 gap-2">{(Object.keys(KIND_META) as ElementKind[]).map((kind) => <button key={kind} type="button" onClick={() => addElement(kind)} className="rounded-lg border border-slate-300 bg-white p-2 text-left text-[10px] font-bold text-slate-700 hover:border-indigo-400"><span className="mb-1 flex text-indigo-600">{KIND_META[kind].icon}</span>{KIND_META[kind].label}</button>)}</div>{selected ? <div className="mt-5 space-y-3 border-t border-slate-200 pt-4"><p className="text-xs font-bold text-slate-800">Editar elemento</p><Field label="Nome" value={selected.name} onChange={(name) => updateSelected({ name })} />{(selected.kind || 'bike_module') === 'bike_module' && <div className="grid grid-cols-2 gap-2"><Field label="Vagas" type="number" value={String(selected.spotCapacity)} onChange={(value) => updateSelected({ spotCapacity: Math.max(1, Number(value) || 1) })} /><label className="text-[11px] font-bold text-slate-600">Tipo<select value={selected.style || 'regular'} onChange={(event) => updateSelected({ style: event.target.value as 'regular' | 'protected' })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"><option value="regular">Regular</option><option value="protected">Protegido</option></select></label></div>}{(selected.kind || 'bike_module') === 'bike_module' && <label className="block text-[11px] font-bold text-slate-600">Setor / bloco deste módulo<select value={selected.assignedSector || sector} onChange={(event) => updateSelected({ assignedSector: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs">{allSectors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}{(selected.kind || 'bike_module') === 'corridor' && <label className="block text-[11px] font-bold text-slate-600">Direção do fluxo<select value={selected.flowDirection || 'horizontal'} onChange={(event) => updateSelected({ flowDirection: event.target.value as 'horizontal' | 'vertical' })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs"><option value="horizontal">Horizontal ↔</option><option value="vertical">Vertical ↕</option></select></label>}<div className="grid grid-cols-2 gap-2"><Field label="Largura %" type="number" value={String(Math.round(selected.width))} onChange={(value) => updateSelected({ width: Math.max(3, Math.min(100, Number(value) || 3)) })} /><Field label="Altura %" type="number" value={String(Math.round(selected.height))} onChange={(value) => updateSelected({ height: Math.max(3, Math.min(100, Number(value) || 3)) })} /></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={duplicateSelected} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"><Copy className="h-3.5 w-3.5" />Duplicar elemento</button><button type="button" onClick={() => { setElements((current) => current.filter((element) => element.id !== selected.id)); setSelectedId(null); }} className="inline-flex items-center gap-1 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" />Excluir elemento</button></div></div> : <p className="mt-4 text-xs text-slate-500">Clique em um elemento do quadro para editar.</p>}</aside></div></div>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-[11px] font-bold text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-xs" /></label>; }
