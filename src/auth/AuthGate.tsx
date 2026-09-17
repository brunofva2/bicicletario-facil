import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isCloudConfigured, supabase } from '../lib/supabase';
import { LoginScreen } from './LoginScreen';
import { NobrutecConsole } from '../admin/NobrutecConsole';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { PublicSpotPage } from '../components/PublicSpotPage';
import { getPublicSpotReference } from '../utils/publicSpotRoute';

export type AppRole = 'nobrutec_admin' | 'syndic' | 'staff' | 'pending';

interface Profile {
  full_name: string;
  role: AppRole;
  condominium_id: string | null;
}

interface AuthContextValue {
  profile: Profile | null;
  userId: string | null;
  isCloudMode: boolean;
  activeCondominiumId: string | null;
  effectiveRole: AppRole | null;
  isSupportMode: boolean;
  isVisitor: boolean;
  signOut: () => Promise<void>;
  exitSupportMode: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  userId: null,
  isCloudMode: false,
  activeCondominiumId: null,
  effectiveRole: null,
  isSupportMode: false,
  isVisitor: false,
  signOut: async () => undefined,
  exitSupportMode: () => undefined,
});

export const useAuth = () => useContext(AuthContext);

export function AuthGate({ children }: { children: React.ReactNode }) {
  // A consulta da placa precisa ser resolvida antes de qualquer decisão de
  // autenticação. Isso também mantém funcionais QR codes emitidos no piloto.
  const publicSpotReference = getPublicSpotReference(window.location.search);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isCloudConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => window.location.pathname === '/auth/reset-password');
  const [supportContext, setSupportContext] = useState<{ condominiumId: string; condominiumName: string; role: 'syndic' | 'staff' } | null>(null);
  const [isVisitor, setIsVisitor] = useState(() => sessionStorage.getItem('bicicletario_visitor_mode') === 'true');

  const enterVisitorMode = () => {
    sessionStorage.setItem('bicicletario_visitor_mode', 'true');
    setIsVisitor(true);
  };

  const exitVisitorMode = () => {
    sessionStorage.removeItem('bicicletario_visitor_mode');
    setIsVisitor(false);
  };

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let profileRequest = 0;
    let currentUserId: string | null = null;

    const loadProfile = async (currentSession: Session | null) => {
      if (!active) return;
      const request = ++profileRequest;
      const nextUserId = currentSession?.user.id ?? null;
      if (currentUserId !== nextUserId) {
        currentUserId = nextUserId;
        setProfile(null);
        setSupportContext(null);
        setLoading(Boolean(currentSession));
      }
      setSession(currentSession);
      if (!currentSession) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, condominium_id')
        .eq('id', currentSession.user.id)
        .maybeSingle();
      if (active && request === profileRequest) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      void loadProfile(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      userId: isVisitor ? null : session?.user.id ?? null,
      isCloudMode: isCloudConfigured,
      activeCondominiumId: isVisitor ? null : supportContext?.condominiumId ?? profile?.condominium_id ?? null,
      effectiveRole: isVisitor ? 'syndic' : supportContext?.role ?? profile?.role ?? null,
      isSupportMode: !isVisitor && Boolean(supportContext),
      isVisitor,
      signOut: async () => {
        if (isVisitor) {
          exitVisitorMode();
          return;
        }
        await supabase?.auth.signOut();
      },
      exitSupportMode: () => setSupportContext(null),
    }),
    [profile, session, supportContext, isVisitor]
  );

  if (publicSpotReference) return <PublicSpotPage reference={publicSpotReference} />;
  if (!isCloudConfigured) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  if (isPasswordRecovery) return <ResetPasswordScreen />;
  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 font-mono text-sm">Conectando ao Bicicletário Fácil…</div>;
  }
  if (!session && !isVisitor) return <LoginScreen onEnterVisitor={enterVisitorMode} />;
  if (!isVisitor && (!profile || profile.role === 'pending')) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 p-4">
        <section className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400">Acesso pendente</p>
          <h1 className="mt-2 text-xl font-bold">Conta criada, aguardando liberação</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">A Nobrutec precisa vincular sua conta a um condomínio e definir seu perfil de acesso.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={enterVisitorMode} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-300">Entrar como visitante</button>
            <button onClick={() => void supabase?.auth.signOut()} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold hover:bg-slate-800">Sair</button>
          </div>
        </section>
      </main>
    );
  }
  return <AuthContext.Provider value={value}>{!isVisitor && profile?.role === 'nobrutec_admin' && !supportContext ? <NobrutecConsole onSignOut={value.signOut} onManage={(context) => setSupportContext(context)} /> : children}</AuthContext.Provider>;
}
