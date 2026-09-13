import React, { useEffect, useState } from 'react';
import { Bike, ChevronLeft, ChevronRight, ClipboardCheck, QrCode, ShieldAlert, TriangleAlert } from 'lucide-react';

const slides = [
  { title: 'Mapa de vagas em tempo real', text: 'Veja rapidamente o que está livre, ocupado ou precisa de atenção.', detail: 'Filtre por setor, localize uma vaga pelo número e abra os dados da bicicleta com um clique.', icon: Bike, kind: 'map' },
  { title: 'Solicitações sem papel', text: 'A portaria registra. O síndico aprova e escolhe a vaga.', detail: 'A solicitação já traz morador e bicicleta cadastrada, evitando preenchimento duplicado e erros.', icon: ClipboardCheck, kind: 'requests' },
  { title: 'Consulta rápida por QR Code', text: 'Identifique uma vaga na hora, com informações seguras.', detail: 'Quem escaneia vê o número, local e situação da vaga — sem expor os dados pessoais do morador.', icon: QrCode, kind: 'qr' },
  { title: 'Reavaliação contra abandono', text: 'Acompanhe bicicletas antigas e mantenha o espaço sempre bem utilizado.', detail: 'O sistema destaca cadastros antigos para o síndico confirmar se a bicicleta continua ativa antes de tomar qualquer providência.', icon: ShieldAlert, kind: 'review' },
  { title: 'Reporte rápido da bicicleta', text: 'Registre uma ocorrência direto do cadastro e acione a administração.', detail: 'A portaria pode reportar abandono, avaria ou necessidade de contato, mantendo o histórico ligado à bicicleta correta.', icon: TriangleAlert, kind: 'report' },
] as const;

export function LoginFeatureCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused) return; const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5200); return () => window.clearInterval(timer); }, [paused]);
  const slide = slides[active];
  const Icon = slide.icon;
  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);
  return <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="group relative mt-5 overflow-hidden rounded-2xl border border-white/35 bg-[#0d1733]/25 p-3 shadow-inner backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-[#0d1733]/35 hover:shadow-2xl sm:mt-7 sm:p-4">
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
    <div className="relative min-h-56 transition-all duration-300 group-hover:min-h-64 sm:min-h-60 sm:group-hover:min-h-64">
      <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.15em] text-white/90"><Icon className="h-3.5 w-3.5" />Demonstração</span><div className="flex shrink-0 items-center gap-2"><span className="font-mono text-[10px] text-white/75">0{active + 1} / 0{slides.length}</span><div className="flex gap-1">{slides.map((item, index) => <button key={item.kind} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${active === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45'}`} aria-label={`Ver ${item.title}`} />)}</div></div></div>
      <div className="mt-3 rounded-xl border border-white/20 bg-white/95 p-3 text-[#0d1733] shadow-lg">
        {slide.kind === 'map' && <MiniMap />}
        {slide.kind === 'requests' && <MiniRequests />}
        {slide.kind === 'qr' && <MiniQr />}
        {slide.kind === 'review' && <MiniReview />}
        {slide.kind === 'report' && <MiniReport />}
      </div>
      <div className="mt-3 pr-10"><p className="text-sm font-black text-white">{slide.title}</p><p className="mt-0.5 text-xs leading-relaxed text-orange-50/90">{slide.text}</p></div>
      <div className="mt-2 max-h-0 overflow-hidden border-white/20 pr-20 text-[11px] leading-relaxed text-white/90 opacity-0 transition-all duration-300 group-hover:max-h-12 group-hover:border-t group-hover:pt-2 group-hover:opacity-100">{slide.detail}</div>
      <button type="button" onClick={() => move(-1)} className="absolute bottom-0 right-8 grid h-7 w-7 place-items-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20" aria-label="Função anterior"><ChevronLeft className="h-4 w-4" /></button>
      <button type="button" onClick={() => move(1)} className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20" aria-label="Próxima função"><ChevronRight className="h-4 w-4" /></button>
    </div>
  </div>;
}

function MiniMap() { return <div className="animate-fadeIn"><div className="flex items-center justify-between text-[9px] font-bold"><span>SETOR A · PAREDE NORTE</span><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">12 livres</span></div><div className="mt-3 grid grid-cols-8 gap-1.5">{Array.from({ length: 16 }, (_, index) => <span key={index} className={`grid aspect-square place-items-center rounded-md border text-[8px] font-black ${[1, 4, 9, 13].includes(index) ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : index === 7 ? 'border-amber-300 bg-amber-100 text-amber-700' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>{index + 1}</span>)}</div></div>; }
function MiniRequests() { return <div className="animate-fadeIn"><p className="text-[9px] font-bold text-slate-500">SOLICITAÇÕES PENDENTES</p><div className="mt-2 space-y-1.5">{[['Apto 102', 'Dahon Mariner D8'], ['Apto 204', 'Caloi City Tour']].map(([apartment, bike], index) => <div key={apartment} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-[9px]"><div><p className="font-black">{apartment}</p><p className="text-slate-500">{bike}</p></div><span className={index === 0 ? 'rounded bg-emerald-600 px-1.5 py-1 font-bold text-white' : 'rounded bg-[#F19A00] px-1.5 py-1 font-bold text-[#0d1733]'}>{index === 0 ? 'Aprovada' : 'Analisar'}</span></div>)}</div></div>; }
function MiniQr() { return <div className="animate-fadeIn flex items-center gap-4"><div className="grid h-24 w-24 grid-cols-5 gap-1 rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">{Array.from({ length: 25 }, (_, index) => <span key={index} className={`${[0, 1, 2, 5, 7, 10, 12, 14, 17, 20, 21, 22, 24].includes(index) ? 'bg-[#0d1733]' : 'bg-slate-100'}`} />)}</div><div><p className="text-[9px] font-bold text-slate-500">CONSULTA DE VAGA</p><p className="mt-1 text-lg font-black">S-11</p><span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">Livre agora</span><p className="mt-2 text-[9px] text-slate-500">Setor A · Módulo 2</p></div></div>; }
function MiniReview() { return <div className="animate-fadeIn"><div className="flex items-center justify-between"><p className="text-[9px] font-bold text-slate-500">REAVALIAÇÃO PROGRAMADA</p><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700">2 PENDENTES</span></div><div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5"><p className="text-[10px] font-black">Caloi City Tour · Apto 203</p><p className="mt-1 text-[9px] text-slate-600">Cadastro há 2 anos e 3 meses</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100"><span className="block h-full w-4/5 rounded-full bg-[#F19A00]" /></div></div></div>; }
function MiniReport() { return <div className="animate-fadeIn"><p className="text-[9px] font-bold text-slate-500">REGISTRO DA BICICLETA</p><div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 p-2"><div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-[#0d1733]"><Bike className="h-5 w-5" /></div><div className="flex-1"><p className="text-[10px] font-black">Mountain Bike Azul</p><p className="text-[9px] text-slate-500">Apto 103 · Vaga S-06</p></div></div><button type="button" className="mt-2 w-full rounded-md bg-[#0d1733] py-1.5 text-[9px] font-bold text-white">Reportar à administração</button></div>; }
