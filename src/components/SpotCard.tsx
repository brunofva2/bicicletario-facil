import React from 'react';
import { BicycleSpot, SystemConfig } from '../types';
import { evaluateSpot, formatRelativeTimePt } from '../utils';
import { getBikeFallbackPhoto } from '../utils/offlineBikes';
import { Bike, QrCode, AlertTriangle, Clock, ShieldCheck, User, Sparkles } from 'lucide-react';

interface SpotCardProps {
  spot: BicycleSpot;
  config: SystemConfig;
  isSelected: boolean;
  onSelect: (spot: BicycleSpot) => void;
  onQuickQr: (spot: BicycleSpot, e: React.MouseEvent) => void;
}

export const SpotCard: React.FC<SpotCardProps> = React.memo(({
  spot,
  config,
  isSelected,
  onSelect,
  onQuickQr,
}) => {
  const { currentAllocation } = spot;
  const { status, daysRemaining, isExpiringSoon, isExpired } = evaluateSpot(
    spot,
    config.idleDaysThreshold,
    config.expiryWarningDays
  );

  const isOccupied = !!currentAllocation;
  const statusLabel = !isOccupied
    ? 'Livre'
    : isExpired
      ? 'Vencida'
      : isExpiringSoon
        ? 'Reavaliar'
        : currentAllocation?.concessionType === 'vitalicio'
          ? 'Vitalícia'
          : 'Ocupada';

  // Visual status styling
  let borderClass = 'border-slate-200/90 glass-card hover:border-slate-400 hover:shadow-md';
  let hookColor = 'text-slate-500';

  if (!isOccupied) {
    borderClass = isSelected
      ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50/90 scale-105 z-10 shadow-md'
      : 'border border-emerald-200/90 bg-emerald-50/40 hover:bg-emerald-50/80 hover:border-emerald-400';
    hookColor = 'text-emerald-600';
  } else if (isExpired) {
    borderClass = isSelected
      ? 'border-rose-600 ring-2 ring-rose-500 bg-rose-50/90 scale-105 z-10 shadow-md'
      : 'border border-rose-200/90 bg-rose-50/40 hover:border-rose-400';
    hookColor = 'text-rose-600';
  } else if (isExpiringSoon) {
    borderClass = isSelected
      ? 'border-amber-600 ring-2 ring-amber-500 bg-amber-50/90 scale-105 z-10 shadow-md'
      : 'border border-amber-200/90 bg-amber-50/30 hover:border-amber-400';
    hookColor = 'text-amber-600';
  } else if (currentAllocation?.concessionType === 'vitalicio') {
    borderClass = isSelected
      ? 'border-indigo-600 ring-2 ring-indigo-500 bg-indigo-50/90 scale-105 z-10 shadow-md'
      : 'border border-indigo-200/90 bg-indigo-50/30 hover:border-indigo-400';
    hookColor = 'text-indigo-600';
  } else {
    // Normal occupied (determinado)
    borderClass = isSelected
      ? 'border-slate-900 ring-2 ring-slate-800 bg-slate-50/90 scale-105 z-10 shadow-md'
      : 'border border-slate-200/90 bg-white/70 hover:border-slate-400';
    hookColor = 'text-slate-700';
  }

  return (
    <div
      id={`spot-card-${spot.id}`}
      data-spot-status={status}
      data-spot-state={!isOccupied ? 'free' : isExpired ? 'expired' : isExpiringSoon ? 'warning' : currentAllocation?.concessionType === 'vitalicio' ? 'lifetime' : 'occupied'}
      onClick={() => onSelect(spot)}
      className={`group relative flex cursor-pointer select-none flex-col justify-between overflow-hidden rounded-2xl p-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${borderClass} ${isSelected ? 'spot-card-selected' : ''}`}
    >
      <span className={`absolute left-0 top-0 h-1 w-full ${!isOccupied ? 'bg-emerald-500' : isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-400' : currentAllocation?.concessionType === 'vitalicio' ? 'bg-indigo-500' : 'bg-[#f4a000]'}`} />
      {/* Top Hook Bracket Representation (Gancho de Parede Suspenso) */}
      <div className="mt-1 flex items-center justify-between gap-1.5 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-1.5">
          {/* Industrial anchor bracket */}
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-3 bg-slate-400 rounded-xs" title="Suporte de Parede" />
            <span
              className={`text-xs font-mono font-bold tracking-tight ${
                !isOccupied
                  ? 'text-emerald-700'
                  : currentAllocation.concessionType === 'vitalicio'
                  ? 'text-indigo-800'
                  : 'text-slate-900'
              }`}
            >
              {spot.spotNumber}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono font-medium">
            {spot.maxWeightKg}kg
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${!isOccupied ? 'bg-emerald-100 text-emerald-700' : isExpired ? 'bg-rose-100 text-rose-700' : isExpiringSoon ? 'bg-amber-100 text-amber-700' : currentAllocation?.concessionType === 'vitalicio' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{statusLabel}</span>
        {/* QR Code quick action button */}
        <button
          id={`spot-qr-btn-${spot.id}`}
          data-qr-btn="true"
          type="button"
          onClick={(e) => onQuickQr(spot, e)}
          title="Ver Plaqueta QR Code da Vaga"
          className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <QrCode className="w-3 h-3" />
        </button>
        </div>
      </div>

      {/* Main Hook & Bike representation */}
      <div className="py-2.5 flex flex-col items-center justify-center min-h-[92px] text-center">
        {isOccupied ? (
          <div className="w-full flex flex-col items-center">
            {/* Suspended Hook Graphic */}
            <div className="relative mb-1.5">
              <div className="w-1 h-2.5 bg-slate-400 mx-auto rounded-t-xs" />
              <div className="w-5 h-2.5 border-b-2 border-l-2 border-r-2 border-slate-500 rounded-b-xs mx-auto -mt-0.5" />
              
              {/* Bike thumbnail avatar */}
              <div className="relative mt-1">
                <img
                  src={currentAllocation.photoUrl || getBikeFallbackPhoto(0)}
                  alt={currentAllocation.bicycle?.brandModel || 'Bicicleta'}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = getBikeFallbackPhoto(0);
                  }}
                  className="w-12 h-12 object-cover rounded-md shadow-xs border border-slate-200 group-hover:scale-105 transition-transform"
                />
                <span className={`absolute -bottom-1 -right-1 p-0.5 rounded bg-white border border-slate-200 shadow-xs ${hookColor}`}>
                  <Bike className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Apartment & Resident info */}
            <div className="w-full">
              <div className="flex items-center justify-center gap-1 font-bold text-slate-900 text-xs">
                <span className="font-mono">Apto {currentAllocation.apartment}</span>
                {currentAllocation.block && (
                  <span className="text-slate-500 font-normal text-[10px]">
                    ({(currentAllocation.block || '').replace('Bloco ', 'Bl.')})
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-600 truncate max-w-[120px] mx-auto mt-0.5 font-medium" title={currentAllocation.residentName}>
                {currentAllocation.residentName}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 text-emerald-600">
            {/* Empty Hook graphic */}
            <div className="relative mb-2">
              <div className="w-1 h-3 bg-emerald-500 mx-auto rounded-t-xs" />
              <div className="w-6 h-3 border-b-2 border-l-2 border-r-2 border-emerald-500 rounded-b-xs mx-auto -mt-0.5" />
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider">Livre</span>
            <span className="text-[9px] text-emerald-600 mt-0.5 font-mono">Disponível</span>
          </div>
        )}
      </div>

      {/* Footer Badges: Concession Type & Idle / Expiry status */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-1">
        {isOccupied ? (
          <>
            {/* Concession Type Badge */}
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
              {currentAllocation.concessionType === 'vitalicio' ? (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-bold shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" />
                  <span>Vitalício</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase font-bold shrink-0">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  <span>{isExpired ? 'Expirado' : `${daysRemaining}d`}</span>
                </span>
              )}

              {/* Tag Selo */}
              {currentAllocation.bicycle?.tagNumber && (
                <span className="text-[9px] font-mono text-slate-500 truncate font-medium text-right" title={currentAllocation.bicycle.tagNumber}>
                  {currentAllocation.bicycle.tagNumber}
                </span>
              )}
            </div>

            {/* Concession Status or Last Usage Status */}
            {isExpired ? (
              <div className="flex items-center gap-1 text-[9px] font-mono text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span className="truncate font-bold">Vencido</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="shrink-0">Uso:</span>
                <span className="text-slate-700 font-medium truncate ml-1 text-right">{formatRelativeTimePt(spot.lastUsageDate)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center text-[9px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 font-bold">
            Gancho Livre
          </div>
        )}
      </div>
    </div>
  );
});

SpotCard.displayName = 'SpotCard';
