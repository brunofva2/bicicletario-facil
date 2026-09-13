import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BicycleSpot } from '../types';
import { BicicletarioFacilLogo } from './BicicletarioFacilLogo';
import {
  X,
  Printer,
  Download,
  Bike,
  QrCode as QrIcon,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface QrCodeModalProps {
  spot: BicycleSpot | null;
  condominiumName: string;
  onClose: () => void;
  onOpenPublicConsult?: (spot: BicycleSpot) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  spot,
  condominiumName,
  onClose,
  onOpenPublicConsult,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const publicConsultUrl = spot
    ? `${window.location.origin}${window.location.pathname}?vaga=${encodeURIComponent(spot.spotNumber)}`
    : '';

  useEffect(() => {
    if (!spot || !publicConsultUrl) return;

    // The QR code contains the direct public URL so any native smartphone camera opens the spot consultation
    QRCode.toDataURL(publicConsultUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [spot, publicConsultUrl]);

  if (!spot) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode-Vaga-${spot.spotNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    if (!publicConsultUrl) return;
    navigator.clipboard.writeText(publicConsultUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      id="qr-code-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="qr-code-modal-content"
        className="glass-panel rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-slate-800 border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 glass-header">
          <div className="flex items-center gap-2">
            <QrIcon className="w-5 h-5 text-slate-900 stroke-[2.2]" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-mono tracking-tight">
                Placa de Identificação da Vaga
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Identificação externa para fixação no bicicletário
              </p>
            </div>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plate Content */}
        <div className="p-4 sm:p-5 bg-slate-100/50 max-h-[calc(85vh-130px)] overflow-y-auto">
          <div
            id="printable-plaque"
            className="border-2 border-slate-300 rounded-xl p-4 sm:p-5 bg-white text-center shadow-md relative flex flex-col items-center text-slate-900"
          >
            {/* Screw holes representation for realism */}
            <div className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-200 absolute top-2.5 left-2.5" />
            <div className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-200 absolute top-2.5 right-2.5" />
            <div className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-200 absolute bottom-2.5 left-2.5" />
            <div className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-200 absolute bottom-2.5 right-2.5" />

            {/* Brand Logo & Condo info */}
            <div className="mb-2 flex justify-center">
              <BicicletarioFacilLogo variant="centered" size="sm" />
            </div>

            <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              <Bike className="w-3.5 h-3.5 text-slate-900 stroke-[2.2]" />
              <span>{condominiumName}</span>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold tracking-wide font-mono uppercase">
              Controle de Vaga Suspensa
            </p>

            {/* Big Spot Number */}
            <div className="my-2 py-1 px-5 bg-slate-900 text-white rounded-md shadow-xs">
              <span className="text-3xl font-black tracking-widest font-mono">
                {spot.spotNumber}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 font-semibold mb-2 font-mono">
              {spot.sector} • Suporte: {spot.hookType}
            </p>

            {/* QR Code image */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs mb-2.5">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code da Vaga ${spot.spotNumber}`}
                  className="w-44 h-44 mx-auto"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs font-mono">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Code identifier */}
            <div className="bg-slate-100 border border-slate-300 rounded-md px-3 py-0.5 text-[11px] font-mono font-bold text-slate-800 tracking-wider mb-2">
              {spot.qrCodeValue}
            </div>

            <p className="text-[11px] text-slate-600 leading-snug max-w-xs font-medium">
              Aponte a câmera do seu celular para verificar o apartamento e bike autorizada ou solicitar viabilidade de vaga livre à administração.
            </p>
          </div>

          {/* Simulate Resident Scan / Test Link */}
          <div className="mt-3.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                <span>Simulação da Leitura pelo Morador:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                title="Copiar link de consulta externa"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-tight">
              Veja exatamente o que o morador ou qualquer pessoa visualiza ao apontar a câmera do smartphone para este QR Code fora do aplicativo:
            </p>

            {onOpenPublicConsult && (
              <button
                id="test-public-consult-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublicConsult(spot);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <span>Abrir Tela de Identificação desta Vaga</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 glass-header border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            id="download-qr-btn"
            type="button"
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-mono font-medium transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>Baixar Imagem</span>
          </button>
          <button
            id="print-qr-btn"
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Imprimir Plaqueta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
