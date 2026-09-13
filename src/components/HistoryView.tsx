import React, { useState } from 'react';
import { UsageLog } from '../types';
import { formatRelativeTimePt, formatDatePt } from '../utils';
import {
  History,
  QrCode,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Trash2,
  Bike,
} from 'lucide-react';

interface HistoryViewProps {
  logs: UsageLog[];
  onSelectSpotById?: (spotId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, onSelectSpotById }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.spotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.apartment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || log.type === filterType;

    return matchesSearch && matchesType;
  });

  const getLogBadge = (type: UsageLog['type']) => {
    switch (type) {
      case 'check_in_uso':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Check-in de Uso',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'alocacao':
        return {
          icon: <UserPlus className="w-3.5 h-3.5 text-slate-700" />,
          label: 'Nova Concessão',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
        };
      case 'renovacao':
        return {
          icon: <Calendar className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Renovação de Prazo',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'desocupacao':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Desocupação',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'exclusao_bike':
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Exclusão de Cadastro',
          bg: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
        };
      case 'cadastro_bike':
        return {
          icon: <Bike className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Novo Cadastro Bike',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'reavaliacao_bienal':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Reavaliação +2 Anos',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      case 'notificacao_reporte':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Notificação WhatsApp',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'vistoria_ociosidade':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Vistoria Predial',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      default:
        return {
          icon: <Bike className="w-3.5 h-3.5 text-slate-600" />,
          label: type,
          bg: 'glass-input text-slate-700 border-slate-300',
        };
    }
  };

  return (
    <div className="glass-panel rounded-xl shadow-xl overflow-hidden text-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/90 glass-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shadow-sm">
            <History className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-mono tracking-tight">
              Histórico de Uso & Auditoria dos Moradores
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Controle detalhado de check-ins via QR Code, concessões e movimentações das vagas
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div id="history-filters-container" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="history-search-input"
              placeholder="Buscar apto, vaga, morador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 glass-input text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-slate-500 shadow-2xs"
            />
          </div>

          <select
            id="history-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 glass-input font-mono text-slate-800 focus:outline-none focus:border-slate-500 shadow-2xs"
          >
            <option value="all">Todos os Eventos</option>
            <option value="check_in_uso">Check-in de Uso</option>
            <option value="alocacao">Novas Concessões</option>
            <option value="cadastro_bike">Cadastros de Bike</option>
            <option value="reavaliacao_bienal">Reavaliações +2 Anos</option>
            <option value="vistoria_ociosidade">Vistorias Prediais</option>
            <option value="notificacao_reporte">Notificações WhatsApp</option>
            <option value="renovacao">Renovações</option>
            <option value="desocupacao">Desocupações</option>
            <option value="exclusao_bike">Exclusões de Cadastro</option>
          </select>
        </div>
      </div>

      {/* Mobile Card Feed View (Shown on small screens) */}
      <div className="block md:hidden divide-y divide-slate-200/80">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const badge = getLogBadge(log.type);
            return (
              <div key={log.id} className="p-4 space-y-2 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatRelativeTimePt(log.timestamp)} • {formatDatePt(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs font-mono">
                      Apto {log.apartment}
                    </h4>
                    <p className="text-[11px] text-slate-600 font-mono">
                      {log.residentName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSpotById && onSelectSpotById(log.spotId)}
                    className="font-bold text-xs text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 font-mono transition-colors shadow-2xs"
                  >
                    {log.spotNumber}
                  </button>
                </div>

                {log.notes && (
                  <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {log.notes}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs font-mono p-4">
            Nenhum registro de uso encontrado para os filtros selecionados.
          </div>
        )}
      </div>

      {/* Desktop Table View (Shown on screens md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="glass-input text-slate-600 font-mono border-b border-slate-200 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Data & Horário</th>
              <th className="py-2.5 px-4">Vaga Suspensa</th>
              <th className="py-2.5 px-4">Apartamento & Morador</th>
              <th className="py-2.5 px-4">Tipo de Registro</th>
              <th className="py-2.5 px-4">Canal / Método</th>
              <th className="py-2.5 px-4">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 font-mono">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const badge = getLogBadge(log.type);
                return (
                  <tr key={log.id} className="hover:bg-slate-100/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block">
                        {formatRelativeTimePt(log.timestamp)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDatePt(log.timestamp)}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectSpotById && onSelectSpotById(log.spotId)}
                        className="font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 transition-colors shadow-2xs"
                      >
                        {log.spotNumber}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block font-mono">
                        Apto {log.apartment}
                      </span>
                      <span className="text-slate-600 text-[11px] block font-sans">
                        {log.residentName}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                        {log.method === 'qr_code' ? (
                          <>
                            <QrCode className="w-3.5 h-3.5 text-slate-700" />
                            <span>QR Code (Gancho)</span>
                          </>
                        ) : log.method === 'painel_admin' ? (
                          <>
                            <span>Painel Admin</span>
                          </>
                        ) : (
                          <>
                            <span>Totem Portaria</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-sans" title={log.notes}>
                      {log.notes || '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-mono">
                  Nenhum registro de uso encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
