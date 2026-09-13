import React, { useState } from 'react';
import { RegisteredBicycle, SystemConfig } from '../types';
import { getBikeReevaluationInfo } from '../utils/reevaluation';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Bike,
  MessageCircle,
  HelpCircle,
  FileCheck,
  ShieldAlert,
  Calendar,
  Sparkles,
  MapPin,
  Tag,
} from 'lucide-react';

interface BikeReevaluationModalProps {
  bike: RegisteredBicycle | null;
  config: SystemConfig;
  onClose: () => void;
  onConfirmReevaluation: (
    bike: RegisteredBicycle,
    data: {
      residentStatus: 'ativo' | 'mudou_se' | 'em_averiguacao';
      bikeCondition: 'bom_estado' | 'pouco_uso' | 'abandonada';
      notes: string;
      abandonmentReasons: string[];
    }
  ) => void;
  onOpenReportWhatsApp: (bike: RegisteredBicycle) => void;
}

export const BikeReevaluationModal: React.FC<BikeReevaluationModalProps> = ({
  bike,
  config,
  onClose,
  onConfirmReevaluation,
  onOpenReportWhatsApp,
}) => {
  if (!bike) return null;

  const reevalInfo = getBikeReevaluationInfo(bike);

  const [residentStatus, setResidentStatus] = useState<'ativo' | 'mudou_se' | 'em_averiguacao'>('ativo');
  const [bikeCondition, setBikeCondition] = useState<'bom_estado' | 'pouco_uso' | 'abandonada'>('bom_estado');
  const [notes, setNotes] = useState('');
  const [selectedAbandonmentReasons, setSelectedAbandonmentReasons] = useState<string[]>([
    'Pneus murchos / sem calibração',
    'Acúmulo denso de poeira e teias de aranha',
  ]);

  const toggleReason = (reason: string) => {
    if (selectedAbandonmentReasons.includes(reason)) {
      setSelectedAbandonmentReasons(selectedAbandonmentReasons.filter((r) => r !== reason));
    } else {
      setSelectedAbandonmentReasons([...selectedAbandonmentReasons, reason]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReevaluation(bike, {
      residentStatus,
      bikeCondition,
      notes: notes.trim(),
      abandonmentReasons: bikeCondition === 'abandonada' ? selectedAbandonmentReasons : [],
    });
  };

  const formattedRegDate = new Date(bike.registeredAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedLastReeval = bike.lastReevaluatedAt
    ? new Date(bike.lastReevaluatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const isDeteriorated = bikeCondition === 'abandonada';
  const isResidentInactive = residentStatus === 'mudou_se';

  return (
    <div
      id="bike-reevaluation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="bike-reevaluation-modal-content"
        className="glass-panel rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 text-slate-800 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 glass-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
                <span>Reavaliação bienal</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Gestão Predial
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Confirme o vínculo do morador e a condição atual da bicicleta.
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

        {/* Notice Banner: Explanation of Rule */}
        <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200/80 text-xs font-mono text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Bicicleta cadastrada há {reevalInfo.timeDescription} (em {formattedRegDate})
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Regra de Gestão:</strong> A reavaliação bienal deve ser realizada mesmo que a bicicleta
              esteja alocada em uma vaga suspensa recentemente, garantindo que o proprietário continue sendo
              morador ativo no condomínio e que a bicicleta não esteja abandonada.
            </p>
          </div>
        </div>

        {/* Bike Summary Info Card */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src={bike.photoUrl}
              alt={bike.brandModel}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-black text-slate-900">
                  {bike.residentName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                  {bike.color}
                </span>
                {bike.tagNumber && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Selo: {bike.tagNumber}
                  </span>
                )}
                {bike.spotNumber ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    Vaga {bike.spotNumber}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-600">
                    Sem Vaga Fixa
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400">Bicicleta:</span>{' '}
                  <strong className="text-slate-800">{bike.brandModel}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Unidade:</span>{' '}
                  <strong className="text-slate-800">Apto {bike.apartment} - {bike.block}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Telefone / WhatsApp:</span>{' '}
                  <strong className="text-slate-800">{bike.residentPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Cadastro Inicial:</span>{' '}
                  <strong className="text-slate-800">{formattedRegDate}</strong>
                </div>
              </div>

              {formattedLastReeval && (
                <p className="text-[11px] font-mono text-slate-500">
                  Última vistoria registrada em: <strong>{formattedLastReeval}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reevaluation Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Step 1: Active Resident Verification */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase font-bold text-slate-700 tracking-wider">
              1. Verificação de Vínculo: O morador continua ativo no condomínio?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setResidentStatus('ativo')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  residentStatus === 'ativo'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  {residentStatus === 'ativo' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold">Morador Ativo</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Reside atualmente no Apto {bike.apartment}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResidentStatus('mudou_se')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  residentStatus === 'mudou_se'
                    ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <UserX className="w-4 h-4 text-rose-600" />
                  {residentStatus === 'mudou_se' && (
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-rose-900">Não Reside Mais</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Mudou-se / Apto desocupado
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResidentStatus('em_averiguacao')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  residentStatus === 'em_averiguacao'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  {residentStatus === 'em_averiguacao' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-amber-900">Em Averiguação</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Portaria checando com o síndico
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Physical State & Abandonment Detection */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase font-bold text-slate-700 tracking-wider">
              2. Condição Física da Bicicleta:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setBikeCondition('bom_estado')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  bikeCondition === 'bom_estado'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Bike className="w-4 h-4 text-emerald-600" />
                  {bikeCondition === 'bom_estado' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold">Conservada / Em Uso</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Limpa, pneus cheios e em uso
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBikeCondition('pouco_uso')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  bikeCondition === 'pouco_uso'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  {bikeCondition === 'pouco_uso' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-amber-900">Pouco Uso / Poeira</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Preservada, porém pouco utilizada
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBikeCondition('abandonada')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  bikeCondition === 'abandonada'
                    ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600/30 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {bikeCondition === 'abandonada' && (
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                  )}
                </div>
                <div>
                  <span className="block font-bold text-rose-900">Sinais de Abandono</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    Deterioração, pneus murchos, poeira
                  </span>
                </div>
              </button>
            </div>

            {/* Checkboxes if Abandoned is selected */}
            {bikeCondition === 'abandonada' && (
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 space-y-2 text-xs font-mono animate-fadeIn">
                <span className="text-[11px] font-bold text-rose-900 block">
                  Marque os sinais de abandono constatados na vistoria física:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    'Pneus murchos / sem calibração',
                    'Acúmulo denso de poeira e teias de aranha',
                    'Corrente e engrenagens enferrujadas',
                    'Cabos partidos ou freios inoperantes',
                    'Peças faltantes / avariadas',
                    'Imobilizada sem uso por longo período',
                  ].map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAbandonmentReasons.includes(reason)}
                        onChange={() => toggleReason(reason)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-[11px] text-slate-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-mono uppercase font-bold text-slate-600 tracking-wider">
              Observações da Vistoria Bienal (Opcional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Vistoria realizada na parede norte; confirmado que morador viajou e retornará mês que vem..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Callout if Abandonment or Inactive is detected */}
          {(isDeteriorated || isResidentInactive) && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300/80 flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs font-mono text-amber-900 space-y-0.5">
                  <strong className="block">Bicicleta com pendência grave / abandono detectado:</strong>
                  <p className="text-[11px] text-amber-800">
                    Envie imediatamente uma notificação formal pelo WhatsApp para o morador regularizar ou liberar o espaço.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReportWhatsApp(bike);
                }}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Notificar Morador</span>
              </button>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReportWhatsApp(bike);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold font-mono transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Notificação WhatsApp</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-mono transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Salvar Reavaliação Bienal</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
