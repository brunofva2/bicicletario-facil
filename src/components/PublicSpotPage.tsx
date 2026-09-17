import React, { useEffect, useState } from 'react';
import { Bike, CheckCircle2, LoaderCircle, Lock, LogIn, ShieldCheck, TriangleAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BicicletarioFacilLogo } from './BicicletarioFacilLogo';
import type { PublicSpotReference } from '../utils/publicSpotRoute';

interface PublicSpotResult {
  condominium_name: string;
  spot_number: string;
  sector: string;
  hook_type: string;
  status: 'livre' | 'ocupada';
  bike_photo_url?: string | null;
  bike_model?: string | null;
  bike_color?: string | null;
  bike_tag?: string | null;
}

export function PublicSpotPage({ reference }: { reference: PublicSpotReference }) {
  const [data, setData] = useState<PublicSpotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const isValidSlug = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference.value);
      const isValidLegacyReference = reference.value.length > 0 && reference.value.length <= 200;
      if (!supabase || (reference.kind === 'slug' ? !isValidSlug : !isValidLegacyReference)) {
        setError('O código desta vaga é inválido ou não está disponível.');
        setLoading(false);
        return;
      }
      const { data: rows, error: requestError } = reference.kind === 'slug'
        ? await supabase.rpc('get_public_spot', { p_slug: reference.value })
        : await supabase.rpc('get_public_spot_legacy', { p_identifier: reference.value });
      if (!active) return;
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (requestError || !row) setError('Esta vaga não foi encontrada ou não faz mais parte da planta atual.');
      else setData(row as PublicSpotResult);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [reference.kind, reference.value]);

  const openLogin = () => window.location.assign(`${window.location.origin}${window.location.pathname}`);
  return <main className="min-h-screen bg-[#f8f4ec] p-4 text-[#0d1733] sm:grid sm:place-items-center">
    <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><BicicletarioFacilLogo variant="horizontal" size="sm" /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">Consulta pública</span></header>
      <div className="p-5 sm:p-7">
        {loading && <div className="grid min-h-64 place-items-center text-center"><div><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" /><p className="mt-3 text-sm font-bold">Consultando identificação da vaga…</p></div></div>}
        {!loading && error && <div className="grid min-h-64 place-items-center text-center"><div><TriangleAlert className="mx-auto h-8 w-8 text-rose-500" /><h1 className="mt-3 text-lg font-black">Consulta indisponível</h1><p className="mt-2 text-sm leading-relaxed text-slate-600">{error}</p></div></div>}
        {!loading && data && <div className="space-y-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.15em] text-orange-600">{data.condominium_name}</p><h1 className="mt-1 text-2xl font-black">Vaga {data.spot_number}</h1><p className="mt-1 text-sm text-slate-600">{data.sector} · {data.hook_type}</p></div>
          <div className={`rounded-2xl border p-4 ${data.status === 'livre' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><div className="flex items-center gap-2">{data.status === 'livre' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-slate-700" />}<strong className="text-sm">{data.status === 'livre' ? 'Vaga livre no momento' : 'Vaga ocupada e autorizada'}</strong></div><p className="mt-2 text-xs leading-relaxed text-slate-600">{data.status === 'livre' ? 'A disponibilidade precisa ser confirmada pela administração antes do uso.' : 'A identidade do morador e da unidade permanece protegida nesta consulta.'}</p></div>
          {data.status === 'ocupada' && <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-2"><Bike className="h-4 w-4 text-orange-600" /><strong className="text-sm">Bicicleta cadastrada</strong></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Modelo</dt><dd className="mt-1 font-bold">{data.bike_model || 'Não informado'}</dd></div><div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Cor</dt><dd className="mt-1 font-bold">{data.bike_color || 'Não informada'}</dd></div>{data.bike_tag && <div className="col-span-2 rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">Selo</dt><dd className="mt-1 font-bold">{data.bike_tag}</dd></div>}</dl></div>}
          <div className="flex items-start gap-2 rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs leading-relaxed text-slate-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /><p>Para solicitar uso, relatar divergência ou regularizar uma bicicleta, procure a administração do condomínio.</p></div>
        </div>}
      </div>
      <footer className="border-t border-slate-200 bg-slate-50 p-4"><button type="button" onClick={openLogin} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d1733] px-4 py-3 text-sm font-black text-white"><LogIn className="h-4 w-4 text-orange-400" />Acessar o sistema</button></footer>
    </section>
  </main>;
}
