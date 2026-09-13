export type ConcessionType = 'vitalicio' | 'determinado';

export type SpotStatus = 'disponivel' | 'ocupada' | 'vencida';

export type BikeCategory = 'Mountain Bike' | 'Speed / Road' | 'Urbana' | 'Elétrica' | 'Gravel' | 'Dobrável' | 'Infantil';

export type BikeReportReason = 'reevaluacao_bienal' | 'reavaliacao_bienal' | 'lugar_indevido' | 'condicoes_criticas' | 'outro';

export interface BicycleDetails {
  brandModel: string;
  color: string;
  category: BikeCategory;
  tagNumber: string; // Selo do condomínio
  serialNumber?: string; // Chassi / Número de série do quadro
  distinguishingFeatures?: string; // Características visuais marcantes (adesivos, acessórios, marcas)
  notes?: string;
}

export interface RegisteredBicycle {
  id: string;
  brandModel: string;
  color: string;
  category: BikeCategory;
  tagNumber: string; // Selo do condomínio
  serialNumber?: string; // Chassi / Número do quadro
  distinguishingFeatures?: string; // Detalhes visuais (adesivos, cesto, farol, suporte, marcas)
  notes?: string;
  photoUrl: string;

  // Dono / Morador
  residentName: string;
  apartment: string;
  block: string;
  residentPhone: string; // WhatsApp
  residentEmail?: string;

  // Vaga vinculada (se houver)
  spotId?: string;
  spotNumber?: string;

  registeredAt: string; // Data de cadastro original no condomínio ISO
  lastReevaluatedAt?: string; // Data da última reavaliação bienal ISO
  reevaluationStatus?: 'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada';
  reevaluationNotes?: string;
  lastReportDate?: string;
  lastReportReason?: BikeReportReason;
}

export interface ResidentAllocation {
  id: string;
  spotId: string;
  apartment: string; // Ex: "104"
  block: string; // Ex: "Bloco A"
  residentName: string;
  residentPhone: string;
  residentEmail?: string;
  concessionType: ConcessionType;
  startDate: string; // ISO date
  endDate?: string; // ISO date (only if concessionType === 'determinado')
  bicycle: BicycleDetails;
  photoUrl: string; // Foto da bike suspensa / vaga
  allocatedAt: string;
  bicycleId?: string; // Link to registered bicycle
}

export interface UsageLog {
  id: string;
  spotId?: string;
  spotNumber?: string;
  apartment: string;
  residentName: string;
  type:
    | 'check_in_uso'
    | 'alocacao'
    | 'renovacao'
    | 'desocupacao'
    | 'vistoria_ociosidade'
    | 'notificacao_reporte'
    | 'cadastro_bike'
    | 'reavaliacao_bienal'
    | 'exclusao_bike';
  timestamp: string; // ISO date
  method: 'qr_code' | 'painel_admin' | 'totem_portaria' | 'whatsapp';
  notes?: string;
}

export interface BicycleSpot {
  id: string;
  spotNumber: string; // Ex: "S-01"
  sector: string; // Ex: "Setor A - Parede Norte"
  wallPosition: number; // Index in wall
  maxWeightKg: number; // Ex: 30kg (capacidade do gancho suspenso)
  hookType: 'Gancho Vertical c/ Apoio de Pneu' | 'Suporte Articulado Giratório' | 'Gancho Teto Suspenso';
  currentAllocation?: ResidentAllocation;
  lastUsageDate?: string; // ISO date of last check-in
  qrCodeValue: string; // Unique string for QR code, e.g. "CONDO-BIKE-S01"
  /** Módulo visual que originou a vaga na planta baixa. */
  floorPlanModuleId?: string;
}

export interface CondoModuleConfig {
  id: string;
  name: string; // Ex: "Módulo 1 - Subsolo (Ganchos 01 a 50)"
  prefix: string; // Ex: "S-", "V-", "G-"
  startNumber: number; // Ex: 1
  spotCount: number; // Ex: 25, 50, 100
  hookType: 'Gancho Vertical c/ Apoio de Pneu' | 'Suporte Articulado Giratório' | 'Gancho Teto Suspenso';
  maxWeightKg: number; // Ex: 28, 30, 35
}

export interface CondominiumProfile {
  id: string;
  condominiumName: string;
  condominiumCode?: string;
  city?: string;
  managerName?: string;
  managerPhone?: string;
  notes?: string;
  modules: CondoModuleConfig[];
  totalSpots: number;
  savedAt: string;
}

export interface SectorPhotoData {
  photoUrl: string; // Base64 or URL of the sector photo
  description?: string; // e.g. "Parede Norte próxima ao portão dos blocos A e B"
  updatedAt?: string;
}

export interface FloorPlanModule {
  id: string;
  name: string;
  x: number; // posição percentual no quadro
  y: number;
  width: number;
  height: number;
  spotCapacity: number;
  style?: 'regular' | 'protected';
  kind?: 'bike_module' | 'wall' | 'column' | 'corridor' | 'entrance';
  flowDirection?: 'horizontal' | 'vertical';
  /** Setor/bloco operacional cujas vagas aparecem neste módulo. */
  assignedSector?: string;
}

export interface SectorFloorPlan {
  modules: FloorPlanModule[];
  /** Nome comercial/operacional da planta, independente dos setores que ela reúne. */
  name?: string;
  updatedAt?: string;
}

export interface SystemConfig {
  condominiumName: string;
  condominiumCode?: string; // Código/CNPJ/Contrato do cliente
  condominiumCity?: string; // Cidade/UF
  managerName?: string; // Nome do Síndico / Gestor
  managerPhone?: string; // WhatsApp / Telefone da Administração
  deploymentNotes?: string; // Notas de entrega técnica da implantação
  idleDaysThreshold: number; // Dias sem uso para alertar ociosidade (ex: 30)
  expiryWarningDays: number; // Dias antes de vencer para alertar
  totalSuspendedHooks: number;

  // Fotos de identificação física dos setores
  sectorPhotos?: Record<string, SectorPhotoData>;
  sectorFloorPlans?: Record<string, SectorFloorPlan>;
  /** Setores criados na implantação técnica antes da criação das vagas. */
  customSectors?: string[];

  // Customização de Módulos e Governança Master
  modules?: CondoModuleConfig[];
  masterPin?: string; // Senha Master do prestador (padrão '1997')
  lockCondoNameForSyndic?: boolean; // Bloqueia alteração do nome do condomínio pelo síndico
  lockResetDemoForSyndic?: boolean; // Bloqueia restauração acidental de demo pelo síndico
  clientProfiles?: CondominiumProfile[]; // Perfis de condomínios clientes salvos
}
