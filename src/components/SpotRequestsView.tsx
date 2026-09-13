import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ClipboardCheck, ListPlus, MapPin, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BicycleSpot, RegisteredBicycle } from '../types';

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'waiting_list';
type RecordType = 'vaga' | 'ocorrencia' | 'vistoria' | 'regularizacao';
export interface SpotRequest { id: string; bicycle_id: string | null; resident_name: string; apartment: string; block: string; resident_phone: string | null; bicycle_description: string | null; notes: string | null; status: RequestStatus; request_type: RecordType; severity: 'normal' | 'attention' | 'urgent'; assigned_spot_id: string | null; created_at: string; decision_note: string | null; }

const recordCopy: Record<RecordType, { label: string; helper: string; action: string }> = {
  vaga: { label: 'Pedido de vaga', helper: 'A bicicleta aguarda uma vaga livre e uma decisão de atribuição.', action: 'Escolher vaga e decidir' },
  ocorrencia: { label: 'Ocorrência', helper: 'Registre uma situação que exige acompanhamento, sem alterar a vaga automaticamente.', action: 'Tratar ocorrência' },
  vistoria: { label: 'Vistoria', helper: 'Registre uma verificação de conservação ou conformidade da bicicleta.', action: 'Registrar vistoria' },
  regularizacao: { label: 'Regularização', helper: 'Registre uma pendência e acompanhe a solução com o morador.', action: 'Abrir regularização' },
};

export function SpotRequestsView({ condominiumId, spots, bikes, canManage, onAllocate, onBackToTasks }: { condominiumId: string | null; spots: BicycleSpot[]; bikes: RegisteredBicycle[]; canManage: boolean; onAllocate: (request: SpotRequest, spot: BicycleSpot) => void; onBackToTasks?: () => void }) {
  const [requests, setRequests] = useState<SpotRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(condominiumId));
  const [selectedBikeId, setSelectedBikeId] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('vaga');
  const [severity, setSeverity] = useState<'normal' | 'attention' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [selectedSpotIds, setSelectedSpotIds] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    if (!supabase || !condominiumId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('spot_requests').select('id, bicycle_id, resident_name, apartment, block, resident_phone, bicycle_description, notes, status, request_type, severity, assigned_spot_id, created_at, decision_note').eq('condominium_id', condominiumId).order('created_at', { ascending: true });
    if (error) setMessage('Não foi possível carregar os registros. Confirme se a migração 008 foi aplicada.');
    else setRequests((data || []) as SpotRequest[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [condominiumId]);

  const freeSpots = useMemo(() => spots.filter((spot) => !spot.currentAllocation), [spots]);
  const selectableBikes = useMemo(() => recordType === 'vaga' ? bikes.filter((bike) => !bike.spotId) : bikes, [bikes, recordType]);
  const openRecords = useMemo(() => requests.filter((request) => request.status === 'pending' || request.status === 'waiting_list'), [requests]);
  const completedRecords = useMemo(() => requests.filter((request) => request.status === 'approved' || request.status === 'rejected'), [requests]);
  const selectedBike = selectableBikes.find((bike) => bike.id === selectedBikeId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const bike = bikes.find((item) => item.id === selectedBikeId);
    if (!supabase || !condominiumId || !bike) { setMessage('Escolha a bicicleta relacionada ao registro antes de salvar.'); return; }
    if (recordType === 'vaga' && requests.some((request) => request.status === 'pending' && request.request_type === 'vaga' && request.bicycle_id === bike.id)) { setMessage('Esta bicicleta já possui um pedido de vaga aguardando decisão.'); return; }
    setSubmitting(true);
    const bicycleDescription = `${bike.brandModel} · ${bike.color} · ${bike.tagNumber}`;
    const { error } = await supabase.from('spot_requests').insert({ condominium_id: condominiumId, bicycle_id: bike.id, resident_name: bike.residentName, apartment: bike.apartment, block: bike.block, resident_phone: bike.residentPhone || null, bicycle_description: bicycleDescription, notes: notes.trim() || null, request_type: recordType, severity });
    if (error) setMessage('Não foi possível salvar o registro.');
    else { setSelectedBikeId(''); setNotes(''); setRecordType('vaga'); setSeverity('normal'); setIsNewRequestOpen(false); setMessage('Registro incluído com sucesso.'); await load(); }
    setSubmitting(false);
  };
  const reject = async (request: SpotRequest) => {
    if (!supabase || !window.confirm('Recusar este pedido de vaga?')) return;
    const { error } = await supabase.from('spot_requests').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('id', request.id);
    if (error) setMessage('Não foi possível atualizar o registro.'); else await load();
  };
  const complete = async (request: SpotRequest) => {
    if (!supabase) return;
    const { error } = await supabase.from('spot_requests').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('id', request.id);
    if (error) setMessage('Não foi possível concluir o registro.'); else await load();
  };
  const approveAllocation = (request: SpotRequest) => {
    const spot = freeSpots.find((item) => item.id === selectedSpotIds[request.id]);
    if (!spot) { setMessage('Escolha uma vaga livre antes de aprovar.'); return; }
    onAllocate(request, spot);
  };
  const convertToOccurrence = async (request: SpotRequest) => {
    if (!supabase || !window.confirm('Converter este registro em ocorrência? A atribuição de vaga será removida e a situação seguirá para Irregularidades.')) return;
    const { error } = await supabase
      .from('spot_requests')
      .update({ request_type: 'ocorrencia', severity: request.severity === 'normal' ? 'attention' : request.severity })
      .eq('id', request.id);
    if (error) setMessage('Não foi possível converter o registro em ocorrência.');
    else {
      setActiveRequestId(null);
      setMessage('Registro convertido em ocorrência e enviado para Irregularidades.');
      await load();
    }
  };

  return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{onBackToTasks && <button type="button" onClick={onBackToTasks} className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"><ArrowLeft className="h-3.5 w-3.5 text-[#e87c0b]" />Voltar para tarefas</button>}<div className="grid gap-6 lg:grid-cols-[360px_1fr]">
    <section className="brand-module self-start"><div className="flex items-center gap-2"><ListPlus className="h-5 w-5 text-amber-600" /><h2 className="font-black">Novo registro</h2></div><p className="mt-1 text-xs text-slate-500">Centralize pedidos de vaga, ocorrências, vistorias e regularizações.</p>{isNewRequestOpen ? <form id="spot-requests-form" onSubmit={submit} className="mt-5 space-y-3"><label className="block text-xs font-bold text-slate-600">Tipo de registro<select value={recordType} onChange={(event) => { setRecordType(event.target.value as RecordType); setSelectedBikeId(''); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500">{(Object.keys(recordCopy) as RecordType[]).map((type) => <option key={type} value={type}>{recordCopy[type].label}</option>)}</select></label><p className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">{recordCopy[recordType].helper}</p><label className="block text-xs font-bold text-slate-600">Bicicleta relacionada<select required value={selectedBikeId} onChange={(event) => setSelectedBikeId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"><option value="">Selecione a bicicleta</option>{selectableBikes.map((bike) => <option key={bike.id} value={bike.id}>{bike.residentName} · Apto {bike.apartment}{bike.block ? ` · ${bike.block}` : ''} · {bike.brandModel}</option>)}</select></label>{selectedBike && <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700"><p className="font-bold">{selectedBike.residentName} · Apto {selectedBike.apartment}{selectedBike.block ? ` / ${selectedBike.block}` : ''}</p><p className="mt-1">{selectedBike.brandModel} · {selectedBike.color} · {selectedBike.tagNumber}</p></div>}{recordType !== 'vaga' && <label className="block text-xs font-bold text-slate-600">Prioridade<select value={severity} onChange={(event) => setSeverity(event.target.value as 'normal' | 'attention' | 'urgent')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500"><option value="normal">Normal</option><option value="attention">Requer atenção</option><option value="urgent">Urgente</option></select></label>}<Input label={recordType === 'vaga' ? 'Preferência de localização (opcional)' : 'Descrição do registro'} value={notes} onChange={setNotes} required={recordType !== 'vaga'} placeholder={recordType === 'vaga' ? 'Ex.: próximo ao elevador' : 'Descreva o que foi observado'} /><button disabled={!selectableBikes.length || submitting} className="w-full rounded-xl bg-[#F19A00] px-4 py-3 text-xs font-black text-[#0d1733] hover:bg-[#ffad1b] disabled:opacity-50">{submitting ? 'Salvando…' : 'Salvar registro'}</button>{selectableBikes.length === 0 && <p className="text-xs text-slate-500">Não há bicicletas disponíveis para este tipo de registro.</p>}</form> : <button type="button" onClick={() => setIsNewRequestOpen(true)} className="mt-5 w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black text-[#b96500] transition hover:bg-orange-100"><ListPlus className="mr-1 inline h-3.5 w-3.5" />Novo registro</button>}{message && <p className="mt-3 text-xs text-slate-600">{message}</p>}</section>
    <section className="brand-module"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#e87c0b]">Central operacional</p><h1 className="mt-1 text-lg font-black">Registros e solicitações</h1><p className="mt-1 text-xs text-slate-500">Atribua uma vaga somente para pedidos de vaga. Ocorrências e vistorias têm seu próprio fluxo.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50">Atualizar</button></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><Summary label="Em aberto" value={openRecords.length} tone="amber" /><Summary label="Vagas livres" value={freeSpots.length} tone="emerald" /><Summary label="Concluídos" value={completedRecords.length} tone="slate" /></div>{loading ? <p className="py-12 text-center text-sm text-slate-500">Carregando registros…</p> : <div className="mt-5 space-y-3">{openRecords.map((request) => <RecordCard key={request.id} request={request} active={activeRequestId === request.id} canManage={canManage} freeSpots={freeSpots} selectedSpotId={selectedSpotIds[request.id] || ''} onToggle={() => setActiveRequestId((current) => current === request.id ? null : request.id)} onSpotChange={(spotId) => setSelectedSpotIds((current) => ({ ...current, [request.id]: spotId }))} onApprove={() => approveAllocation(request)} onReject={() => void reject(request)} onComplete={() => void complete(request)} onConvertToOccurrence={() => void convertToOccurrence(request)} />)}{openRecords.length === 0 && <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 py-12 text-center text-sm text-emerald-800"><Check className="mx-auto mb-2 h-6 w-6" />Nenhum registro aguarda tratamento.</div>}<button type="button" onClick={() => setShowHistory((current) => !current)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-600">Histórico de decisões <span className="inline-flex items-center gap-2">{completedRecords.length}<ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} /></span></button>{showHistory && <div className="space-y-2">{completedRecords.slice(0, 8).map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><span className="text-xs font-bold text-[#0d1733]">{recordCopy[request.request_type || 'vaga'].label} · {request.resident_name} <small className="font-mono text-slate-500">Apto {request.apartment}</small></span><Status status={request.status} /></div>)}{completedRecords.length === 0 && <p className="py-3 text-center text-xs text-slate-500">Ainda não há decisões registradas.</p>}</div>}</div>}</section>
  </div></div>;
}

function looksLikeOccurrence(notes: string | null) {
  return /\b(avistad[oa]?|encontrad[oa]?|encostad[oa]?|abandonad[oa]?|irregular|sem travar|obstru|rampa da garagem)\b/i.test(notes || '');
}

function RecordCard({ request, active, canManage, freeSpots, selectedSpotId, onToggle, onSpotChange, onApprove, onReject, onComplete, onConvertToOccurrence }: { request: SpotRequest; active: boolean; canManage: boolean; freeSpots: BicycleSpot[]; selectedSpotId: string; onToggle: () => void; onSpotChange: (spotId: string) => void; onApprove: () => void; onReject: () => void; onComplete: () => void; onConvertToOccurrence: () => void }) {
  const type = request.request_type || 'vaga';
  const copy = recordCopy[type];
  const isAllocation = type === 'vaga';
  const severityStyle = request.severity === 'urgent' ? 'bg-rose-100 text-rose-700' : request.severity === 'attention' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
  const needsReclassification = isAllocation && looksLikeOccurrence(request.notes);
  return <article className={`rounded-2xl border p-4 ${needsReclassification ? 'border-rose-200 bg-rose-50/40' : 'border-orange-100 bg-[#fffaf2]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-white px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#b96500]">{copy.label}</span>{!isAllocation && <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${severityStyle}`}>{request.severity === 'urgent' ? 'Urgente' : request.severity === 'attention' ? 'Atenção' : 'Normal'}</span>}</div><p className="mt-2 font-bold">{request.resident_name} <span className="font-mono text-xs text-slate-500">· Apto {request.apartment}{request.block ? ` / ${request.block}` : ''}</span></p><p className="mt-1 text-xs text-slate-500">{request.bicycle_description || 'Bicicleta não detalhada'}{request.resident_phone ? ` · ${request.resident_phone}` : ''}</p>{request.notes && <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">{needsReclassification ? <AlertTriangle className="h-3 w-3 text-rose-600" /> : isAllocation ? <MapPin className="h-3 w-3 text-[#e87c0b]" /> : null}{needsReclassification ? `Texto parece uma ocorrência: ${request.notes}` : isAllocation ? `Preferência de local: ${request.notes}` : request.notes}</p>}</div><Status status={request.status} /></div>{needsReclassification && <div className="mt-3 rounded-lg border border-rose-200 bg-white/80 p-3 text-[10px] text-rose-800"><strong>Este pedido não deve atribuir uma vaga.</strong> O relato indica uma situação operacional. {canManage && <button type="button" onClick={onConvertToOccurrence} className="ml-1 font-black underline underline-offset-2">Converter em ocorrência</button>}</div>}{canManage && <button type="button" onClick={onToggle} className="mt-3 text-[10px] font-black text-[#b96500]">{active ? 'Fechar tratamento' : needsReclassification ? 'Revisar classificação' : copy.action}</button>}{canManage && active && <div className="request-allocation-panel mt-4 border-t border-orange-100 pt-3">{isAllocation && !needsReclassification ? <><p className="text-[10px] font-bold text-slate-600">Escolha a vaga livre que será atribuída. A preferência é apenas uma referência; a decisão é da gestão.</p><div className="mt-3 flex flex-wrap gap-2"><select aria-label={`Vaga para ${request.resident_name}`} value={selectedSpotId} onChange={(event) => onSpotChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"><option value="">Escolha uma vaga livre</option>{freeSpots.map((spot) => <option key={spot.id} value={spot.id}>{spot.spotNumber} · {spot.sector}</option>)}</select><button type="button" disabled={freeSpots.length === 0} onClick={onApprove} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Aprovar e atribuir</button><button type="button" onClick={onReject} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Recusar</button></div>{freeSpots.length === 0 && <p className="mt-2 text-[10px] font-bold text-rose-600">Não há vagas livres para atribuição neste momento.</p>}</> : needsReclassification ? <p className="text-[10px] font-bold text-rose-700">Converta o registro em ocorrência para tratá-lo na área de Irregularidades.</p> : <><p className="text-[10px] font-bold text-slate-600">Este registro não altera a ocupação de vagas. Conclua quando a ação descrita tiver sido realizada.</p><button type="button" onClick={onComplete} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#0d1733] px-3 py-2 text-xs font-bold text-white"><ClipboardCheck className="h-3.5 w-3.5" />Concluir registro</button></>}</div>}</article>;
}

function Summary({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'emerald' | 'slate' }) { const colors = { amber: 'border-amber-100 bg-amber-50 text-amber-800', emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800', slate: 'border-slate-200 bg-slate-50 text-slate-700' }; return <div className={`rounded-xl border px-3 py-2 ${colors[tone]}`}><strong className="text-lg font-black">{value}</strong><span className="ml-2 text-[10px] font-bold">{label}</span></div>; }
function Input({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }) { return <label className="block text-xs font-bold text-slate-600">{label}<input required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500" /></label>; }
function Status({ status }: { status: RequestStatus }) { const names = { pending: 'Em aberto', approved: 'Concluída', rejected: 'Recusada', waiting_list: 'Em espera' }; const styles = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-800', waiting_list: 'bg-slate-100 text-slate-700' }; return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${styles[status]}`}>{names[status]}</span>; }
