import React, { useState } from 'react';
import { RegisteredBicycle, SystemConfig } from '../types';
import { generateBicyclesPdf, PdfExportOptions } from '../utils/pdfGenerator';
import {
  X,
  FileDown,
  Image as ImageIcon,
  CheckCircle2,
  Building,
  ArrowUpDown,
  Filter,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBikes: RegisteredBicycle[];
  filteredBikes: RegisteredBicycle[];
  currentSearchTerm?: string;
  config: SystemConfig;
  onToast: (msg: string, type?: 'success' | 'info') => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  allBikes,
  filteredBikes,
  currentSearchTerm,
  config,
  onToast,
}) => {
  const [scope, setScope] = useState<'all' | 'filtered'>(
    currentSearchTerm?.trim() ? 'filtered' : 'all'
  );
  const [includePhotos, setIncludePhotos] = useState(true);
  const [sortBy, setSortBy] = useState<'apartment' | 'resident' | 'spot' | 'recent'>('apartment');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  if (!isOpen) return null;

  const targetBikes = scope === 'filtered' ? filteredBikes : allBikes;
  const withSpotCount = targetBikes.filter((b) => !!b.spotNumber).length;
  const withoutSpotCount = targetBikes.length - withSpotCount;

  const handleDownload = async () => {
    if (targetBikes.length === 0) {
      onToast('Nenhuma bicicleta encontrada para exportar no critério selecionado.', 'info');
      return;
    }

    try {
      setIsGenerating(true);
      setProgressText('Iniciando montagem do relatório...');
      setProgressPct(5);

      await generateBicyclesPdf(targetBikes, config, {
        condominiumName: config.condominiumName,
        includePhotos,
        sortBy,
        filterLabel: scope === 'filtered' && currentSearchTerm ? `Busca "${currentSearchTerm}"` : undefined,
        onProgress: (text, pct) => {
          setProgressText(text);
          setProgressPct(pct);
        },
      });

      onToast(`Relatório PDF com ${targetBikes.length} bicicleta(s) gerado com sucesso!`, 'success');
      setTimeout(() => {
        setIsGenerating(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setIsGenerating(false);
      onToast('Ocorreu uma falha ao gerar o arquivo PDF. Tente novamente.', 'info');
    }
  };

  return (
    <div
      id="pdf-export-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="pdf-export-modal"
        className="w-full max-w-lg glass-card text-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/90 glass-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <FileDown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight">
                Baixar Relatório em PDF
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono">
                Cadastro resumido com miniaturas das fotos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs font-mono">
          {/* Summary Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>{config.condominiumName}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white text-slate-900 font-bold border border-slate-200">
                {targetBikes.length} Bicicleta(s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
              <div>
                Vagas Fixas Alocadas: <strong className="text-emerald-700">{withSpotCount}</strong>
              </div>
              <div>
                Sem Vaga Vinculada: <strong className="text-amber-700">{withoutSpotCount}</strong>
              </div>
            </div>
          </div>

          {/* Scope selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">Quais bicicletas exportar?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-0.5">
                  <span>Todas Cadastradas</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${scope === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {allBikes.length}
                  </span>
                </div>
                <p className={`text-[10px] leading-tight ${scope === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Exporta o acervo completo do condomínio
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'filtered'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-0.5">
                  <span>Apenas Filtradas</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${scope === 'filtered' ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {filteredBikes.length}
                  </span>
                </div>
                <p className={`text-[10px] leading-tight ${scope === 'filtered' ? 'text-slate-300' : 'text-slate-500'}`}>
                  {currentSearchTerm ? `Filtro atual: "${currentSearchTerm}"` : 'Apenas itens visíveis na tela'}
                </p>
              </button>
            </div>
          </div>

          {/* Sort order option */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Ordem de Apresentação no PDF</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="apartment">Apartamento e Bloco (Padrão Prioritário)</option>
              <option value="resident">Nome do Morador (A-Z)</option>
              <option value="spot">Número da Vaga Suspensa</option>
              <option value="recent">Data de Cadastro (Mais Recentes Primeiro)</option>
            </select>
          </div>

          {/* Include thumbnail photos toggle */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs">Miniaturas das Fotos</p>
                <p className="text-[10px] text-slate-500">
                  Imagens compactadas ao lado dos dados para identificação visual rápida
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              id="include-photos-toggle"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
          </div>

          {/* Generation progress bar if running */}
          {isGenerating && (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>{progressText}</span>
                </span>
                <span className="font-bold">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/90 glass-header flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-mono text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="confirm-generate-pdf-btn"
            onClick={handleDownload}
            disabled={isGenerating || targetBikes.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Baixar PDF ({targetBikes.length} bikes)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
