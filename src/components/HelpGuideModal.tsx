import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Bike,
  LayoutGrid,
  QrCode,
  Clock,
  History,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  Smartphone,
  HardDrive,
  Building2,
  RotateCcw,
  Check,
  MousePointerClick,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { BicicletarioFacilLogo } from './BicicletarioFacilLogo';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'map' | 'bikes' | 'history' | 'requests') => void;
  onStartInAppTour?: (stepIndex: number) => void;
  initialStepIndex?: number;
}

interface GuideStep {
  id: string;
  phaseNumber: number;
  title: string;
  subtitle: string;
  targetTab?: 'map' | 'bikes' | 'history' | 'requests';
  badge: string;
  icon: React.ReactNode;
  overview: string;
  instructions: {
    title: string;
    description: string;
  }[];
  condoTip: string;
  keyActions: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'vagas-map',
    phaseNumber: 1,
    title: 'Mapa dos Ganchos Suspensos',
    subtitle: 'Visão geral em tempo visual das vagas, identificação de status e disponibilidade imediata',
    targetTab: 'map',
    badge: 'Controle de Vagas',
    icon: <LayoutGrid className="w-5 h-5 text-indigo-600" />,
    overview:
      'O Mapa dos Ganchos é o centro de controle do bicicletário. Cada gancho suspenso é numerado e identificado por setor (Bloco A, Bloco B, etc.), permitindo que o síndico visualize a ocupação do espaço em segundos.',
    instructions: [
      {
        title: 'Entenda as Cores dos Ganchos',
        description:
          'Verde significa "Livre" (pronto para alocação imediata); Cinza Escuro significa "Ocupado" com concessão ativa; Vermelho indica "Vencido" (concessão temporária cujo prazo expirou).',
      },
      {
        title: 'Alocar uma Vaga Livre',
        description:
          'O síndico pode clicar em um gancho verde ("Livre") para fazer uma alocação direta. Para pedidos da portaria, use primeiro a aba "Solicitações" e aprove a vaga escolhida.',
      },
      {
        title: 'Consultar Ficha e Detalhes do Morador',
        description:
          'Clique sobre qualquer gancho ocupado para abrir a gaveta lateral com os dados do apartamento, morador, bicicleta vinculada, data de concessão e botão de check-in.',
      },
      {
        title: 'Filtros Rápidos no Topo',
        description:
          'Use os botões de filtro ("Todas", "Livres", "Ocupadas" e "Vencidas") e a barra de busca por número de vaga, apartamento ou nome para localizar qualquer cadastro instantaneamente.',
      },
    ],
    condoTip:
      'Dica para a Gestão: Mantenha sempre a numeração física dos ganchos suspensos na parede ou teto exatamente igual à numeração deste mapa virtual (ex: V-01, V-02).',
    keyActions: [
      'Síndico: clique em vaga verde para alocar',
      'Clique em vaga ocupada para ver ficha',
      'Filtre por setor ou termo de busca',
    ],
  },
  {
    id: 'concessao-morador',
    phaseNumber: 2,
    title: 'Solicitações, Fila & Aprovação',
    subtitle: 'Fluxo simples entre portaria, síndico e bicicletas já cadastradas',
    targetTab: 'requests',
    badge: 'Fluxo de Atendimento',
    icon: <Building2 className="w-5 h-5 text-emerald-600" />,
    overview:
      'A portaria registra uma solicitação selecionando uma bicicleta já cadastrada e sem vaga. O sistema traz automaticamente morador, apartamento, bloco e contato. O síndico aprova escolhendo a vaga livre adequada.',
    instructions: [
      {
        title: 'Portaria: registre o pedido em poucos passos',
        description:
          'Abra "Solicitações", escolha a bicicleta cadastrada sem vaga e envie o pedido. A portaria não ocupa vagas diretamente no mapa.',
      },
      {
        title: 'Síndico: escolha e aprove a vaga livre',
        description:
          'Na fila, selecione uma vaga livre específica e clique em "Aprovar e atribuir". A bicicleta solicitada já aparece selecionada na confirmação.',
      },
      {
        title: 'Defina a concessão e confirme',
        description:
          'Defina prazo determinado ou vinculação contínua e confirme os dados. O sistema ocupa a vaga e atualiza o status da solicitação.',
      },
      {
        title: 'Recusas e duplicidades',
        description:
          'Solicitações recusadas permanecem registradas. A mesma bicicleta não pode gerar duas solicitações pendentes.',
      },
    ],
    condoTip:
      'Boas Práticas Condominiais: Quando houver fila, mantenha concessões por prazo determinado para permitir rodízio transparente entre moradores.',
    keyActions: [
      'Portaria registra a solicitação pela bicicleta cadastrada',
      'Síndico aprova escolhendo uma vaga livre',
      'Acompanhe pedidos aguardando, aprovados ou recusados',
    ],
  },
  {
    id: 'catalogo-bikes',
    phaseNumber: 3,
    title: 'Catálogo de Bikes: Consulta, Cadastro & Reporte',
    subtitle: 'Inventário completo para consulta de proprietários, cadastro com fotos e notificações formais via WhatsApp',
    targetTab: 'bikes',
    badge: 'Consulta & Cadastro',
    icon: <Bike className="w-5 h-5 text-blue-600" />,
    overview:
      'A aba "Bikes" funciona como uma central completa de CONSULTA e CADASTRO de bicicletas do condomínio. Serve tanto para registrar novos veículos com foto real, características e chassi quanto para consultar instantaneamente a quem pertence qualquer bicicleta no condomínio (pesquisando por apartamento, bloco, morador, cor, modelo ou chassi). Além disso, cada bicicleta cadastrada conta com o "Sistema de Reporte", permitindo acionar formalmente o condômino titular via WhatsApp.',
    instructions: [
      {
        title: 'Ferramenta de Consulta Rápida de Propriedade',
        description:
          'Utilize a barra de pesquisa no topo do catálogo para consultar na hora a quem pertence qualquer bicicleta avistada no condomínio. Pesquise por número do apartamento (ex: "102"), bloco, nome do condômino, cor predominante ("azul"), marca ("Caloi") ou número do chassi.',
      },
      {
        title: 'Filtros Dinâmicos de Consulta (Com Vaga / Sem Vaga / Reavaliação)',
        description:
          'Consulte de forma segmentada apenas bicicletas com vaga suspensa atribuída, bicicletas cadastradas aguardando vaga, ou filtre rapidamente bikes que já completaram 2 anos sem renovação de cadastro.',
      },
      {
        title: 'Cadastro de Novas Bicicletas com Foto Real',
        description:
          'Clique no botão "+ Cadastrar Bicicleta" para registrar um novo veículo no momento da concessão da vaga ou durante o censo geral. A foto real elimina bicicletas "fantasmas" e facilita o reconhecimento visual por porteiros, zeladores e moradores.',
      },
      {
        title: 'Registro de Aro, Categoria e Número de Chassi',
        description:
          'Especifique se a bike é Mountain Bike, Urbana, Speed, Elétrica ou Infantil, além do aro (29", 26", 700c) e o número de série/chassi gravado no quadro para proteção contra trocas indevidas ou furtos.',
      },
      {
        title: 'Botão "Reporte / Notificar no WhatsApp" (Em Cada Bike Consultada)',
        description:
          'Em cada ficha de bicicleta cadastrada no catálogo, utilize o botão verde "Reporte / Notificar no WhatsApp" para disparar comunicados administrativos instantâneos com mensagens formais completas prontas, sem precisar digitar números no celular da administração.',
      },
      {
        title: 'Motivo 1: Estacionamento em Local Indevido (Obstrução de Áreas Comuns)',
        description:
          'Notifique o morador titular caso a bicicleta seja encontrada estacionada fora do bicicletário — como vagas de veículos da garagem, halls de entrada dos blocos, corredores, rampas ou escadarias de emergência —, concedendo prazo amigável de 24 horas para remoção imediata.',
      },
      {
        title: 'Motivo 2: Condições Críticas & Suspeita de Abandono',
        description:
          'Identifique e notifique o proprietário caso a bicicleta apresente sinais evidentes de deterioração ou desuso (pneus murchos, teias de aranha, ferrugem grave ou peças faltantes), estipulando prazo legal (ex: 7 ou 15 dias) para manutenção sob pena de recolhimento para o depósito.',
      },
      {
        title: 'Motivo 3: Reavaliação Bienal (+2 Anos) & Contato Geral',
        description:
          'Convoque condôminos com cadastros antigos para auditar se ainda residem no condomínio e utilizam o veículo, ou envie comunicados livres personalizados diretamente ao morador.',
      },
      {
        title: 'Trilha de Auditoria Automática de Notificações',
        description:
          'Cada reporte disparado é registrado automaticamente no Histórico de Auditoria do condomínio com data, hora, motivo selecionado e número do morador, constituindo prova documental irrefutável para aplicação de advertências e multas regimentais.',
      },
      {
        title: 'Ações de Gestão na Ficha Individual',
        description:
          'Na ficha, o síndico pode solicitar a vinculação a uma vaga livre específica, editar características, auditar conservação ou liberar a vaga quando o morador se mudar.',
      },
    ],
    condoTip:
      'Fundamentação Regimental: Utilizar o catálogo tanto para consulta imediata de propriedade quanto para cadastro garante controle patrimonial pleno, prevenindo bicicletas abandonadas e respaldando juridicamente qualquer notificação via WhatsApp.',
    keyActions: [
      'Acesse a aba "Bikes" para consultar ou cadastrar',
      'Consulte proprietários pesquisando por apartamento, morador ou foto',
      'Cadastre novas bikes pelo botão "+ Cadastrar Bicicleta"',
      'Use o botão "Reporte / Notificar no WhatsApp" para estacionamento indevido ou abandono',
      'Acompanhe todas as notificações registradas no Histórico',
    ],
  },
  {
    id: 'qr-scanner',
    phaseNumber: 4,
    title: 'Plaquetas QR Code & Consulta da Vaga',
    subtitle: 'Identificação externa no bicicletário e orientação para solicitação de vagas livres',
    targetTab: 'map',
    badge: 'Identificação Externa',
    icon: <QrCode className="w-5 h-5 text-violet-600" />,
    overview:
      'Os QR Codes identificam cada vaga fisicamente fora do aplicativo. Ao escanear a placa, a consulta pública mostra número, local, status e, quando autorizada, a identificação visual da bicicleta — sem expor nome, apartamento ou contato do morador. Se estiver livre, orienta procurar a administração.',
    instructions: [
      {
        title: 'Emissão e Impressão de Plaquetas QR',
        description:
          'Clique no ícone de QR Code em qualquer vaga para visualizar e imprimir a plaqueta física para fixação no gancho ou parede do bicicletário.',
      },
      {
        title: 'Leitura Fora do App (Câmera do Smartphone)',
        description:
          'Qualquer morador ou visitante pode apontar a câmera nativa do seu celular para a plaqueta no bicicletário sem necessidade de instalar aplicativos.',
      },
      {
        title: 'Vaga Ocupada: Consulta Segura',
        description:
          'Ao escanear uma vaga ocupada, a tela informa que ela está ocupada e pode exibir a bicicleta autorizada, sem revelar dados pessoais do morador.',
      },
      {
        title: 'Vaga Livre: Orientação para Administração e Viabilidade',
        description:
          'Se a vaga estiver livre, a tela instrui o morador a procurar a administração para cadastrar sua bicicleta e solicitar a viabilidade de uso informando o número exato da vaga.',
      },
    ],
    condoTip:
      'Regra Condominial: Fixar as plaquetas com QR Code em todos os ganchos assegura ordem total e canaliza moradores interessados diretamente para o cadastro oficial da administração.',
    keyActions: [
      'Clique no ícone de QR da vaga para imprimir a plaqueta',
      'Morador aponta a câmera do celular no bicicletário',
      'Vaga livre orienta contato com a administração com 1 clique',
    ],
  },
  {
    id: 'reevaluacao-bienal',
    phaseNumber: 5,
    title: 'Reavaliação Bienal (+2 Anos)',
    subtitle: 'Controle de permanência bienal para evitar bikes abandonadas e liberar vagas ociosas',
    targetTab: 'bikes',
    badge: 'Auditoria Bienal',
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    overview:
      'Um dos maiores problemas em condomínios são moradores que se mudam e deixam bicicletas velhas para trás ocupando ganchos por anos. O sistema identifica automaticamente todas as bicicletas cadastradas há mais de 2 anos.',
    instructions: [
      {
        title: 'Indicador Automático "+2 Anos"',
        description:
          'No painel superior do cabeçalho, um contador âmbar acende sempre que houver bicicletas que atingiram 24 meses desde a última confirmação cadastral.',
      },
      {
        title: 'Filtro Direto na Aba "Bikes"',
        description:
          'Na listagem de bicicletas, utilize o botão "Reavaliação (+2 Anos)" para listar apenas os veículos que precisam de auditoria presencial.',
      },
      {
        title: 'Notificação Direta via WhatsApp',
        description:
          'O sistema gera uma mensagem formal pronta com o nome do morador, número da vaga e dados da bike para envio em 1 clique pelo WhatsApp, solicitando a confirmação de uso.',
      },
      {
        title: 'Renovação ou Desocupação',
        description:
          'Se o morador confirmar o uso e moradia, clique em "Confirmar Reavaliação" para renovar por mais 2 anos. Caso não resida mais no condomínio, realize a desocupação para liberar o gancho para o próximo morador da fila.',
      },
    ],
    condoTip:
      'Fundamentação Jurídica: Notifique o morador com antecedência de 30 dias antes de qualquer deliberação sobre retirada de bens abandonados, conforme convenção.',
    keyActions: [
      'Monitore o contador âmbar "+2 Anos"',
      'Envie comunicado formal pelo WhatsApp',
      'Renove o vínculo ou libere a vaga',
    ],
  },
  {
    id: 'historico-backup',
    phaseNumber: 6,
    title: 'Histórico de Auditoria & Backup',
    subtitle: 'Registro contínuo de todas as alterações, exportação em PDF e segurança de dados sem custos extras',
    targetTab: 'history',
    badge: 'Transparência & Dados',
    icon: <History className="w-5 h-5 text-slate-700" />,
    overview:
      'Toda ação realizada no sistema (alocação, cadastro de bike, check-in, edição ou desocupação) é salva automaticamente no Histórico de Auditoria com data e horário, servindo como documento de transparência para assembleias.',
    instructions: [
      {
        title: 'Histórico Inviolável de Movimentações',
        description:
          'Na aba "Histórico", consulte quem alocou, quando houve vistorias e todas as alterações passadas, com filtros por tipo de evento e período.',
      },
      {
        title: 'Exportação em PDF',
        description:
          'Gere relatórios impressos ou em PDF com a listagem geral de vagas e ocupantes para anexar a pastas de prestação de contas do condomínio.',
      },
      {
        title: 'Dados na Nuvem & Contingência Offline',
        description:
          'As informações são sincronizadas com segurança na nuvem do condomínio, permitindo que síndico e portaria trabalhem com a mesma base. O navegador mantém uma cópia local temporária para contingência, mas a nuvem é a fonte oficial.',
      },
      {
        title: 'Backup Periódico em Arquivo JSON',
        description:
          'No ícone de engrenagem/ajustes no canto superior direito, utilize o botão "Exportar Backup JSON". Salve o arquivo na pasta do condomínio ou pendrive para garantir a cópia de segurança permanente.',
      },
      {
        title: 'Customização por Condomínio & Manutenção Avançada',
        description:
          'O dimensionamento de capacidade (20, 50, 100, 200 até 500+ vagas) e os módulos de ganchos são personalizados para cada condomínio pelo prestador de serviços na aba "Manutenção Avançada" dentro de Ajustes, com trava por senha master para segurança do patrimônio.',
      },
    ],
    condoTip:
      'Rotina do Síndico: Exporte um arquivo de Backup JSON mensalmente ou sempre após realizar um grande sorteio de vagas. As alterações estruturais de vagas são realizadas na Manutenção Avançada.',
    keyActions: [
      'Consulte a aba "Histórico"',
      'Exporte relatórios PDF para assembleias',
      'Faça o download do Backup JSON em "Ajustes"',
      'Acesso à Manutenção Master protegido por senha',
    ],
  },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onStartInAppTour,
  initialStepIndex,
}) => {
  const [viewMode, setViewMode] = useState<'intro' | 'guide'>('intro');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reference to the scrollable container to auto-scroll to top on step progression
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top whenever step or mode changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, viewMode]);

  // Set mode and step index when modal opens
  useEffect(() => {
    if (isOpen) {
      if (typeof initialStepIndex === 'number' && initialStepIndex >= 0) {
        setViewMode('guide');
        setCurrentStepIndex(Math.min(initialStepIndex, GUIDE_STEPS.length - 1));
      } else {
        setViewMode('intro');
        setCurrentStepIndex(0);
      }
    }
  }, [isOpen, initialStepIndex]);

  if (!isOpen) return null;

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const totalSteps = GUIDE_STEPS.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handleStartGuide = () => {
    setCurrentStepIndex(0);
    setViewMode('guide');
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed all steps
      setViewMode('intro');
      onClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setViewMode('intro');
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    setViewMode('guide');
  };

  const handleStartTourOrOpenSection = (stepIdx: number) => {
    if (onStartInAppTour) {
      onStartInAppTour(stepIdx);
      onClose();
    } else if (currentStep.targetTab && onNavigateToTab) {
      onNavigateToTab(currentStep.targetTab);
      onClose();
    }
  };

  return (
    <div
      id="help-guide-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="help-guide-modal-card"
        className="relative flex flex-col w-full max-w-2xl lg:max-w-3xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {viewMode === 'intro' ? 'Manual & Apresentação' : `Guia do Síndico: Fase ${currentStepIndex + 1}/${totalSteps}`}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Bicicletário Fácil
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {viewMode === 'intro'
                  ? 'Instruções oficiais de gestão de vagas suspensas'
                  : currentStep.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'guide' && (
              <button
                type="button"
                onClick={() => setViewMode('intro')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Voltar à tela de introdução"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resumo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Guide mode only) */}
        {viewMode === 'guide' && (
          <div className="w-full bg-slate-100 h-1.5 shrink-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Scrollable Modal Body (Auto-scrolled on step advance) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
        >
          {viewMode === 'intro' ? (
            /* ================= VIEW 1: INTRO & THANK YOU ================= */
            <div className="space-y-6">
              {/* Special Thanks Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-md border border-indigo-900/40">
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 text-[11px] font-mono font-semibold backdrop-blur-xs border border-emerald-400/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Boas-vindas ao Bicicletário Fácil</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                    Agradecemos por adquirir o serviço de gestão do Bicicletário Fácil!
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl font-normal">
                    Parabéns pelo investimento na organização e modernização do seu condomínio. 
                    Nossa ferramenta foi desenvolvida sob medida para síndicos, conselhos e administradoras prediais,
                    eliminando o caos no bicicletário e garantindo segurança, ordem e transparência para todos os moradores.
                  </p>

                  <div className="pt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Software Projetado para Governança Condominial</span>
                    </div>
                  </div>
                </div>

                {/* Subtle background decoration */}
                <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* Cloud sync and offline contingency */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-emerald-950 font-mono text-sm">
                      Dados sincronizados na nuvem, com contingência local
                    </p>
                    <p className="text-emerald-800 leading-relaxed">
                      O Bicicletário Fácil usa uma base em nuvem para que administração, síndico e portaria trabalhem com os mesmos dados.
                      Enquanto houver conexão, alterações são sincronizadas automaticamente. Uma cópia no navegador ajuda na contingência durante instabilidades, mas a 
                      <strong> nuvem é a fonte oficial</strong>. Mantenha o acesso à internet ativo e faça backup periódico em Ajustes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Capabilities Summary Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>O que você pode fazer neste aplicativo:</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    7 Módulos Integrados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Item 1 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <LayoutGrid className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>1. Mapa Visual de Ganchos</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Visualize todos os ganchos suspensos, filtre por status e consulte rapidamente vagas livres, ocupadas ou vencidas.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>2. Solicitações e Aprovação</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      A portaria escolhe uma bicicleta cadastrada sem vaga; o síndico aprova escolhendo a vaga livre específica.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <Bike className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>3. Catálogo: Consulta & Cadastro</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Consulte por morador, apartamento, foto ou selo; cadastre bicicletas, vincule vagas específicas e envie reportes pelo WhatsApp.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <QrCode className="w-4 h-4 text-violet-600 shrink-0" />
                      <span>4. Plaquetas QR & Consulta Pública</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Plaquetas físicas mostram número, local e status da vaga; a consulta pública preserva os dados pessoais do morador.
                    </p>
                  </div>

                  {/* Item 5 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>5. Auditoria Bienal (+2 Anos)</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Identifique bikes há mais de 2 anos sem renovação para convocar o morador e evitar abandono de bens.
                    </p>
                  </div>

                  {/* Item 6 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <History className="w-4 h-4 text-slate-700 shrink-0" />
                      <span>6. Histórico e Backup Seguro</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Consulte movimentações, exporte relatórios em PDF e mantenha um backup JSON. A nuvem centraliza os dados do condomínio.
                    </p>
                  </div>

                  {/* Item 7 */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>7. Acessos por Perfil</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Nobrutec administra condomínios e usuários; síndico aprova e gerencia; portaria registra solicitações e consulta informações.
                    </p>
                  </div>
                </div>
              </div>

              {/* Call to Action: Start Guide */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="start-guide-btn"
                  type="button"
                  onClick={handleStartGuide}
                  className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Iniciar Guia Passo a Passo para Síndicos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono text-xs font-semibold transition-colors"
                >
                  Explorar o Sistema
                </button>
              </div>
            </div>
          ) : (
            /* ================= VIEW 2: STEP-BY-STEP INSTRUCTIONS ================= */
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Phase Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs">
                    {currentStep.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Etapa {currentStepIndex + 1} de {totalSteps}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">
                        {currentStep.badge}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans mt-0.5">
                      {currentStep.title}
                    </h2>
                  </div>
                </div>

                <button
                  id={`open-tour-step-${currentStepIndex}-header-btn`}
                  type="button"
                  onClick={() => handleStartTourOrOpenSection(currentStepIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-xs font-mono font-bold self-start sm:self-center transition-all shadow-2xs active:scale-95 group"
                  title="Abrir esta tela com marcação visual no app e balão explicativo"
                >
                  <MousePointerClick className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                  <span>Ver Marcação no App</span>
                  <ArrowRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>

              {/* Phase Overview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>{currentStep.overview}</p>
              </div>

              {/* Step instructions checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Instruções Práticas para a Gestão:</span>
                </h4>

                <div className="space-y-2.5">
                  {currentStep.instructions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-colors space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.title}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed pl-7">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialized Callout: Sistema de Reporte de Bikes via WhatsApp */}
              {currentStep.id === 'catalogo-bikes' && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold font-mono text-xs sm:text-sm">
                      <div className="p-1 rounded-lg bg-emerald-600 text-white shadow-2xs">
                        <MessageCircle className="w-4 h-4 fill-white" />
                      </div>
                      <span>Como Funciona o Sistema de Reporte de Bikes:</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Disparo WhatsApp
                    </span>
                  </div>

                  <p className="text-xs text-emerald-900 leading-relaxed">
                    No card de qualquer bicicleta na aba <strong>Bikes</strong>, o botão <strong>"Reporte / Notificar no WhatsApp"</strong> abre um assistente inteligente com notificações pré-formatadas prontas:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>1. Local Indevido (24h)</span>
                      </div>
                      <p className="text-slate-600">
                        Avisa sobre bike em vaga de carro, hall ou escada com prazo amigável de 24h para recolhimento.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>2. Condições Críticas / Abandono</span>
                      </div>
                      <p className="text-slate-600">
                        Notifica pneus murchos ou teias com prazo para regularização antes de recolhimento para depósito.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>3. Reavaliação Bienal (+2 Anos)</span>
                      </div>
                      <p className="text-slate-600">
                        Confirma se o proprietário continua morando na unidade e utilizando o veículo.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>4. Auditoria Automática</span>
                      </div>
                      <p className="text-slate-600">
                        Salva o comunicado no histórico do app como comprovante documental de notificação.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Síndico Condo Tip Box */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-950 text-xs space-y-1">
                <p className="font-bold font-mono flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Recomendação para a Convenção & Assembleia:</span>
                </p>
                <p className="text-amber-800 leading-relaxed">
                  {currentStep.condoTip}
                </p>
              </div>

              {/* Quick Summary Pill Bar */}
              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-wrap gap-2 text-[11px] font-mono text-slate-700">
                <span className="font-bold text-slate-900">Ações Chave:</span>
                {currentStep.keyActions.map((action, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 shadow-2xs"
                  >
                    • {action}
                  </span>
                ))}
              </div>

              {/* Interactive In-App Tour Card (Marcação no App) */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-indigo-50/50 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <MousePointerClick className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                      Experimentar esta função com marcação no app
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Destaca o botão desta etapa com um anel luminoso e um balão explicativo demonstrando o uso.
                    </p>
                  </div>
                </div>

                <button
                  id={`start-tour-step-${currentStepIndex}-action-btn`}
                  type="button"
                  onClick={() => handleStartTourOrOpenSection(currentStepIndex)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 active:scale-95 w-full sm:w-auto justify-center"
                >
                  <MousePointerClick className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Abrir Tela com Marcação</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
                </button>
              </div>

              {/* Phase Step Selector Pills (Direct jumping on desktop & tablet) */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[11px] text-slate-500 font-mono mb-2">
                  Navegar direto para uma fase:
                </p>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {GUIDE_STEPS.map((step, idx) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleJumpToStep(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 ${
                        currentStepIndex === idx
                          ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Fase {step.phaseNumber}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200/90 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {viewMode === 'intro' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-mono">
                Versão 2.4 • Sistema Predial
              </span>
              <button
                type="button"
                onClick={handleStartGuide}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-colors shadow-xs"
              >
                <span>Acessar o Guia</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {/* Back Button */}
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs font-bold transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{currentStepIndex === 0 ? 'Voltar ao Resumo' : 'Anterior'}</span>
              </button>

              {/* Middle Step Counter for Mobile */}
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {currentStepIndex + 1} de {totalSteps}
              </span>

              {/* Next / Finish Button */}
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-colors shadow-xs"
              >
                <span>
                  {currentStepIndex === totalSteps - 1 ? 'Concluir Guia' : 'Avançar'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
