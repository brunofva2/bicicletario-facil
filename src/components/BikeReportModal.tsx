import React, { useState } from 'react';
import { RegisteredBicycle, BikeReportReason, SystemConfig } from '../types';
import {
  X,
  AlertTriangle,
  MapPin,
  MessageCircle,
  Copy,
  Check,
  Bike,
  User,
  Phone,
  ShieldAlert,
  Send,
  HelpCircle,
  Wrench,
  Clock,
  UserCheck,
} from 'lucide-react';

interface BikeReportModalProps {
  bike: RegisteredBicycle | null;
  config: SystemConfig;
  initialReason?: BikeReportReason;
  onClose: () => void;
  onReportSent: (
    bike: RegisteredBicycle,
    reason: BikeReportReason,
    customMessage: string,
    locationOrDetail?: string
  ) => void;
}

export const BikeReportModal: React.FC<BikeReportModalProps> = ({
  bike,
  config,
  initialReason,
  onClose,
  onReportSent,
}) => {
  if (!bike) return null;

  const [reason, setReason] = useState<BikeReportReason>(initialReason || 'reevaluacao_bienal');
  
  // Specific details based on reason
  const [detectedLocation, setDetectedLocation] = useState('Hall de entrada do bloco');
  const [customLocation, setCustomLocation] = useState('');
  
  const [abandonmentDetails, setAbandonmentDetails] = useState<string[]>([
    'Pneus murchos / sem ar',
    'Acúmulo de poeira / teias de aranha',
  ]);
  const [removalDeadline, setRemovalDeadline] = useState('7 dias');

  const [customMessageText, setCustomMessageText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Quick location suggestions
  const locationOptions = [
    'Hall de entrada do bloco',
    'Vaga de veículos na garagem',
    'Rampa de acesso ao subsolo',
    'Corredor de passagem / circulação',
    'Gramado / Pátio externo',
    'Escadaria de emergência',
    'Outro local',
  ];

  const toggleAbandonmentDetail = (detail: string) => {
    if (abandonmentDetails.includes(detail)) {
      setAbandonmentDetails(abandonmentDetails.filter((d) => d !== detail));
    } else {
      setAbandonmentDetails([...abandonmentDetails, detail]);
    }
  };

  // Build the WhatsApp message dynamically
  const buildWhatsAppMessage = (): string => {
    const aptInfo = `${bike.apartment} - ${bike.block}`;
    const bikeDesc = `${bike.brandModel} (${bike.color})${bike.tagNumber ? ` • Selo: ${bike.tagNumber}` : ''}`;
    const spotInfo = bike.spotNumber ? ` (Vaga suspensa: ${bike.spotNumber})` : ' (Sem vaga fixa no momento)';
    const regDateFormatted = new Date(bike.registeredAt).toLocaleDateString('pt-BR');

    if (reason === 'reevaluacao_bienal') {
      const detailsText =
        abandonmentDetails.length > 0
          ? `\n🔍 *Condições da bicicleta constatadas na vistoria:* ${abandonmentDetails.join(', ')}.`
          : '';

      return (
        `Olá, ${bike.residentName} (Apto ${aptInfo})!\n\n` +
        `Aqui é da administração do *${config.condominiumName}*.\n\n` +
        `Entramos em contato referente à sua bicicleta cadastrada no condomínio:\n` +
        `🚲 *${bikeDesc}*${spotInfo}\n` +
        `📅 *Data de Cadastro:* ${regDateFormatted} (mais de 2 anos no condomínio)\n\n` +
        `📋 *Assunto: Reavaliação Bienal de Cadastro & Verificação de Condição da Bike*\n\n` +
        `Conforme as normas do bicicletário e gestão predial, realizamos periodicamente o censo de bicicletas cadastradas há mais de 2 anos para:\n` +
        `1. Confirmar se o proprietário continua sendo morador ativo na unidade;\n` +
        `2. Verificar o estado de conservação física da bicicleta contra abandono.${detailsText}\n\n` +
        `⚠️ *Solicitação:* Caso continue residindo na unidade e utilizando a bike, solicitamos a gentileza de responder a esta mensagem confirmando seu vínculo ativo e providenciar a manutenção/limpeza necessária no prazo de *${removalDeadline}*.\n\n` +
        `Caso tenha se mudado ou não utilize mais a bicicleta, favor nos avisar para que possamos atualizar o cadastro e disponibilizar o espaço a outros moradores.\n\n` +
        `Contamos com a sua colaboração para a organização do condomínio!\n\n` +
        `Atenciosamente,\n` +
        `*Administração - ${config.condominiumName}*`
      );
    }

    if (reason === 'lugar_indevido') {
      const loc = customLocation.trim() || detectedLocation;
      return (
        `Olá, ${bike.residentName} (Apto ${aptInfo})!\n\n` +
        `Aqui é da administração do *${config.condominiumName}*.\n\n` +
        `Identificamos a sua bicicleta:\n` +
        `🚲 *${bikeDesc}*${spotInfo}\n\n` +
        `⚠️ *Motivo:* A bicicleta foi avistada estacionada em *local indevido* (*${loc}*).\n\n` +
        `Para mantermos a segurança, acessibilidade e a organização das áreas comuns do condomínio, solicitamos a gentileza de recolhê-la ou posicioná-la no local adequado do bicicletário no prazo de *24 horas*.\n\n` +
        `Caso precise de auxílio com a vaga ou regras de uso, estamos à disposição!\n\n` +
        `Atenciosamente,\n` +
        `*Administração - ${config.condominiumName}*`
      );
    }

    if (reason === 'condicoes_criticas') {
      const detailsText =
        abandonmentDetails.length > 0
          ? `\nObservações constatadas: ${abandonmentDetails.join(', ')}.`
          : '';

      return (
        `Olá, ${bike.residentName} (Apto ${aptInfo})!\n\n` +
        `Aqui é da administração do *${config.condominiumName}*.\n\n` +
        `Entramos em contato a respeito da sua bicicleta registrada:\n` +
        `🚲 *${bikeDesc}*${spotInfo}\n\n` +
        `🚨 *Motivo:* Notamos que a bicicleta se encontra em *condições críticas de conservação / suspeita de abandono* nas dependências do condomínio.${detailsText}\n\n` +
        `Solicitamos que compareça à administração ou realize a regularização/manutenção da mesma no prazo de *${removalDeadline}*.\n` +
        `Bicicletas não regularizadas ou sem identificação após o prazo estarão sujeitas a recolhimento temporário conforme o Regimento Interno do condomínio.\n\n` +
        `Contamos com a sua colaboração para mantermos nosso bicicletário limpo e funcional!\n\n` +
        `Atenciosamente,\n` +
        `*Administração - ${config.condominiumName}*`
      );
    }

    // Outro
    return (
      `Olá, ${bike.residentName} (Apto ${aptInfo})!\n\n` +
      `Aqui é da administração do *${config.condominiumName}*.\n\n` +
      `Entramos em contato referente à sua bicicleta registrada no sistema:\n` +
      `🚲 *${bikeDesc}*${spotInfo}\n\n` +
      (customMessageText.trim()
        ? `${customMessageText.trim()}\n\n`
        : `Gostaríamos de tratar de um assunto referente ao cadastro e utilização das vagas de bicicleta do condomínio.\n\n`) +
      `Por favor, entre em contato com a administração quando possível.\n\n` +
      `Atenciosamente,\n` +
      `*Administração - ${config.condominiumName}*`
    );
  };

  const currentMessage = buildWhatsAppMessage();

  // Send to WhatsApp
  const handleSendWhatsApp = () => {
    const rawPhone = bike.residentPhone.replace(/\D/g, '');
    // Standardize Brazilian country code 55
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(currentMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    const detail =
      reason === 'reevaluacao_bienal'
        ? `Reavaliação bienal (+2 anos): ${abandonmentDetails.join(', ')}`
        : reason === 'lugar_indevido'
        ? customLocation || detectedLocation
        : reason === 'condicoes_criticas'
        ? abandonmentDetails.join(', ')
        : customMessageText;

    onReportSent(bike, reason, currentMessage, detail);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div
      id="bike-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="bike-report-modal-content"
        className="glass-panel rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 text-slate-800 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <MessageCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
                <span>Notificação / Contato via WhatsApp</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Condomínio
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Envio de mensagem formal com dados da bike, verificação de morador ativo e prazos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Target Bike and Resident Header Card */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={bike.photoUrl}
                alt={bike.brandModel}
                className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
              />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm font-mono">
                    Apto {bike.apartment} ({bike.block}) • {bike.residentName}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {bike.category}
                  </span>
                  {bike.spotNumber ? (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Vaga {bike.spotNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      Sem vaga vinculada
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  Bike: <span className="font-semibold text-slate-800">{bike.brandModel}</span> ({bike.color})
                  {bike.tagNumber && ` • Selo: ${bike.tagNumber}`}
                </p>
                {bike.distinguishingFeatures && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                    "{bike.distinguishingFeatures}"
                  </p>
                )}
              </div>
            </div>

            {/* Resident contact pill */}
            <div className="flex flex-col sm:items-end border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>{bike.residentName}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-600">
                Apto {bike.apartment} - {bike.block}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 mt-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{bike.residentPhone}</span>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 font-mono uppercase tracking-wider text-[11px]">
              Selecione o Motivo do Contato:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Motivo: Reavaliação Bienal (+2 anos) */}
              <button
                type="button"
                onClick={() => setReason('reevaluacao_bienal')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reason === 'reevaluacao_bienal'
                    ? 'border-indigo-500 bg-indigo-50/90 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                    <Clock className="w-4 h-4" />
                  </span>
                  {reason === 'reevaluacao_bienal' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs font-mono">Reavaliação Bienal</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Cadastrada há +2 anos: checar morador ativo & abandono
                  </p>
                </div>
              </button>

              {/* Motivo: Lugar Indevido */}
              <button
                type="button"
                onClick={() => setReason('lugar_indevido')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reason === 'lugar_indevido'
                    ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <MapPin className="w-4 h-4" />
                  </span>
                  {reason === 'lugar_indevido' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs font-mono">Lugar Indevido</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Estacionada em hall, garagem de carro ou corredor
                  </p>
                </div>
              </button>

              {/* Motivo: Condições Críticas / Abandono */}
              <button
                type="button"
                onClick={() => setReason('condicoes_criticas')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reason === 'condicoes_criticas'
                    ? 'border-rose-500 bg-rose-50/80 shadow-xs ring-1 ring-rose-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  {reason === 'condicoes_criticas' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs font-mono">Condições Críticas</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Bicicleta enferrujada, pneus furados ou sem uso
                  </p>
                </div>
              </button>

              {/* Motivo: Outro */}
              <button
                type="button"
                onClick={() => setReason('outro')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reason === 'outro'
                    ? 'border-sky-500 bg-sky-50/80 shadow-xs ring-1 ring-sky-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  {reason === 'outro' && (
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs font-mono">Outro Motivo</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Contato direto, recadastramento ou aviso geral
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Controls based on Reason */}
          {reason === 'reevaluacao_bienal' && (
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-indigo-950 font-mono text-xs">
                  Condições da bike e dados de auditoria bienal a citar na mensagem:
                </label>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  Cadastrada há mais de 2 anos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Confirmação se ainda reside no condomínio',
                  'Pneus murchos / sem calibração',
                  'Acúmulo denso de poeira e teias',
                  'Corrente e transmissão enferrujadas',
                  'Falta de uso prolongado / sem movimentação',
                  'Necessidade de manutenção preventiva',
                ].map((item) => {
                  const isChecked = abandonmentDetails.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAbandonmentDetail(item)}
                      className={`px-3 py-2 rounded-lg text-left text-[11px] font-mono border flex items-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-indigo-100/90 text-indigo-950 border-indigo-400 font-semibold'
                          : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-indigo-200 flex items-center gap-3">
                <span className="text-[11px] font-mono text-indigo-900 font-semibold">
                  Prazo solicitado para resposta e regularização:
                </span>
                <select
                  value={removalDeadline}
                  onChange={(e) => setRemovalDeadline(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-indigo-300 bg-white font-mono text-slate-800"
                >
                  <option value="48 horas">48 horas</option>
                  <option value="5 dias">5 dias</option>
                  <option value="7 dias">7 dias (Recomendado)</option>
                  <option value="15 dias">15 dias</option>
                </select>
              </div>
            </div>
          )}

          {reason === 'lugar_indevido' && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-3">
              <label className="block font-bold text-amber-950 font-mono text-xs">
                Onde a bicicleta foi avistada?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {locationOptions.slice(0, 6).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setDetectedLocation(loc);
                      setCustomLocation('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono border transition-all ${
                      detectedLocation === loc && !customLocation
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Ou digite outro local específico (ex: Atrás da lixeira do Bloco C)..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {reason === 'condicoes_criticas' && (
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/90 space-y-3">
              <label className="block font-bold text-rose-950 font-mono text-xs">
                Sinais de deterioração ou abandono identificados:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Pneus murchos / sem ar',
                  'Acúmulo de poeira / teias',
                  'Corrente ou coroa enferrujada',
                  'Peças faltantes ou quebradas',
                  'Sem movimentação há mais de 60 dias',
                  'Cadeado emperrado / abandonado',
                ].map((item) => {
                  const isChecked = abandonmentDetails.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAbandonmentDetail(item)}
                      className={`px-3 py-2 rounded-lg text-left text-[11px] font-mono border flex items-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-rose-100/90 text-rose-950 border-rose-400 font-semibold'
                          : 'bg-white text-slate-700 border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isChecked
                            ? 'bg-rose-600 border-rose-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-rose-200 flex items-center gap-3">
                <span className="text-[11px] font-mono text-rose-900 font-semibold">
                  Prazo para regularização antes do recolhimento:
                </span>
                <select
                  value={removalDeadline}
                  onChange={(e) => setRemovalDeadline(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-rose-300 bg-white font-mono text-slate-800"
                >
                  <option value="48 horas">48 horas</option>
                  <option value="5 dias">5 dias</option>
                  <option value="7 dias">7 dias (Recomendado)</option>
                  <option value="15 dias">15 dias</option>
                  <option value="30 dias">30 dias</option>
                </select>
              </div>
            </div>
          )}

          {reason === 'outro' && (
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2">
              <label className="block font-bold text-sky-950 font-mono text-xs">
                Mensagem personalizada para o morador:
              </label>
              <textarea
                rows={3}
                placeholder="Escreva a mensagem ou comunicado sobre a bicicleta que será enviado para o WhatsApp do morador..."
                value={customMessageText}
                onChange={(e) => setCustomMessageText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-sky-300 bg-white placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Prévia da Mensagem Gerada para WhatsApp */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prévia da Mensagem (WhatsApp)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-mono text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto border border-slate-700 shadow-inner">
              {currentMessage}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </button>

            <button
              type="button"
              id="send-whatsapp-report-btn"
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs shadow-md hover:shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp & Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
