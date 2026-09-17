import React from 'react';
import { BicycleSpot } from '../types';
import { BicicletarioFacilLogo } from './BicicletarioFacilLogo';
import {
  X,
  Bike,
  CheckCircle2,
  Lock,
  Calendar,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  QrCode as QrIcon,
  Info,
} from 'lucide-react';

interface SpotPublicConsultModalProps {
  readOnly?: boolean;
  spot: BicycleSpot | null;
  condominiumName: string;
  onClose: () => void;
  onNavigateToSpotInAdmin?: (spot: BicycleSpot) => void;
}

export const SpotPublicConsultModal: React.FC<SpotPublicConsultModalProps> = ({
  readOnly = false,
  spot,
  condominiumName,
  onClose,
  onNavigateToSpotInAdmin,
}) => {
  if (!spot) return null;

  const isOccupied = !!spot.currentAllocation;
  const allocation = spot.currentAllocation;

  // Pre-filled WhatsApp message for requesting free spot
  const whatsappFreeSpotMsg = encodeURIComponent(
    `Olá Administração do Condomínio ${condominiumName}! Acabei de escanear o QR Code da Vaga Suspensa ${spot.spotNumber} no bicicletário e ela consta como LIVRE. Gostaria de verificar a viabilidade de alocação desta vaga para o meu apartamento e solicitar as instruções para cadastrar minha bicicleta. (Meu Apartamento / Bloco: ______)`
  );

  const whatsappOccupiedSpotMsg = encodeURIComponent(
    `Olá Administração do Condomínio ${condominiumName}! Estou no bicicletário diante da Vaga ${spot.spotNumber} e gostaria de tirar uma dúvida sobre a ocupação/identificação desta vaga.`
  );

  return (
    <div
      id="spot-public-consult-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="spot-public-consult-card"
        className="relative flex flex-col w-full max-w-lg max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <QrIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Consulta Externa por QR Code
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate" title={condominiumName}>
                {condominiumName}
              </h3>
            </div>
          </div>

          <button
            id="close-public-consult-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Fechar consulta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <BicicletarioFacilLogo variant="horizontal" size="sm" />
            <span className="text-[11px] font-mono text-slate-500">
              {spot.sector}
            </span>
          </div>

          {/* Spot Hero Identifier */}
          <div className="text-center p-4 rounded-xl bg-slate-900 text-white shadow-md space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              Identificação Física no Bicicletário
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-white">
              VAGA {spot.spotNumber}
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Suporte: {spot.hookType} • Código: {spot.qrCodeValue}
            </p>
          </div>

          {/* SCENARIO A: SPOT IS OCCUPIED */}
          {isOccupied && allocation ? (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                    Status: Vaga Ocupada / Concedida
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  Uso Autorizado
                </span>
              </div>

              {/* Public information only: never expose resident identity, unit or contact. */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Identificação pública da vaga:</span>
                </h4>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shrink-0">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Bicicleta autorizada</div>
                      <div className="text-xs text-slate-600">Cadastro validado pela administração</div>
                    </div>
                  </div>
                </div>

                {/* Bike Details */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <h5 className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bicicleta Autorizada no Gancho:</span>
                  </h5>

                  {allocation.photoUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center">
                      <img
                        src={allocation.photoUrl}
                        alt={`Bicicleta da vaga ${spot.spotNumber}`}
                        className="w-full h-44 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Modelo da bicicleta:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {allocation.bicycle?.brandModel || 'Não informado'}
                      </span>
                    </div>
                    <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Cor Predominante:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {allocation.bicycle?.color || 'Não informada'}
                      </span>
                    </div>
                  </div>

                  {allocation.bicycle?.tagNumber && (
                    <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 block">Identificação de cadastro:</span>
                      <span className="font-bold text-slate-900">
                        Selo {allocation.bicycle.tagNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                <p>
                  Esta vaga possui cadastro regularizado junto à administração do condomínio. Caso identifique qualquer irregularidade ou troca indevida de bicicleta, comunique a administração.
                </p>
              </div>

              {/* Contact Admin button */}
              <a
                aria-disabled={readOnly}
                href={readOnly ? undefined : `https://wa.me/?text=${whatsappOccupiedSpotMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-mono text-xs font-bold transition-all shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Dúvidas sobre esta vaga? Falar com a Administração</span>
              </a>
            </div>
          ) : (
            /* SCENARIO B: SPOT IS FREE (Exact user requirement) */
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Prominent Free Status Alert */}
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500/80 text-emerald-950 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold font-mono text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>VAGA LIVRE NO MOMENTO</span>
                </div>

                {/* Exact requested instruction */}
                <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
                  Esta vaga <strong className="font-bold font-mono">({spot.spotNumber})</strong> está livre no momento.
                </p>

                <div className="p-3 rounded-lg bg-white/90 border border-emerald-200 text-xs text-slate-800 leading-relaxed font-sans shadow-2xs space-y-1.5">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs font-mono">
                    <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Como solicitar o uso deste gancho:</span>
                  </p>
                  <p className="text-slate-700">
                    Para utilizar este espaço, <strong>dirija-se à Administração do Condomínio</strong> para <strong>cadastrar sua bicicleta</strong> e <strong>verificar a viabilidade de usar a vaga {spot.spotNumber} que você solicitou</strong>.
                  </p>
                </div>
              </div>

              {/* WhatsApp Action Button with spot number */}
              <a
                id="request-spot-whatsapp-btn"
                aria-disabled={readOnly}
                href={readOnly ? undefined : `https://wa.me/?text=${whatsappFreeSpotMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-98"
              >
                <MessageCircle className="w-4 h-4 text-emerald-100" />
                <span>Solicitar Vaga {spot.spotNumber} à Administração via WhatsApp</span>
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </a>

              {/* Checklist for the resident */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <h5 className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                  <span>O que levar na administração para regularizar:</span>
                </h5>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc">
                  <li>
                    <strong>Identificação da Bicicleta:</strong> Marca, modelo, cor predominante e foto.
                  </li>
                  <li>
                    <strong>Comprovante da Unidade:</strong> Apartamento e bloco correspondente.
                  </li>
                  <li>
                    <strong>Conferência da Vaga:</strong> Informe que você escaneou a <span className="font-bold font-mono text-slate-900">Vaga {spot.spotNumber}</span>.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {onNavigateToSpotInAdmin && (
            <button
              type="button"
              onClick={() => {
                onNavigateToSpotInAdmin(spot);
                onClose();
              }}
              className="text-xs font-mono text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
            >
              <span>Abrir no Painel do Síndico</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            id="close-public-consult-bottom-btn"
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition-colors shadow-xs"
          >
            Fechar Consulta
          </button>
        </div>
      </div>
    </div>
  );
};
