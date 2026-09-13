import React from 'react';
import { RegisteredBicycle } from '../types';
import {
  AlertTriangle,
  Trash2,
  X,
  Bike,
  User,
  Tag,
  ShieldAlert,
  Building,
  Phone,
} from 'lucide-react';

interface DeleteBikeConfirmModalProps {
  bike: RegisteredBicycle | null;
  onClose: () => void;
  onConfirm: (bike: RegisteredBicycle) => void;
}

export const DeleteBikeConfirmModal: React.FC<DeleteBikeConfirmModalProps> = ({
  bike,
  onClose,
  onConfirm,
}) => {
  if (!bike) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Alert Bar */}
        <div className="bg-rose-50 border-b border-rose-200/80 p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-rose-950">
                Excluir Cadastro de Bicicleta
              </h3>
              <p className="text-xs text-rose-800 font-mono">
                Confirmação de exclusão permanente do cadastro predial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Bicycle Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
              {bike.photoUrl ? (
                <img
                  src={bike.photoUrl}
                  alt={bike.brandModel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Bike className="w-7 h-7" />
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0 flex-1 text-xs font-mono">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 truncate text-sm">
                  Apto {bike.apartment} ({bike.block}) • {bike.residentName}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-200 text-slate-700 shrink-0">
                  {bike.category}
                </span>
              </div>
              <p className="text-slate-800 text-[11px] font-semibold">
                Bike: <span className="font-bold text-slate-900">{bike.brandModel}</span> ({bike.color})
                {bike.tagNumber && (
                  <span className="ml-2 text-slate-500">• Selo: {bike.tagNumber}</span>
                )}
              </p>
              <p className="text-slate-600 text-[11px] flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{bike.residentPhone}</span>
              </p>
            </div>
          </div>

          {/* Warning if linked to a spot */}
          {bike.spotNumber && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs font-mono">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900">
                  Vaga Suspensa Vinculada: Vaga {bike.spotNumber}
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Ao excluir o cadastro desta bicicleta, a <strong>Vaga Suspensa {bike.spotNumber}</strong> será
                  automaticamente <strong>desocupada e liberada</strong> para o condomínio alocar a outro morador.
                </p>
              </div>
            </div>
          )}

          {/* Irreversible Action Warning */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 flex items-start gap-2.5 text-xs font-mono">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900">
                Atenção: Esta ação não pode ser desfeita!
              </p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                O registro da bicicleta será removido da base de dados e do catálogo geral. Um evento de auditoria será gerado no histórico do sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            id="cancel-delete-bike-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-mono text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="confirm-delete-bike-btn"
            onClick={() => onConfirm(bike)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Trash2 className="w-4 h-4 stroke-[2.2]" />
            <span>Sim, Excluir Cadastro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
