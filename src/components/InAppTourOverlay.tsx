import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  X,
  MousePointerClick,
  CheckCircle2,
  Lightbulb,
  Compass,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';

export interface InAppTourStepConfig {
  phaseNumber: number;
  title: string;
  badge: string;
  targetTab: 'map' | 'bikes' | 'history' | 'requests';
  targetSelector: string;
  elementName: string;
  howToUse: string;
  condoFunction: string;
  tip: string;
}

export const TOUR_STEPS: InAppTourStepConfig[] = [
  {
    phaseNumber: 1,
    title: 'Mapa dos Ganchos Suspensos',
    badge: 'Fase 1: Vagas & Ocupação',
    targetTab: 'map',
    targetSelector: '[data-spot-status="disponivel"], #spot-card-v-01, #spot-filter-bar',
    elementName: 'Ganchos Suspensos no Mapa',
    howToUse:
      'Síndico e administradora podem clicar em gancho verde para alocar. Portaria consulta o mapa e registra pedidos na aba Solicitações; em gancho ocupado, todos consultam a ficha permitida.',
    condoFunction:
      'Proporciona visão imediata da lotação do bicicletário, identificando vagas livres, ocupadas e concessões temporárias vencidas sem precisar de pranchetas de papel.',
    tip: 'Utilize os filtros rápidos ("Todas", "Livres", "Ocupadas" e "Vencidas") para localizar vagas num clique.',
  },
  {
    phaseNumber: 2,
    title: 'Solicitação de Vaga & Aprovação',
    badge: 'Fase 2: Fila de Atendimento',
    targetTab: 'requests',
    targetSelector: '#spot-requests-form',
    elementName: 'Solicitação usando bicicleta cadastrada',
    howToUse:
      'A portaria seleciona uma bicicleta cadastrada e sem vaga. O sistema preenche automaticamente morador, apartamento, bloco e contato; basta enviar para a fila.',
    condoFunction:
      'Organiza a demanda e evita alocação informal. O síndico aprova o pedido selecionando uma vaga livre específica e definindo a concessão.',
    tip: 'Na aprovação, a bicicleta solicitada já abre selecionada. O síndico só confirma os dados e a vaga.',
  },
  {
    phaseNumber: 3,
    title: 'Catálogo de Bikes: Consulta & Cadastro',
    badge: 'Fase 3: Consulta & Cadastro',
    targetTab: 'bikes',
    targetSelector: '#register-new-bike-btn',
    elementName: 'Catálogo para Consulta e Cadastro',
    howToUse:
      'Pesquise por apartamento, bloco ou morador para consultar bicicletas. Cadastre novos veículos com foto e, para bikes sem vaga, escolha "Vincular Vaga Livre" e selecione a vaga desejada.',
    condoFunction:
      'Centraliza o inventário do condomínio para consulta rápida de titularidade de qualquer bicicleta avistada nas dependências e cadastro fotográfico completo com número de chassi.',
    tip: 'Utilize o campo de busca para consultar instantaneamente quem é o dono de qualquer bicicleta pela cor, marca ou número do apartamento.',
  },
  {
    phaseNumber: 4,
    title: 'Identificação Externa por QR Code',
    badge: 'Fase 4: Consulta & Identificação',
    targetTab: 'map',
    targetSelector: '[data-qr-btn="true"], #spot-card-v-01, #spot-filter-bar',
    elementName: 'Plaquetas de QR Code nas Vagas',
    howToUse:
      'Clique no ícone de QR Code de qualquer vaga para visualizar ou imprimir a plaqueta física de identificação. O morador aponta a câmera do próprio smartphone para o código fixado no bicicletário.',
    condoFunction:
      'Permite identificar número, local e status da vaga. A consulta pública preserva a privacidade e não mostra nome, apartamento ou contato do morador.',
    tip: 'O morador não precisa de aplicativo instalado: a câmera padrão do celular abre a consulta e já sugere envio de mensagem pelo WhatsApp para a administração.',
  },
  {
    phaseNumber: 5,
    title: 'Reavaliação Bienal (+2 Anos)',
    badge: 'Fase 5: Prevenção de Abandono',
    targetTab: 'bikes',
    targetSelector: '#filter-reevaluation-btn',
    elementName: 'Filtro "Reavaliação +2 Anos"',
    howToUse:
      'Toque neste filtro para isolar todas as bicicletas que estão no bicicletário há mais de 24 meses. Em cada ficha, use o botão de WhatsApp para contatar o morador e confirmar permanência.',
    condoFunction:
      'Previne que ex-moradores que já se mudaram mantenham bicicletas abandonadas ocupando espaço comum, garantindo rotatividade para quem está na fila.',
    tip: 'O sistema calcula automaticamente o prazo bienal a partir da data de entrada da bicicleta.',
  },
  {
    phaseNumber: 6,
    title: 'Histórico de Auditoria & Backup',
    badge: 'Fase 6: Governança & Arquivo',
    targetTab: 'history',
    targetSelector: '#history-filters-container, #header-config-btn',
    elementName: 'Auditoria Permanente & Backup',
    howToUse:
      'Use os filtros para pesquisar o histórico de movimentações, check-ins e concessões. No botão de engrenagem no topo, faça download do arquivo JSON de backup local.',
    condoFunction:
      'Garante transparência para assembleias e segurança na base sincronizada em nuvem. O armazenamento local funciona como contingência, não como fonte oficial.',
    tip: 'Faça um backup mensal dos dados e guarde na pasta oficial da administração.',
  },
];

interface InAppTourOverlayProps {
  stepIndex: number;
  onReturnToGuide: (stepIndex: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onCloseTour: () => void;
  onNavigateTab: (tab: 'map' | 'bikes' | 'history' | 'requests') => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const InAppTourOverlay: React.FC<InAppTourOverlayProps> = ({
  stepIndex,
  onReturnToGuide,
  onNextStep,
  onPrevStep,
  onCloseTour,
  onNavigateTab,
}) => {
  const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [balloonPlacement, setBalloonPlacement] = useState<'below' | 'above'>('below');
  const animationFrameRef = useRef<number | null>(null);

  // Automatically switch tab and scroll screen to perfectly frame the target button
  useEffect(() => {
    // 1. Instantly switch to the required tab for this step
    onNavigateTab(currentStep.targetTab);
    setTargetRect(null);

    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 35; // check every 50ms up to ~1.8s

    const findAndFrameTarget = () => {
      if (!isMounted) return;

      const selectors = currentStep.targetSelector.split(',').map((s) => s.trim());
      let element: HTMLElement | null = null;

      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el && el.offsetParent !== null) {
          element = el;
          break;
        }
      }

      if (element) {
        // Element found! Frame it automatically in the viewport
        const isHeaderElement =
          element.closest('header') !== null ||
          element.id.includes('header') ||
          element.id.includes('mobile-bottom-scan-btn');

        if (isHeaderElement) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Scroll so the target button is placed comfortably ~120px below viewport top
          const elementAbsoluteTop = element.getBoundingClientRect().top + window.pageYOffset;
          const targetScrollY = Math.max(0, elementAbsoluteTop - 120);
          window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        }

        // Measure immediately
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });

        // Re-measure after smooth scrolling completes
        setTimeout(() => {
          if (!isMounted || !element) return;
          const finalRect = element.getBoundingClientRect();
          setTargetRect({
            top: finalRect.top,
            left: finalRect.left,
            width: finalRect.width,
            height: finalRect.height,
            bottom: finalRect.bottom,
            right: finalRect.right,
          });
        }, 300);

        setTimeout(() => {
          if (!isMounted || !element) return;
          const settledRect = element.getBoundingClientRect();
          setTargetRect({
            top: settledRect.top,
            left: settledRect.left,
            width: settledRect.width,
            height: settledRect.height,
            bottom: settledRect.bottom,
            right: settledRect.right,
          });
        }, 600);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(findAndFrameTarget, 50);
        }
      }
    };

    // Give the DOM a tick to switch tab before locating
    const initialTimer = setTimeout(findAndFrameTarget, 40);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
    };
  }, [stepIndex, currentStep.targetTab, currentStep.targetSelector, onNavigateTab]);

  // Keep target element rect in sync on resize/scroll
  useEffect(() => {
    const handleUpdate = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        const selectors = currentStep.targetSelector.split(',').map((s) => s.trim());
        for (const sel of selectors) {
          const el = document.querySelector<HTMLElement>(sel);
          if (el && el.offsetParent !== null) {
            const rect = el.getBoundingClientRect();
            setTargetRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom,
              right: rect.right,
            });
            break;
          }
        }
      });
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [currentStep.targetSelector]);

  // Calculate balloon position relative to the highlighted button
  const getBalloonPositionStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 640;

    if (!targetRect) {
      // Centered fallback while target is being located
      return {
        top: isMobile ? 85 : 110,
        left: isMobile ? 12 : '50%',
        transform: isMobile ? 'none' : 'translateX(-50%)',
        width: isMobile ? 'calc(100vw - 24px)' : 430,
      };
    }

    const balloonWidth = isMobile ? Math.min(window.innerWidth - 24, 390) : 430;
    const padding = 14;

    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    let top: number;
    if (spaceBelow >= 310 || spaceBelow >= spaceAbove) {
      top = Math.max(75, targetRect.bottom + padding);
      if (balloonPlacement !== 'below') setBalloonPlacement('below');
    } else {
      top = Math.max(75, targetRect.top - 330 - padding);
      if (balloonPlacement !== 'above') setBalloonPlacement('above');
    }

    // Horizontal centering relative to target button with boundary protection
    let left = targetRect.left + targetRect.width / 2 - balloonWidth / 2;
    left = Math.max(12, Math.min(window.innerWidth - balloonWidth - 12, left));

    return {
      top,
      left,
      width: balloonWidth,
    };
  };

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      id="in-app-tour-overlay-root"
      className="fixed inset-0 z-50 pointer-events-none transition-all duration-200"
      role="dialog"
      aria-label="Demonstração Prática e Marcação no App"
    >
      {/* Subtle crisp backdrop so the app remains perfectly legible underneath (no blur) */}
      <div className="absolute inset-0 bg-slate-950/20 pointer-events-auto" />

      {/* Pulsing Visual Marker (Circulando o Botão / Elemento Alvo) */}
      {targetRect && (
        <div
          id="tour-spotlight-target-ring"
          className="absolute transition-all duration-300 pointer-events-none"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          {/* Animated Glowing Ring encircling the element */}
          <div className="w-full h-full rounded-xl sm:rounded-2xl border-2 sm:border-3 border-indigo-500 ring-4 ring-indigo-400/50 shadow-[0_0_25px_rgba(99,102,241,0.5)] animate-pulse" />

          {/* Radar ping effect */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-indigo-400 animate-ping opacity-60 pointer-events-none" />

          {/* Floating Pointer Badge directly above or beside the element */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-indigo-300">
            <Target className="w-3 h-3 text-indigo-200 animate-spin" />
            <span>Fase {currentStep.phaseNumber} no App</span>
          </div>
        </div>
      )}

      {/* Instructive Speech Balloon - SOLID OPAQUE WHITE WITH ZERO BLUR FOR MAXIMUM READABILITY */}
      <div
        id="tour-instruction-balloon"
        className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl border-2 border-indigo-600 p-4 sm:p-5 text-slate-900 transition-all duration-200 z-50 flex flex-col gap-3 max-h-[min(560px,calc(100vh-160px))] overflow-y-auto"
        style={getBalloonPositionStyle()}
      >
        {/* Balloon Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  Fase {currentStep.phaseNumber} de 6
                </span>
                <span className="text-[10px] font-mono text-slate-500 truncate hidden xs:inline">
                  {currentStep.badge}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate mt-0.5">
                {currentStep.elementName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseTour}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0"
            title="Fechar marcação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructive Details: How to use & Condo Function */}
        <div className="space-y-2.5 text-xs">
          {/* Como usar o botão */}
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1.5 font-bold font-mono text-indigo-900 text-[11px]">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Como usar este elemento:</span>
            </div>
            <p className="text-slate-700 text-[11px] sm:text-xs leading-relaxed pl-5">
              {currentStep.howToUse}
            </p>
          </div>

          {/* Função do mesmo */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold font-mono text-slate-800 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Função na gestão do condomínio:</span>
            </div>
            <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed pl-5">
              {currentStep.condoFunction}
            </p>
          </div>

          {/* Dica do Síndico */}
          <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg p-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Dica:</strong> {currentStep.tip}
            </p>
          </div>
        </div>

        {/* Mini progress dots & Quick Step Controls */}
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Fase {stepIndex + 1} de 6</span>
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === stepIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={onPrevStep}
              disabled={isFirstStep}
              className={`text-[11px] font-mono font-semibold px-2 py-1 rounded transition-colors ${
                isFirstStep ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ← Anterior
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={onCloseTour}
                className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalizar Guia</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onNextStep}
                className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Próxima Fase</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Dock (No canto inferior: Botão de voltar para a etapa do guia + controles de navegação) */}
      <div
        id="tour-bottom-dock"
        className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 pointer-events-auto z-[60] flex flex-col sm:flex-row items-end sm:items-center gap-2 max-w-[calc(100vw-24px)]"
      >
        {/* Navigation buttons between steps */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-xl border border-slate-300 font-mono text-xs">
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isFirstStep}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
              isFirstStep
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
            }`}
            title="Etapa anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 text-[11px] text-slate-600 font-bold whitespace-nowrap">
            Fase {currentStep.phaseNumber} de 6
          </span>

          <button
            type="button"
            onClick={onNextStep}
            disabled={isLastStep}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
              isLastStep
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95'
            }`}
            title="Próxima etapa"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button: VOLTAR PARA A ETAPA DO GUIA (Requested by user) */}
        <button
          id="return-to-guide-step-btn"
          type="button"
          onClick={() => onReturnToGuide(stepIndex)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold shadow-2xl transition-all border border-slate-700 active:scale-95 hover:shadow-indigo-500/20"
          title="Retornar à tela de instruções detalhadas do guia"
        >
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Voltar para a Etapa do Guia</span>
        </button>

        {/* User requested: no final da fase 6 ao lado do voltar para a etapa do guia tera um botao de finalizar guia */}
        {isLastStep && (
          <button
            id="finish-guide-tour-btn"
            type="button"
            onClick={onCloseTour}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold shadow-2xl transition-all border border-emerald-500 active:scale-95 hover:shadow-emerald-500/25 animate-pulse"
            title="Concluir e finalizar a demonstração prática do guia"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>Finalizar Guia</span>
          </button>
        )}

        {/* Close tour button */}
        <button
          id="close-in-app-tour-btn"
          type="button"
          onClick={onCloseTour}
          className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-300 shadow-md transition-colors"
          title="Encerrar demonstração"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
