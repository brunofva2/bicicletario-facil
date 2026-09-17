import React from 'react';
import {
  Monitor,
  Download,
  X,
  CheckCircle2,
  Laptop,
  Smartphone,
  ShieldCheck,
  Zap,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onInstall: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  isInstallable,
  isInstalled,
  isIOS,
  isDesktop,
  onClose,
  onInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pwa-install-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="pwa-install-modal-content"
        className="glass-panel rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 border border-slate-200 animate-scaleUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Monitor className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight text-white flex items-center gap-2">
                <span>Instalar Aplicativo no Computador</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                  PWA Desktop
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 font-mono">
                Abre em tela cheia e mantém cadastros compatíveis durante instabilidades de conexão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs font-mono space-y-1">
                <p className="font-bold">O aplicativo já está instalado no seu dispositivo!</p>
                <p className="text-emerald-700 text-[11px]">
                  Você já pode abri-lo direto pelo ícone na sua Área de Trabalho, Menu Iniciar ou Launchpad.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs font-mono space-y-1">
                  <p className="font-bold">Instalação direta disponível em 1 clique!</p>
                  <p className="text-indigo-800 text-[11px]">
                    Clique no botão abaixo para fixar o Bicicletário como aplicativo nativo no seu Windows, Mac ou Linux.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora no Computador</span>
              </button>
            </div>
          ) : (
            /* Guia de instalação manual no Chrome/Edge/Safari */
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-900">
                <Laptop className="w-4 h-4 text-slate-700" />
                <span>Como instalar no Chrome, Edge ou Brave (Desktop):</span>
              </div>
              <ol className="space-y-2 text-xs font-mono text-slate-700 list-decimal list-inside pl-1">
                <li>
                  Na <strong>barra de endereços do seu navegador</strong> (canto direito, onde fica a URL), procure o ícone de instalação <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-bold">🖥️ ou ⊕</span>.
                </li>
                <li>
                  Ou clique no <strong>menu de 3 pontinhos (⋮)</strong> no canto superior direito do navegador.
                </li>
                <li>
                  Selecione <strong>"Instalar Bicicletário..."</strong> ou <strong>"Salvar e Compartilhar &gt; Instalar página como app"</strong>.
                </li>
                <li>
                  Confirme em <strong>"Instalar"</strong>. Um atalho oficial será criado na Área de Trabalho e no Menu Iniciar!
                </li>
              </ol>
            </div>
          )}

          {/* Vantagens do App Desktop */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider">
              Vantagens do Aplicativo Desktop
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>100% Offline</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Carrega instantaneamente mesmo sem acesso à internet.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Janela Própria</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Sem abas de navegador, como qualquer software nativo.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dados Seguros</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Armazenamento dedicado na máquina da portaria/administração.
                </p>
              </div>
            </div>
          </div>

          {/* iOS / Mobile note if needed */}
          {isIOS && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                <span>Instalação no iPhone / iPad (Safari):</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Toque no botão <strong>Compartilhar (quadrado com seta para cima)</strong> no Safari e depois toque em <strong>"Adicionar à Tela de Início"</strong>.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Compatível com Windows, macOS, Linux, Android e iOS
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
