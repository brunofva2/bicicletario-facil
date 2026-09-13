import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('A nova senha deve ter pelo menos 8 caracteres.');
    if (password !== confirmation) return setError('As senhas não coincidem.');
    const { error: updateError } = await supabase?.auth.updateUser({ password }) || {};
    if (updateError) return setError('Não foi possível atualizar a senha. Solicite um novo link.');
    setMessage('Senha atualizada com sucesso. Você já pode entrar no painel.');
  };

  const backToLogin = async () => {
    await supabase?.auth.signOut();
    window.location.assign('/');
  };

  return <main className="min-h-screen grid place-items-center bg-slate-950 p-4"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 text-slate-100 shadow-2xl"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#C87612] p-3 text-slate-950"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-xs font-mono uppercase tracking-[.2em] text-[#e6a23c]">Bicicletário Fácil</p><h1 className="text-xl font-black">Definir nova senha</h1></div></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-bold text-slate-300">Nova senha<div className="relative mt-1"><KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#C87612]" /></div></label><label className="block text-xs font-bold text-slate-300">Confirmar nova senha<input required type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-[#C87612]" /></label>{error && <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-200">{error}</p>}{message && <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-xs text-emerald-200">{message}</p>}<button className="w-full rounded-lg bg-[#C87612] px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-[#e6a23c]">Salvar nova senha</button>{message && <button type="button" onClick={() => void backToLogin()} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800">Voltar para o login</button>}</form></section></main>;
}
