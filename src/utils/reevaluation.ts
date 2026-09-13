import { RegisteredBicycle } from '../types';

export interface ReevaluationInfo {
  isDue: boolean; // Precisa de reavaliação bienal (>= 2 anos sem reavaliação)
  daysSinceLastCheck: number;
  monthsSinceLastCheck: number;
  yearsSinceLastCheck: number;
  timeDescription: string; // Ex: "2 anos e 5 meses" ou "1 ano e 2 meses"
  baselineDate: string; // Data base considerada (lastReevaluatedAt ou registeredAt)
  baselineType: 'cadastro' | 'reavaliacao_anterior';
  isAllocatedInSpot: boolean;
  statusBadge: {
    label: string;
    description: string;
    variant: 'danger' | 'warning' | 'success';
  };
}

export function formatTimeSpan(days: number): string {
  if (days < 30) {
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  const months = Math.floor(days / 30.4375);
  if (months < 12) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${
    remainingMonths === 1 ? 'mês' : 'meses'
  }`;
}

export function getBikeReevaluationInfo(
  bike: RegisteredBicycle,
  refDateStr: string = new Date().toISOString()
): ReevaluationInfo {
  const refDate = new Date(refDateStr);

  const baselineDate = bike?.lastReevaluatedAt || bike?.registeredAt || refDateStr;
  const baselineType: 'cadastro' | 'reavaliacao_anterior' = bike?.lastReevaluatedAt
    ? 'reavaliacao_anterior'
    : 'cadastro';

  const baseDateObj = new Date(baselineDate);
  const validBaseDate = isNaN(baseDateObj.getTime()) ? refDate : baseDateObj;
  const diffTime = Math.max(0, refDate.getTime() - validBaseDate.getTime());
  const daysSinceLastCheck = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const monthsSinceLastCheck = Math.floor(daysSinceLastCheck / 30.4375);
  const yearsSinceLastCheck = Number((daysSinceLastCheck / 365.25).toFixed(1));

  // 2 years threshold = 730 days
  const isDue = daysSinceLastCheck >= 730;

  const timeDescription = formatTimeSpan(daysSinceLastCheck);

  let statusBadge: ReevaluationInfo['statusBadge'];

  if (bike?.reevaluationStatus === 'abandonada' || bike?.reevaluationStatus === 'morador_inativo') {
    statusBadge = {
      label: 'Sinais de Abandono / Irregular',
      description: 'Morador não reside mais ou bike com deterioração física',
      variant: 'danger',
    };
  } else if (isDue) {
    statusBadge = {
      label: 'Reavaliação Bienal (+2 Anos)',
      description: `Cadastrada há ${timeDescription}. Requer verificação de morador ativo e estado`,
      variant: 'warning',
    };
  } else {
    statusBadge = {
      label: 'Reavaliação em Dia',
      description: `Verificação bienal em dia (último registro há ${timeDescription})`,
      variant: 'success',
    };
  }

  return {
    isDue,
    daysSinceLastCheck,
    monthsSinceLastCheck,
    yearsSinceLastCheck,
    timeDescription,
    baselineDate,
    baselineType,
    isAllocatedInSpot: !!bike?.spotNumber,
    statusBadge,
  };
}
