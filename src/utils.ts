import { BicycleSpot, SpotStatus } from './types';

export function getDaysDifference(dateString?: string): number {
  if (!dateString) return 9999;
  const now = new Date();
  const past = new Date(dateString);
  const diffTime = now.getTime() - past.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getDaysRemaining(endDateString?: string): number {
  if (!endDateString) return 0;
  const now = new Date();
  const end = new Date(endDateString);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export interface SpotCalculatedInfo {
  status: SpotStatus;
  statusLabel: string;
  idleDays: number;
  isIdle: boolean;
  daysRemaining?: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export function evaluateSpot(
  spot: BicycleSpot,
  _idleDaysThreshold: number = 30,
  expiryWarningDays: number = 15
): SpotCalculatedInfo {
  if (!spot.currentAllocation) {
    return {
      status: 'disponivel',
      statusLabel: 'Disponível',
      idleDays: 0,
      isIdle: false,
      isExpiringSoon: false,
      isExpired: false,
    };
  }

  const allocation = spot.currentAllocation;
  let isExpired = false;
  let isExpiringSoon = false;
  let daysRemaining: number | undefined;

  if (allocation.concessionType === 'determinado' && allocation.endDate) {
    daysRemaining = getDaysRemaining(allocation.endDate);
    if (daysRemaining <= 0) {
      isExpired = true;
    } else if (daysRemaining <= expiryWarningDays) {
      isExpiringSoon = true;
    }
  }

  if (isExpired) {
    return {
      status: 'vencida',
      statusLabel: 'Prazo Vencido',
      idleDays: 0,
      isIdle: false,
      daysRemaining,
      isExpiringSoon: false,
      isExpired: true,
    };
  }

  return {
    status: 'ocupada',
    statusLabel: 'Ocupada',
    idleDays: 0,
    isIdle: false,
    daysRemaining,
    isExpiringSoon,
    isExpired: false,
  };
}

export function formatDatePt(dateString?: string): string {
  if (!dateString) return 'Não registrado';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeTimePt(dateString?: string): string {
  if (!dateString) return 'Nunca registrado';
  const days = getDaysDifference(dateString);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'Há 1 mês';
  if (months < 12) return `Há ${months} meses (${days} dias)`;
  return `Há mais de 1 ano (${days} dias)`;
}
