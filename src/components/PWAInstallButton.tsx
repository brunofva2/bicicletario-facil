import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { Monitor, Download, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isDesktop, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome !== 'accepted') {
        // If dismissed or unsupported in this context, open the modal guide
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  // If already installed in standalone window mode, show a subtle status or hide
  if (isInstalled && variant === 'header') {
    return (
      <>
        <div
          title="Executando no modo aplicativo desktop local"
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>App Desktop Ativo</span>
        </div>
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          id="pwa-install-compact-btn"
          type="button"
          onClick={handleClick}
          title="Instalar aplicativo PWA para Desktop"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-mono font-semibold transition-all shadow-sm active:scale-98 ${className}`}
        >
          <Monitor className="w-3.5 h-3.5 text-indigo-200" />
          <span>Instalar App</span>
        </button>

        <PWAInstallModal
          isOpen={isModalOpen}
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          isIOS={isIOS}
          isDesktop={isDesktop}
          onClose={() => setIsModalOpen(false)}
          onInstall={install}
        />
      </>
    );
  }

  return (
    <>
      <button
        id="pwa-install-header-btn"
        type="button"
        onClick={handleClick}
        title="Instalar como aplicativo no Computador (Windows / Mac / Linux)"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-mono font-bold transition-all shadow-sm hover:shadow-indigo-500/20 active:scale-98 border border-indigo-400/30 ${className}`}
      >
        <Monitor className="w-4 h-4 text-indigo-200 animate-pulse" />
        <span className="hidden md:inline">Instalar no Desktop</span>
        <span className="md:hidden">Instalar</span>
      </button>

      <PWAInstallModal
        isOpen={isModalOpen}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        isDesktop={isDesktop}
        onClose={() => setIsModalOpen(false)}
        onInstall={install}
      />
    </>
  );
};
