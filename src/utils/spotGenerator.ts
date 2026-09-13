import { BicycleSpot, CondoModuleConfig, CondominiumProfile, SystemConfig } from '../types';

export const DEFAULT_MASTER_PIN = '1997';

export const DEFAULT_CONDO_PRESETS: {
  id: string;
  name: string;
  badge: string;
  description: string;
  totalSpots: number;
  modules: CondoModuleConfig[];
}[] = [
  {
    id: 'preset-20',
    name: 'Condomínio Compacto (20 Vagas)',
    badge: '20 Vagas',
    description: '1 Módulo único suspenso para condomínios pequenos ou torres únicas',
    totalSpots: 20,
    modules: [
      {
        id: 'mod-1',
        name: 'Módulo Único - Bicicletário Geral',
        prefix: 'V-',
        startNumber: 1,
        spotCount: 20,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 28,
      },
    ],
  },
  {
    id: 'preset-50',
    name: 'Condomínio Padrão (50 Vagas)',
    badge: '50 Vagas',
    description: '2 Módulos setorizados (Subsolo G1 + Térreo/Pátio)',
    totalSpots: 50,
    modules: [
      {
        id: 'mod-1',
        name: 'Módulo 1 - Subsolo G1 (Parede Norte)',
        prefix: 'S-',
        startNumber: 1,
        spotCount: 25,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 28,
      },
      {
        id: 'mod-2',
        name: 'Módulo 2 - Térreo / Pátio Externo',
        prefix: 'T-',
        startNumber: 26,
        spotCount: 25,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 30,
      },
    ],
  },
  {
    id: 'preset-100',
    name: 'Grande Porte (100 Vagas)',
    badge: '100 Vagas',
    description: '4 Módulos de 25 vagas com ganchos verticais e articulados reforçados',
    totalSpots: 100,
    modules: [
      {
        id: 'mod-1',
        name: 'Módulo A - Subsolo 1 (Ganchos 01 a 25)',
        prefix: 'A-',
        startNumber: 1,
        spotCount: 25,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 28,
      },
      {
        id: 'mod-2',
        name: 'Módulo B - Subsolo 1 (Ganchos 26 a 50)',
        prefix: 'B-',
        startNumber: 26,
        spotCount: 25,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 28,
      },
      {
        id: 'mod-3',
        name: 'Módulo C - Subsolo 2 (Ganchos 51 a 75)',
        prefix: 'C-',
        startNumber: 51,
        spotCount: 25,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 30,
      },
      {
        id: 'mod-4',
        name: 'Módulo D - Subsolo 2 (Ganchos 76 a 100)',
        prefix: 'D-',
        startNumber: 76,
        spotCount: 25,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 30,
      },
    ],
  },
  {
    id: 'preset-200',
    name: 'Mega Condomínio Residencial (200 Vagas)',
    badge: '200 Vagas',
    description: '4 Grandes setores de 50 vagas para empreendimentos multifamiliares',
    totalSpots: 200,
    modules: [
      {
        id: 'mod-1',
        name: 'Setor 1 - Garagem Norte (01 a 50)',
        prefix: 'GN-',
        startNumber: 1,
        spotCount: 50,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 30,
      },
      {
        id: 'mod-2',
        name: 'Setor 2 - Garagem Sul (51 a 100)',
        prefix: 'GS-',
        startNumber: 51,
        spotCount: 50,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 30,
      },
      {
        id: 'mod-3',
        name: 'Setor 3 - Subsolo Geral (101 a 150)',
        prefix: 'SG-',
        startNumber: 101,
        spotCount: 50,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 30,
      },
      {
        id: 'mod-4',
        name: 'Setor 4 - Área Central / E-Bikes (151 a 200)',
        prefix: 'SC-',
        startNumber: 151,
        spotCount: 50,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 35,
      },
    ],
  },
  {
    id: 'preset-500',
    name: 'Complexo Habitacional / Clube (500 Vagas)',
    badge: '500 Vagas',
    description: '5 Super módulos de 100 vagas para loteamentos fechados e condomínios clubes',
    totalSpots: 500,
    modules: [
      {
        id: 'mod-1',
        name: 'Módulo 1 - Subsolo Blocos A/B (001 a 100)',
        prefix: 'M1-',
        startNumber: 1,
        spotCount: 100,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 30,
      },
      {
        id: 'mod-2',
        name: 'Módulo 2 - Subsolo Blocos C/D (101 a 200)',
        prefix: 'M2-',
        startNumber: 101,
        spotCount: 100,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 30,
      },
      {
        id: 'mod-3',
        name: 'Módulo 3 - Subsolo Blocos E/F (201 a 300)',
        prefix: 'M3-',
        startNumber: 201,
        spotCount: 100,
        hookType: 'Gancho Vertical c/ Apoio de Pneu',
        maxWeightKg: 30,
      },
      {
        id: 'mod-4',
        name: 'Módulo 4 - Subsolo Blocos G/H (301 a 400)',
        prefix: 'M4-',
        startNumber: 301,
        spotCount: 100,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 30,
      },
      {
        id: 'mod-5',
        name: 'Módulo 5 - Bicicletário Central Clube (401 a 500)',
        prefix: 'M5-',
        startNumber: 401,
        spotCount: 100,
        hookType: 'Suporte Articulado Giratório',
        maxWeightKg: 35,
      },
    ],
  },
];

/**
 * Generates array of BicycleSpot objects based on defined modules.
 */
export function generateSpotsFromModules(
  modules: CondoModuleConfig[],
  existingSpots: BicycleSpot[] = [],
  preserveAllocations: boolean = true
): BicycleSpot[] {
  const result: BicycleSpot[] = [];

  // Map existing allocations by spotNumber or id
  const existingByNumber = new Map<string, BicycleSpot>();
  const existingById = new Map<string, BicycleSpot>();

  if (preserveAllocations && existingSpots.length > 0) {
    existingSpots.forEach((s) => {
      existingByNumber.set(s.spotNumber.toLowerCase().trim(), s);
      existingById.set(s.id, s);
    });
  }

  modules.forEach((mod, modIdx) => {
    const prefix = mod.prefix ? mod.prefix.trim() : 'V-';
    const startNum = Number(mod.startNumber) > 0 ? Number(mod.startNumber) : 1;
    const count = Number(mod.spotCount) > 0 ? Number(mod.spotCount) : 10;
    const hookType = mod.hookType || 'Gancho Vertical c/ Apoio de Pneu';
    const maxWeightKg = Number(mod.maxWeightKg) || 30;
    const sectorName = mod.name.trim() || `Módulo ${modIdx + 1}`;

    for (let i = 0; i < count; i++) {
      const currentNum = startNum + i;
      // Pad with leading zeros depending on capacity
      let numStr = `${currentNum}`;
      if (currentNum < 10) {
        numStr = `0${currentNum}`;
      }
      if (startNum + count > 100 && currentNum < 100) {
        numStr = currentNum < 10 ? `00${currentNum}` : `0${currentNum}`;
      }

      const spotNumber = `${prefix}${numStr}`;
      const id = `spot-m${modIdx + 1}-${currentNum}`;

      // Check if this spot existed previously with allocation
      const existing =
        existingByNumber.get(spotNumber.toLowerCase().trim()) ||
        existingById.get(id);

      const allocation =
        preserveAllocations && existing?.currentAllocation
          ? {
              ...existing.currentAllocation,
              spotId: id,
            }
          : undefined;

      const lastUsage =
        preserveAllocations && existing?.lastUsageDate
          ? existing.lastUsageDate
          : allocation
          ? new Date().toISOString()
          : undefined;

      result.push({
        id,
        spotNumber,
        sector: sectorName,
        wallPosition: i + 1,
        maxWeightKg,
        hookType,
        qrCodeValue: `COND-BIKE-${spotNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
        currentAllocation: allocation,
        lastUsageDate: lastUsage,
      });
    }
  });

  return result;
}

/**
 * Calculates total capacity across modules
 */
export function calculateTotalSpots(modules: CondoModuleConfig[]): number {
  return modules.reduce((acc, m) => acc + (Number(m.spotCount) || 0), 0);
}
