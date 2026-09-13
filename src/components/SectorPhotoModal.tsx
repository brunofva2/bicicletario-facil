import React, { useState, useRef } from 'react';
import { processImageFileToBase64 } from '../utils/imageUpload';
import { SectorPhotoData } from '../types';
import {
  X,
  Camera,
  Upload,
  MapPin,
  Trash2,
  Check,
  Loader2,
  Info,
  Maximize2,
  Building,
} from 'lucide-react';

interface SectorPhotoModalProps {
  isOpen: boolean;
  sectorName: string;
  sectorSpotCount: number;
  initialData?: SectorPhotoData;
  onClose: () => void;
  onSave: (sectorName: string, data: SectorPhotoData | null) => void;
}

export const SectorPhotoModal: React.FC<SectorPhotoModalProps> = ({
  isOpen,
  sectorName,
  sectorSpotCount,
  initialData,
  onClose,
  onSave,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(initialData?.photoUrl || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if modal reopens with different initialData
  React.useEffect(() => {
    if (isOpen) {
      setPhotoUrl(initialData?.photoUrl || '');
      setDescription(initialData?.description || '');
      setErrorMessage(null);
      setIsFullView(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1000px max, 82% quality - ideal balance of crisp clarity for architectural view and light size (~80-140KB)
      const base64Image = await processImageFileToBase64(file, 1000, 1000, 0.82);
      setPhotoUrl(base64Image);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar imagem.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = () => {
    if (!photoUrl) {
      onSave(sectorName, null);
      onClose();
      return;
    }

    onSave(sectorName, {
      photoUrl,
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setDescription('');
  };

  return (
    <div
      id="sector-photo-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="sector-photo-modal-content"
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
                  Identificação do Local
                </span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-400/20 text-indigo-200 text-[10px] font-mono">
                  {sectorSpotCount} ganchos
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold font-sans text-white truncate">
                {sectorName}
              </h2>
            </div>
          </div>

          <button
            id="close-sector-photo-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto font-sans flex-1">
          {/* Info pill */}
          <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs font-mono flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>Foto de Referência Física:</strong> Anexe uma foto real da parede, subsolo ou corredor onde este setor fica instalado. Isso permite ao síndico, zelador e moradores localizarem as vagas imediatamente sem dúvidas.
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Photo Display / Upload Zone */}
          <div className="space-y-3">
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-300 bg-slate-900 group shadow-sm">
                <img
                  src={photoUrl}
                  alt={`Local do setor ${sectorName}`}
                  className={`w-full ${
                    isFullView ? 'max-h-[60vh] object-contain' : 'h-64 object-cover'
                  } transition-all duration-200`}
                />

                {/* Overlaid quick actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    title={isFullView ? 'Visualização Padrão' : 'Expandir Imagem'}
                    onClick={() => setIsFullView(!isFullView)}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors shadow-xs"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title="Excluir foto"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white text-[11px] font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    Foto Anexada
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-300 hover:text-white underline font-semibold text-[10px]"
                  >
                    Substituir Foto
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 transition-colors text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-2xs">
                  <Building className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                    Nenhuma foto cadastrada para este setor
                  </h4>
                  <p className="text-[11px] font-mono text-slate-500 mt-1 max-w-sm mx-auto">
                    Tire uma foto no celular ou anexe uma imagem do computador da parede onde ficam os ganchos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-98 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir da Galeria / Arquivo PC</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                        fileInputRef.current.removeAttribute('capture');
                      }
                    }}
                    className="py-2 px-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center gap-2 shadow-2xs transition-all"
                  >
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Tirar Foto Agora</span>
                  </button>
                </div>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-indigo-700 font-semibold pt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando e otimizando imagem...</span>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Description / Reference point input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Ponto de Referência / Instrução de Localização:</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Subsolo 1 - Parede ao lado da lixeira seletiva e portão do Bloco B"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none glass-input"
            />
            <p className="text-[10px] font-mono text-slate-500">
              Dica: Descreva detalhes que facilitem achar o local mesmo para quem acabou de mudar para o condomínio.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-rose-600 hover:text-rose-700 text-xs font-mono font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Foto</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-all shadow-xs active:scale-98 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Localização</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
