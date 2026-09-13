import React, { useEffect, useState } from 'react';
import { Building2, Plus, Users, MapPin, LogOut, LoaderCircle, Pencil, Save, X, UserRoundCog } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Condominium {
  id: string;
  name: string;
  code: string;
  city: string | null;
  block_count: number;
  apartment_count: number;
  status: 'active' | 'pilot' | 'inactive';
}

interface PendingUser { id: string; full_name: string | null; email: string | null; }
interface CondominiumUser extends PendingUser { role: 'syndic' | 'staff'; condominium_id: string; }

export function NobrutecConsole({ onSignOut, onManage }: { onSignOut: () => Promise<void>; onManage: (context: { condominiumId: string; condominiumName: string; role: 'syndic' | 'staff' }) => void }) {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<Condominium | null>(null);
  const [condominiumUsers, setCondominiumUsers] = useState<CondominiumUser[]>([]);
  const [editingCondominium, setEditingCondominium] = useState(false);
  const [editingForm, setEditingForm] = useState({ name: '', code: '', city: '', blockCount: '1', apartmentCount: '1', status: 'pilot' as Condominium['status'] });
  const [assignments, setAssignments] = useState<Record<string, { condominiumId: string; role: 'syndic' | 'staff' }>>({});
  const [form, setForm] = useState({ name: '', code: '', city: '', blockCount: '1', apartmentCount: '1' });

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: requestError } = await supabase
      .from('condominiums')
      .select('id, name, code, city, block_count, apartment_count, status')
      .order('created_at', { ascending: false });
    if (requestError) setError('Não foi possível carregar a carteira de condomínios.');
    else setCondominiums((data || []) as Condominium[]);
    const { data: pending } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'pending').order('created_at');
    setPendingUsers((pending || []) as PendingUser[]);
    setLoading(false);
  };

  const approve = async (userId: string) => {
    const assignment = assignments[userId];
    if (!supabase || !assignment?.condominiumId) return;
    const { error: updateError } = await supabase.from('profiles').update({ condominium_id: assignment.condominiumId, role: assignment.role }).eq('id', userId);
    if (updateError) setError('Não foi possível liberar este usuário.');
    else await load();
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const loadCondominiumUsers = async () => {
      if (!supabase || !selectedCondominium) {
        setCondominiumUsers([]);
        return;
      }
      const { data, error: requestError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, condominium_id')
        .eq('condominium_id', selectedCondominium.id)
        .in('role', ['syndic', 'staff'])
        .order('full_name');
      if (requestError) setError('Não foi possível carregar os usuários deste condomínio.');
      else setCondominiumUsers((data || []) as CondominiumUser[]);
    };
    void loadCondominiumUsers();
  }, [selectedCondominium]);

  const openCondominiumManagement = (condo: Condominium) => {
    setError(null);
    setSelectedCondominium(condo);
    setEditingCondominium(false);
    setEditingForm({ name: condo.name, code: condo.code, city: condo.city || '', blockCount: String(condo.block_count), apartmentCount: String(condo.apartment_count), status: condo.status });
  };

  const saveCondominium = async () => {
    if (!supabase || !selectedCondominium) return;
    setSaving(true);
    setError(null);
    const updates = { name: editingForm.name.trim(), code: editingForm.code.trim().toUpperCase(), city: editingForm.city.trim() || null, block_count: Number(editingForm.blockCount), apartment_count: Number(editingForm.apartmentCount), status: editingForm.status };
    const { error: updateError } = await supabase.from('condominiums').update(updates).eq('id', selectedCondominium.id);
    if (updateError) setError(updateError.code === '23505' ? 'Esse código de condomínio já está em uso.' : 'Não foi possível salvar as alterações.');
    else {
      const updated = { ...selectedCondominium, ...updates };
      setSelectedCondominium(updated);
      setEditingCondominium(false);
      await load();
    }
    setSaving(false);
  };

  const changeUserRole = async (user: CondominiumUser, role: 'syndic' | 'staff') => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (updateError) setError('Não foi possível alterar o perfil deste usuário.');
    else setCondominiumUsers((users) => users.map((item) => item.id === user.id ? { ...item, role } : item));
  };

  const revokeAccess = async (user: CondominiumUser) => {
    if (!supabase || !window.confirm(`Remover o acesso de ${user.full_name || user.email || 'este usuário'}?`)) return;
    const { error: updateError } = await supabase.from('profiles').update({ role: 'pending', condominium_id: null }).eq('id', user.id);
    if (updateError) setError('Não foi possível remover este acesso.');
    else setCondominiumUsers((users) => users.filter((item) => item.id !== user.id));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('condominiums').insert({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      city: form.city.trim() || null,
      block_count: Number(form.blockCount),
      apartment_count: Number(form.apartmentCount),
      status: 'pilot',
    });
    if (insertError) setError(insertError.code === '23505' ? 'Esse código de condomínio já existe.' : 'Não foi possível criar o condomínio.');
    else {
      setForm({ name: '', code: '', city: '', blockCount: '1', apartmentCount: '1' });
      await load();
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div><p className="text-[11px] font-mono font-bold uppercase tracking-[.22em] text-[#e6a23c]">Nobrutec</p><h1 className="text-xl font-black">Central Bicicletário Fácil</h1></div>
          <button onClick={() => void onSignOut()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-800"><LogOut className="h-4 w-4" />Sair</button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
          <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-[#e6a23c]" /><h2 className="font-bold">Novo condomínio</h2></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Crie o ambiente inicial. Depois, convide o síndico para concluir a implantação.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <Field label="Nome do condomínio" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
            <Field label="Código interno" value={form.code} onChange={(code) => setForm({ ...form, code })} placeholder="Ex.: RES-ALAMEDA-001" required />
            <Field label="Cidade / UF" value={form.city} onChange={(city) => setForm({ ...form, city })} placeholder="Ex.: São Paulo/SP" />
            <div className="grid grid-cols-2 gap-3"><Field label="Blocos" value={form.blockCount} onChange={(blockCount) => setForm({ ...form, blockCount })} type="number" required /><Field label="Apartamentos" value={form.apartmentCount} onChange={(apartmentCount) => setForm({ ...form, apartmentCount })} type="number" required /></div>
            {error && <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-2.5 text-xs text-rose-200">{error}</p>}
            <button disabled={saving} className="w-full rounded-lg bg-[#C87612] px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-[#e6a23c] disabled:opacity-50">{saving ? 'Criando…' : 'Criar condomínio piloto'}</button>
          </form>
        </section>
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl"><div className="flex items-center justify-between"><div><h2 className="font-bold">Carteira de condomínios</h2><p className="mt-1 text-xs text-slate-400">Ambientes administrados pela Nobrutec</p></div><Building2 className="h-6 w-6 text-[#e6a23c]" /></div>
          {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</div> : <div className="mt-5 space-y-3">{condominiums.map((condo) => <article key={condo.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{condo.name}</h3><p className="mt-1 font-mono text-xs text-slate-400">{condo.code}</p></div><span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">{condo.status}</span></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300"><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-500" />{condo.block_count} blocos</span><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-500" />{condo.apartment_count} apartamentos</span>{condo.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-500" />{condo.city}</span>}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openCondominiumManagement(condo)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/10"><Pencil className="h-3.5 w-3.5" />Administrar cadastro</button><button onClick={() => onManage({ condominiumId: condo.id, condominiumName: condo.name, role: 'syndic' })} className="rounded-lg bg-[#C87612] px-3 py-2 text-xs font-black text-slate-950 hover:bg-[#e6a23c]">Gerenciar como síndico</button><button onClick={() => onManage({ condominiumId: condo.id, condominiumName: condo.name, role: 'staff' })} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">Testar como portaria</button></div></article>)}{condominiums.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhum condomínio cadastrado.</p>}</div>}
        </section>
        {selectedCondominium && <section className="rounded-2xl border border-amber-400/40 bg-slate-900 p-5 shadow-xl lg:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-mono font-bold uppercase tracking-[.18em] text-amber-300">Gerenciamento do condomínio</p><h2 className="mt-1 text-lg font-black">{selectedCondominium.name}</h2></div><button type="button" onClick={() => setSelectedCondominium(null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-800"><X className="h-3.5 w-3.5" />Fechar</button></div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">Dados e status</h3>{!editingCondominium ? <button type="button" onClick={() => setEditingCondominium(true)} className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200"><Pencil className="h-3.5 w-3.5" />Editar</button> : <div className="flex gap-2"><button type="button" onClick={() => setEditingCondominium(false)} className="text-xs text-slate-400 hover:text-white">Cancelar</button><button type="button" disabled={saving} onClick={() => void saveCondominium()} className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Salvar</button></div>}</div>{editingCondominium ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Nome" value={editingForm.name} onChange={(name) => setEditingForm({ ...editingForm, name })} required /><Field label="Código" value={editingForm.code} onChange={(code) => setEditingForm({ ...editingForm, code })} required /><Field label="Cidade / UF" value={editingForm.city} onChange={(city) => setEditingForm({ ...editingForm, city })} /><Field label="Status" value={editingForm.status} onChange={(status) => setEditingForm({ ...editingForm, status: status as Condominium['status'] })} /><Field label="Blocos" value={editingForm.blockCount} onChange={(blockCount) => setEditingForm({ ...editingForm, blockCount })} type="number" required /><Field label="Apartamentos" value={editingForm.apartmentCount} onChange={(apartmentCount) => setEditingForm({ ...editingForm, apartmentCount })} type="number" required /></div> : <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Código</dt><dd className="font-mono text-slate-200">{selectedCondominium.code}</dd></div><div><dt className="text-xs text-slate-500">Status</dt><dd className="capitalize text-slate-200">{selectedCondominium.status}</dd></div><div><dt className="text-xs text-slate-500">Estrutura</dt><dd className="text-slate-200">{selectedCondominium.block_count} blocos · {selectedCondominium.apartment_count} aptos</dd></div><div><dt className="text-xs text-slate-500">Cidade</dt><dd className="text-slate-200">{selectedCondominium.city || 'Não informada'}</dd></div></dl>}</div><div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"><div className="flex items-center gap-2"><UserRoundCog className="h-4 w-4 text-amber-300" /><h3 className="font-bold">Equipe com acesso</h3></div><div className="mt-4 space-y-2">{condominiumUsers.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3"><div><p className="text-sm font-bold">{user.full_name || 'Usuário sem nome'}</p><p className="text-xs text-slate-400">{user.email || 'E-mail não informado'}</p></div><div className="flex items-center gap-2"><select value={user.role} onChange={(event) => void changeUserRole(user, event.target.value as 'syndic' | 'staff')} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"><option value="syndic">Síndico</option><option value="staff">Portaria</option></select><button type="button" onClick={() => void revokeAccess(user)} className="rounded-lg border border-rose-900 px-2 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-950/40">Remover</button></div></div>)}{condominiumUsers.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">Nenhum usuário liberado para este condomínio.</p>}</div></div></div></section>}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl lg:col-span-2"><h2 className="font-bold">Solicitações de acesso</h2><p className="mt-1 text-xs text-slate-400">Vincule usuários cadastrados ao condomínio e defina o perfil.</p><div className="mt-4 space-y-3">{pendingUsers.map((user) => { const assignment = assignments[user.id] || { condominiumId: '', role: 'staff' as const }; return <div key={user.id} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-[1fr_1.2fr_130px_auto]"><div><p className="text-sm font-bold">{user.full_name || 'Usuário sem nome'}</p><p className="text-xs text-slate-400">{user.email || 'E-mail não informado'}</p></div><select value={assignment.condominiumId} onChange={(e) => setAssignments({ ...assignments, [user.id]: { ...assignment, condominiumId: e.target.value } })} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"><option value="">Selecione o condomínio</option>{condominiums.map((condo) => <option key={condo.id} value={condo.id}>{condo.name}</option>)}</select><select value={assignment.role} onChange={(e) => setAssignments({ ...assignments, [user.id]: { ...assignment, role: e.target.value as 'syndic' | 'staff' } })} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"><option value="staff">Portaria / Zelador</option><option value="syndic">Síndico / Administradora</option></select><button disabled={!assignment.condominiumId} onClick={() => void approve(user.id)} className="rounded-lg bg-[#C87612] px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Liberar</button></div>; })}{pendingUsers.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">Não há solicitações pendentes.</p>}</div></section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-xs font-bold text-slate-300">{label}<input required={required} min={type === 'number' ? 1 : undefined} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#C87612]" /></label>;
}
