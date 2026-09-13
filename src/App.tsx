import React, { useState, useEffect, useMemo } from 'react';
import {
  BicycleSpot,
  SystemConfig,
  UsageLog,
  ResidentAllocation,
  ConcessionType,
  RegisteredBicycle,
  BikeReportReason,
  SectorPhotoData,
} from './types';
import { INITIAL_SPOTS, INITIAL_LOGS, DEFAULT_CONFIG, SAMPLE_BIKE_PHOTOS } from './mockData';
import { INITIAL_REGISTERED_BIKES } from './mockBikes';
import { getBikeReevaluationInfo } from './utils/reevaluation';
import { Header } from './components/Header';
import { SpotMap } from './components/SpotMap';
import { SpotDetailDrawer } from './components/SpotDetailDrawer';
import { AllocateModal } from './components/AllocateModal';
import { QrCodeModal } from './components/QrCodeModal';
import { SpotPublicConsultModal } from './components/SpotPublicConsultModal';
import { OciosidadeConfigModal } from './components/OciosidadeConfigModal';
import { HistoryView } from './components/HistoryView';
import { BikeCatalogView } from './components/BikeCatalogView';
import { BikeRegisterModal } from './components/BikeRegisterModal';
import { PdfExportModal } from './components/PdfExportModal';
import { BikeReportModal } from './components/BikeReportModal';
import { BikeReevaluationModal } from './components/BikeReevaluationModal';
import { DeleteBikeConfirmModal } from './components/DeleteBikeConfirmModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { SectorPhotoModal } from './components/SectorPhotoModal';
import { InAppTourOverlay, TOUR_STEPS } from './components/InAppTourOverlay';
import { BicicletarioFacilLogo } from './components/BicicletarioFacilLogo';
import { BottomNav } from './components/BottomNav';
import { DesktopNav } from './components/DesktopNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SpotRequestsView, SpotRequest } from './components/SpotRequestsView';
import { DashboardView } from './components/DashboardView';
import { TasksHub } from './components/TasksHub';
import { useAuth } from './auth/AuthGate';
import { useCloudSnapshot } from './hooks/useCloudSnapshot';
import { supabase } from './lib/supabase';
import { ArrowLeft, CheckCircle2, Info, X, FileDown, Plus } from 'lucide-react';

const SPOTS_STORAGE_KEY = 'condo_bike_spots_v1';
const LOGS_STORAGE_KEY = 'condo_bike_logs_v1';
const CONFIG_STORAGE_KEY = 'condo_bike_config_v1';
const BIKES_STORAGE_KEY = 'condo_registered_bikes_v1';

export default function App() {
  const { userId, profile, isCloudMode, signOut, activeCondominiumId, effectiveRole, isSupportMode, isVisitor, exitSupportMode } = useAuth();
  const canManageCondominium = !isVisitor && (!isCloudMode || effectiveRole === 'nobrutec_admin' || effectiveRole === 'syndic');
  // A planta e a manutenção avançada fazem parte da implantação técnica da Nobrutec.
  // Síndicos e portaria nunca recebem permissão de edição, inclusive em modo de teste.
  const canUseMasterMaintenance = !isVisitor && (effectiveRole === 'nobrutec_admin' || profile?.role === 'nobrutec_admin');
  // Load state with fallback to initial mock data
  const [spots, setSpots] = useState<BicycleSpot[]>(() => {
    try {
      const saved = localStorage.getItem(SPOTS_STORAGE_KEY);
      if (!saved) return INITIAL_SPOTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SPOTS;
    } catch {
      return INITIAL_SPOTS;
    }
  });

  const [logs, setLogs] = useState<UsageLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      if (!saved) return INITIAL_LOGS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!saved) return DEFAULT_CONFIG;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' && parsed.condominiumName
        ? { ...DEFAULT_CONFIG, ...parsed }
        : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [registeredBikes, setRegisteredBikes] = useState<RegisteredBicycle[]>(() => {
    try {
      const saved = localStorage.getItem(BIKES_STORAGE_KEY);
      if (!saved) return INITIAL_REGISTERED_BIKES;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REGISTERED_BIKES;
    } catch {
      return INITIAL_REGISTERED_BIKES;
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'history' | 'bikes' | 'requests' | 'tasks'>('dashboard');
  const [taskReturnContext, setTaskReturnContext] = useState<'bikes' | 'requests' | null>(null);
  const [selectedOccupiedSpot, setSelectedOccupiedSpot] = useState<BicycleSpot | null>(null);
  const [spotToAllocate, setSpotToAllocate] = useState<BicycleSpot | null>(null);
  const [initialBikeForAllocation, setInitialBikeForAllocation] = useState<RegisteredBicycle | null>(null);
  const [bikeAwaitingSpotChoice, setBikeAwaitingSpotChoice] = useState<RegisteredBicycle | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<SpotRequest | null>(null);
  const [qrModalSpot, setQrModalSpot] = useState<BicycleSpot | null>(null);
  const [publicConsultSpot, setPublicConsultSpot] = useState<BicycleSpot | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const [guideInitialStep, setGuideInitialStep] = useState<number | undefined>(undefined);

  // A vaga guarda o vínculo e a concessão; os dados da bicicleta vêm sempre do catálogo.
  const displaySpots = useMemo(() => spots.map((spot) => {
    const allocation = spot.currentAllocation;
    if (!allocation) return spot;
    const bike = allocation.bicycleId
      ? registeredBikes.find((item) => item.id === allocation.bicycleId)
      : registeredBikes.find((item) => item.spotId === spot.id);
    if (!bike) return spot;
    return {
      ...spot,
      currentAllocation: {
        ...allocation,
        bicycleId: bike.id,
        residentName: bike.residentName,
        apartment: bike.apartment,
        block: bike.block,
        residentPhone: bike.residentPhone,
        residentEmail: bike.residentEmail,
        photoUrl: bike.photoUrl,
        bicycle: {
          brandModel: bike.brandModel,
          color: bike.color,
          category: bike.category,
          tagNumber: bike.tagNumber,
          serialNumber: bike.serialNumber,
          distinguishingFeatures: bike.distinguishingFeatures,
          notes: bike.notes,
        },
      },
    };
  }), [spots, registeredBikes]);

  // URL query parameter listener for direct QR code scans outside the app (e.g., ?vaga=V-01)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const vagaParam = urlParams.get('vaga');
      if (vagaParam) {
        const found = displaySpots.find(
          (s) =>
            s.spotNumber.toLowerCase() === vagaParam.trim().toLowerCase() ||
            s.id.toLowerCase() === vagaParam.trim().toLowerCase()
        );
        if (found) {
          setPublicConsultSpot(found);
        }
      }
    } catch (err) {
      console.warn('Erro ao processar parâmetro de URL da vaga:', err);
    }
  }, [displaySpots]);
  
  // Bike registry & reevaluation modals
  const [isBikeRegisterModalOpen, setIsBikeRegisterModalOpen] = useState<boolean>(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [bikeToEdit, setBikeToEdit] = useState<RegisteredBicycle | null>(null);
  const [bikeToReport, setBikeToReport] = useState<RegisteredBicycle | null>(null);
  const [reportInitialReason, setReportInitialReason] = useState<BikeReportReason | undefined>(undefined);
  const [bikeToReevaluate, setBikeToReevaluate] = useState<RegisteredBicycle | null>(null);
  const [bikeToDelete, setBikeToDelete] = useState<RegisteredBicycle | null>(null);
  const [drawerSectorPhotoTarget, setDrawerSectorPhotoTarget] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Replace legacy SVG illustrations saved in prior demo snapshots with real photo assets.
  useEffect(() => {
    setRegisteredBikes((current) => {
      let changed = false;
      const updated = current.map((bike, index) => {
        if (bike.photoUrl.startsWith('data:image/svg+xml')) {
          changed = true;
          return { ...bike, photoUrl: SAMPLE_BIKE_PHOTOS[index % SAMPLE_BIKE_PHOTOS.length] };
        }
        return bike;
      });
      return changed ? updated : current;
    });
  }, [registeredBikes]);

  // Persist the link for allocations created in versions anteriores ao vínculo bicycleId.
  useEffect(() => {
    setSpots((current) => {
      let changed = false;
      const updated = current.map((spot) => {
        const allocation = spot.currentAllocation;
        if (!allocation || allocation.bicycleId) return spot;
        const bike = registeredBikes.find((item) => item.spotId === spot.id);
        if (!bike) return spot;
        changed = true;
        return { ...spot, currentAllocation: { ...allocation, bicycleId: bike.id } };
      });
      return changed ? updated : current;
    });
  }, [registeredBikes]);

  const handleCloudLoad = React.useCallback((snapshot: { config: SystemConfig; spots: BicycleSpot[]; registeredBikes: RegisteredBicycle[]; logs: UsageLog[] }) => {
    // Snapshots criados antes da planta-base não possuem essa configuração.
    // Fazemos o complemento somente quando não há módulos salvos, preservando
    // integralmente qualquer planta real já configurada para o condomínio.
    const cloudFloorPlans = snapshot.config.sectorFloorPlans;
    const hasSavedFloorPlan = Object.values(cloudFloorPlans || {}).some((plan) => plan.modules.length > 0);
    setConfig({
      ...DEFAULT_CONFIG,
      ...snapshot.config,
      sectorFloorPlans: hasSavedFloorPlan ? cloudFloorPlans : DEFAULT_CONFIG.sectorFloorPlans,
    });
    setSpots(snapshot.spots);
    setRegisteredBikes(snapshot.registeredBikes);
    setLogs(snapshot.logs);
  }, []);

  const handleCloudError = React.useCallback((message: string) => {
    setToastMessage({ text: message, type: 'info' });
  }, []);

  const { syncState, pendingChanges } = useCloudSnapshot({
    condominiumId: activeCondominiumId,
    userId: canManageCondominium ? userId : null,
    config,
    spots,
    registeredBikes,
    logs,
    onLoad: handleCloudLoad,
    onError: handleCloudError,
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SPOTS_STORAGE_KEY, JSON.stringify(spots));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [spots]);

  useEffect(() => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(BIKES_STORAGE_KEY, JSON.stringify(registeredBikes));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [registeredBikes]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Compute how many bikes are due for biennial reevaluation (+2 years)
  const dueReevaluationsCount = useMemo(() => {
    return registeredBikes.filter((b) => getBikeReevaluationInfo(b).isDue).length;
  }, [registeredBikes]);

  // Available spots list for allocations
  const availableSpots = spots.filter((s) => !s.currentAllocation);

  // Select spot handler
  const handleSelectSpot = (spot: BicycleSpot) => {
    if (spot.currentAllocation) {
      setSelectedOccupiedSpot(spot);
    } else {
      if (!canManageCondominium) {
        setActiveTab('requests');
        showToast('A portaria registra o pedido em Solicitações. A atribuição da vaga é feita pelo síndico.', 'info');
        return;
      }
      setInitialBikeForAllocation(null);
      setSpotToAllocate(spot);
    }
  };

  // Quick QR code plaque modal
  const handleQuickQr = (spot: BicycleSpot) => {
    setQrModalSpot(spot);
  };

  // Register usage / check-in
  const handleRegisterUsage = (spot: BicycleSpot) => {
    const nowIso = new Date().toISOString();

    const updatedSpots = spots.map((s) => {
      if (s.id === spot.id) {
        return {
          ...s,
          lastUsageDate: nowIso,
        };
      }
      return s;
    });

    const targetSpot = updatedSpots.find((s) => s.id === spot.id);

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: spot.id,
      spotNumber: spot.spotNumber,
      apartment: spot.currentAllocation
        ? `${spot.currentAllocation.apartment} (${spot.currentAllocation.block})`
        : '—',
      residentName: spot.currentAllocation?.residentName || '—',
      type: 'check_in_uso',
      timestamp: nowIso,
      method: 'qr_code',
      notes: `Registro de uso / check-in confirmado para o gancho suspenso ${spot.spotNumber}.`,
    };

    setSpots(updatedSpots);
    setLogs([newLog, ...logs]);

    if (targetSpot && selectedOccupiedSpot?.id === spot.id) {
      setSelectedOccupiedSpot(targetSpot);
    }

    showToast(`Uso confirmado no gancho suspenso ${spot.spotNumber}!`);
  };

  // Confirm spot allocation
  const handleConfirmAllocation = async (
    spot: BicycleSpot,
    allocationData: ResidentAllocation,
    selectedBikeId?: string
  ) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem alterar vagas.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();

    const updatedSpots = spots.map((s) => {
      if (s.id === spot.id) {
        return {
          ...s,
          currentAllocation: allocationData,
          lastUsageDate: nowIso,
        };
      }
      return s;
    });

    // If an existing registered bicycle was linked, update its spotId & spotNumber
    if (selectedBikeId) {
      setRegisteredBikes((prev) =>
        prev.map((b) => {
          if (b.id === selectedBikeId) {
            return {
              ...b,
              spotId: spot.id,
              spotNumber: spot.spotNumber,
            };
          }
          return b;
        })
      );
    } else {
      // Auto-register bicycle into general catalog
      const autoRegisteredBike: RegisteredBicycle = {
        id: `bike-${Date.now()}`,
        residentName: allocationData.residentName,
        apartment: allocationData.apartment,
        block: allocationData.block,
        residentPhone: allocationData.residentPhone,
        residentEmail: allocationData.residentEmail,
        brandModel: allocationData.bicycle.brandModel,
        color: allocationData.bicycle.color,
        category: allocationData.bicycle.category,
        tagNumber: allocationData.bicycle.tagNumber,
        distinguishingFeatures: allocationData.bicycle.distinguishingFeatures,
        notes: allocationData.bicycle.notes,
        photoUrl: allocationData.photoUrl || allocationData.bicycle.brandModel,
        spotId: spot.id,
        spotNumber: spot.spotNumber,
        registeredAt: nowIso,
        reevaluationStatus: 'em_dia',
      };
      setRegisteredBikes((prev) => [autoRegisteredBike, ...prev]);
    }

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: spot.id,
      spotNumber: spot.spotNumber,
      apartment: `${allocationData.apartment} (${allocationData.block})`,
      residentName: allocationData.residentName,
      type: 'alocacao',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Vaga atribuída. Modalidade: ${
        allocationData.concessionType === 'vitalicio' ? 'Vitalícia (Permanente)' : 'Tempo Determinado'
      }. Selo: ${allocationData.bicycle.tagNumber}`,
    };

    setSpots(updatedSpots);
    setLogs([newLog, ...logs]);
    if (approvalRequest && supabase) {
      const { error } = await supabase
        .from('spot_requests')
        .update({ status: 'approved', assigned_spot_id: spot.id, decided_at: nowIso, decided_by: userId })
        .eq('id', approvalRequest.id);
      if (error) {
        showToast('A vaga foi vinculada, mas não foi possível atualizar a solicitação. Tente novamente.', 'info');
      } else {
        setApprovalRequest(null);
      }
    }
    setSpotToAllocate(null);
    setInitialBikeForAllocation(null);

    const awaitingCloudConfirmation = isCloudMode && typeof navigator !== 'undefined' && !navigator.onLine;
    showToast(
      awaitingCloudConfirmation
        ? `Vínculo da vaga ${spot.spotNumber} guardado neste aparelho. A confirmação ocorrerá quando a conexão voltar.`
        : `Vaga Suspensa ${spot.spotNumber} vinculada com sucesso ao Apto ${allocationData.apartment}!`,
      awaitingCloudConfirmation ? 'info' : 'success'
    );
  };

  // Release / Vacate spot
  const handleReleaseSpot = (spot: BicycleSpot) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem liberar vagas.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();
    const previousAlloc = spot.currentAllocation;

    const updatedSpots = spots.map((s) => {
      if (s.id === spot.id) {
        return {
          ...s,
          currentAllocation: undefined,
          lastUsageDate: undefined,
        };
      }
      return s;
    });

    // Release spot from the registered bike in catalog
    setRegisteredBikes((prev) =>
      prev.map((b) => {
        if (b.spotId === spot.id) {
          return { ...b, spotId: undefined, spotNumber: undefined };
        }
        return b;
      })
    );

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: spot.id,
      spotNumber: spot.spotNumber,
      apartment: previousAlloc ? `${previousAlloc.apartment} (${previousAlloc.block})` : '—',
      residentName: previousAlloc?.residentName || '—',
      type: 'desocupacao',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Vaga ${spot.spotNumber} desocupada e liberada para novo sorteio/alocação.`,
    };

    setSpots(updatedSpots);
    setLogs([newLog, ...logs]);
    setSelectedOccupiedSpot(null);

    showToast(`Vaga Suspensa ${spot.spotNumber} liberada com sucesso!`);
  };

  // Edit concession term or type
  const handleUpdateConcession = (
    spot: BicycleSpot,
    concessionType: ConcessionType,
    endDate?: string
  ) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem alterar concessões.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();

    const updatedSpots = spots.map((s) => {
      if (s.id === spot.id && s.currentAllocation) {
        return {
          ...s,
          currentAllocation: {
            ...s.currentAllocation,
            concessionType,
            endDate: concessionType === 'determinado' ? endDate : undefined,
          },
        };
      }
      return s;
    });

    const targetSpot = updatedSpots.find((s) => s.id === spot.id);

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: spot.id,
      spotNumber: spot.spotNumber,
      apartment: spot.currentAllocation
        ? `${spot.currentAllocation.apartment} (${spot.currentAllocation.block})`
        : '—',
      residentName: spot.currentAllocation?.residentName || '—',
      type: 'renovacao',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Concessão atualizada: ${
        concessionType === 'vitalicio'
          ? 'Alterado para Vitalício'
          : `Prazo prorrogado até ${endDate?.substring(0, 10)}`
      }`,
    };

    setSpots(updatedSpots);
    setLogs([newLog, ...logs]);

    if (targetSpot && selectedOccupiedSpot?.id === spot.id) {
      setSelectedOccupiedSpot(targetSpot);
    }

    showToast(`Concessão da Vaga ${spot.spotNumber} atualizada com sucesso!`);
  };

  // Update bike photo
  const handleUpdatePhoto = (spot: BicycleSpot, newPhotoUrl: string) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem alterar fotos.', 'info');
      return;
    }
    const updatedSpots = spots.map((s) => {
      if (s.id === spot.id && s.currentAllocation) {
        return {
          ...s,
          currentAllocation: {
            ...s.currentAllocation,
            photoUrl: newPhotoUrl,
          },
        };
      }
      return s;
    });

    // The catalog is the source of truth; the allocation photo is only legacy fallback data.
    setRegisteredBikes((prev) =>
      prev.map((b) => (b.id === spot.currentAllocation?.bicycleId || b.spotId === spot.id ? { ...b, photoUrl: newPhotoUrl } : b))
    );

    const targetSpot = updatedSpots.find((s) => s.id === spot.id);

    setSpots(updatedSpots);
    if (targetSpot && selectedOccupiedSpot?.id === spot.id) {
      setSelectedOccupiedSpot(targetSpot);
    }
    showToast(`Foto da Vaga ${spot.spotNumber} atualizada.`);
  };

  // Save config
  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    showToast('Configurações do condomínio salvas com sucesso!');
  };

  const handleSyncPlanSpots = ({ created, attached }: { created: BicycleSpot[]; attached: BicycleSpot[] }) => {
    if (!created.length && !attached.length) return;
    setSpots((current) => {
      const attachedById = new Map(attached.map((spot) => [spot.id, spot]));
      const existingIds = new Set(current.map((spot) => spot.id));
      const updated = current.map((spot) => attachedById.get(spot.id) || spot);
      return [...updated, ...created.filter((spot) => !existingIds.has(spot.id))];
    });
    const messages = [
      created.length ? `${created.length} vaga(s) criada(s)` : '',
      attached.length ? `${attached.length} vaga(s) vinculada(s) ao módulo` : '',
    ].filter(Boolean);
    showToast(`${messages.join(' e ')}. Mapa e cartões foram sincronizados.`);
  };

  // Save or remove sector identification photo
  const handleSaveSectorPhoto = (sectorName: string, data: SectorPhotoData | null) => {
    setConfig((prev) => {
      const currentSectorPhotos = { ...(prev.sectorPhotos || {}) };
      if (!data) {
        delete currentSectorPhotos[sectorName];
      } else {
        currentSectorPhotos[sectorName] = data;
      }
      return {
        ...prev,
        sectorPhotos: currentSectorPhotos,
      };
    });

    if (data) {
      showToast(`Foto do local do ${sectorName} salva com sucesso!`);
    } else {
      showToast(`Foto do setor ${sectorName} removida.`);
    }
  };

  // Export full JSON backup for offline local persistence
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      condominiumName: config.condominiumName,
      config,
      spots,
      registeredBikes,
      logs,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-bicicletario-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON exportado e salvo na sua máquina!');
  };

  // Import JSON backup
  const handleImportBackup = (backupData: unknown) => {
    try {
      if (!backupData || typeof backupData !== 'object') throw new Error('Backup inválido.');
      const data = backupData as Partial<{ config: SystemConfig; spots: BicycleSpot[]; registeredBikes: RegisteredBicycle[]; logs: UsageLog[] }>;
      if (!data.config || !Array.isArray(data.spots) || !Array.isArray(data.registeredBikes) || !Array.isArray(data.logs)) {
        throw new Error('Backup incompleto.');
      }
      setConfig({ ...DEFAULT_CONFIG, ...data.config });
      setSpots(data.spots);
      setRegisteredBikes(data.registeredBikes);
      setLogs(data.logs);
      showToast('Dados do backup restaurados com sucesso!');
    } catch {
      showToast('Erro ao importar backup.', 'info');
    }
  };

  // Apply new structure generated by Master Maintenance Panel
  const handleApplyNewStructure = (
    newSpots: BicycleSpot[],
    updatedConfig: SystemConfig,
    preserveAllocations: boolean
  ) => {
    setSpots(newSpots);
    setConfig(updatedConfig);

    if (!preserveAllocations) {
      // Clean deployment: detach all spots from registered bikes
      setRegisteredBikes((prev) =>
        prev.map((b) => ({ ...b, spotId: undefined, spotNumber: undefined }))
      );
    } else {
      // Re-sync registered bikes with new spot instances
      setRegisteredBikes((prev) =>
        prev.map((b) => {
          const matchingSpot = newSpots.find(
            (s) =>
              s.currentAllocation?.apartment === b.apartment &&
              s.currentAllocation?.residentName === b.residentName
          );
          if (matchingSpot) {
            return {
              ...b,
              spotId: matchingSpot.id,
              spotNumber: matchingSpot.spotNumber,
            };
          }
          return b;
        })
      );
    }

    // Audit log
    const auditLog: UsageLog = {
      id: `log-${Date.now()}`,
      apartment: 'ADMIN',
      residentName: 'Prestador Master',
      type: 'alocacao',
      timestamp: new Date().toISOString(),
      method: 'painel_admin',
      notes: `Reestruturação Master: condomínio configurado para ${newSpots.length} vagas em ${
        updatedConfig.modules?.length || 1
      } módulo(s) (${preserveAllocations ? 'alocações preservadas' : 'nova implantação limpa do zero'}).`,
    };
    setLogs((prev) => [auditLog, ...prev]);

    showToast(
      `Estrutura de ${newSpots.length} vagas implantada com sucesso para "${updatedConfig.condominiumName}"!`
    );
  };

  // Export condo package (.condo.json)
  const handleExportCondoPackage = () => {
    const packageData = {
      packageType: 'CONDO_BIKE_CUSTOM_PROFILE',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      condominiumName: config.condominiumName,
      condominiumCode: config.condominiumCode,
      city: config.condominiumCity,
      managerName: config.managerName,
      managerPhone: config.managerPhone,
      config,
      modules: config.modules,
      spots,
      totalSpots: spots.length,
    };
    const jsonStr = JSON.stringify(packageData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedName = config.condominiumName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `pacote-condominio-${sanitizedName}-${spots.length}vagas.condo.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Pacote de implantação de ${spots.length} vagas exportado!`);
  };

  // Import condo package (.condo.json)
  const handleImportCondoPackage = (packageData: any) => {
    try {
      if (!packageData || typeof packageData !== 'object') {
        throw new Error('Arquivo de pacote inválido.');
      }
      if (packageData.config) setConfig(packageData.config);
      if (Array.isArray(packageData.spots)) setSpots(packageData.spots);
      showToast(
        `Pacote do condomínio "${packageData.condominiumName || 'Personalizado'}" importado com sucesso!`
      );
    } catch (e: any) {
      showToast(`Erro ao carregar pacote: ${e.message}`, 'info');
    }
  };

  // Reset to initial demo data
  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Deseja redefinir os dados para o padrão de demonstração? Isso substituirá as alterações salvas localmente neste navegador.'
      )
    ) {
      try {
        localStorage.removeItem(SPOTS_STORAGE_KEY);
        localStorage.removeItem(LOGS_STORAGE_KEY);
        localStorage.removeItem(CONFIG_STORAGE_KEY);
        localStorage.removeItem(BIKES_STORAGE_KEY);
      } catch (e) {
        console.warn('Storage clear failed:', e);
      }
      setSpots(INITIAL_SPOTS);
      setLogs(INITIAL_LOGS);
      setConfig(DEFAULT_CONFIG);
      setRegisteredBikes(INITIAL_REGISTERED_BIKES);
      showToast('Dados restaurados para o padrão inicial!');
    }
  };

  // Save or edit a registered bike directly
  const handleSaveRegisteredBike = (
    bikeData: Omit<RegisteredBicycle, 'id' | 'registeredAt'> & {
      id?: string;
      registeredAt?: string;
      lastReevaluatedAt?: string;
      reevaluationStatus?: 'pendente' | 'em_dia' | 'morador_inativo' | 'abandonada';
      reevaluationNotes?: string;
    }
  ) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem alterar bicicletas.', 'info');
      return;
    }
    const normalizeIdentifier = (value?: string) => (value || '').trim().toLocaleLowerCase('pt-BR');
    const conflictingBike = registeredBikes.find((bike) =>
      bike.id !== bikeData.id && (
        (normalizeIdentifier(bikeData.tagNumber) && normalizeIdentifier(bike.tagNumber) === normalizeIdentifier(bikeData.tagNumber)) ||
        (normalizeIdentifier(bikeData.serialNumber) && normalizeIdentifier(bike.serialNumber) === normalizeIdentifier(bikeData.serialNumber))
      )
    );
    if (conflictingBike) {
      const conflictField = normalizeIdentifier(bikeData.serialNumber) && normalizeIdentifier(conflictingBike.serialNumber) === normalizeIdentifier(bikeData.serialNumber) ? 'chassi' : 'selo';
      showToast(`Já existe uma bicicleta cadastrada com este ${conflictField}. Revise a identificação antes de salvar.`, 'info');
      return;
    }
    const nowIso = new Date().toISOString();

    if (bikeData.id) {
      // Edit existing
      setRegisteredBikes((prev) =>
        prev.map((b) => (b.id === bikeData.id ? ({ ...b, ...bikeData } as RegisteredBicycle) : b))
      );
      showToast(`Cadastro da bicicleta "${bikeData.brandModel}" atualizado com sucesso!`);
    } else {
      // New registration
      const newBike: RegisteredBicycle = {
        ...bikeData,
        id: `bike-${Date.now()}`,
        registeredAt: bikeData.registeredAt || nowIso,
        reevaluationStatus: bikeData.reevaluationStatus || 'em_dia',
      };
      setRegisteredBikes((prev) => [newBike, ...prev]);

      // If user selected a spot during registration, automatically assign it
      if (bikeData.spotId) {
        const spotToLink = spots.find((s) => s.id === bikeData.spotId);
        if (spotToLink && !spotToLink.currentAllocation) {
          handleConfirmAllocation(
            spotToLink,
            {
              id: `alloc-${Date.now()}`,
              allocatedAt: nowIso,
              spotId: spotToLink.id,
              apartment: bikeData.apartment,
              block: bikeData.block,
              residentName: bikeData.residentName,
              residentPhone: bikeData.residentPhone,
              residentEmail: bikeData.residentEmail,
              concessionType: 'determinado',
              startDate: nowIso,
              bicycle: {
                brandModel: bikeData.brandModel,
                color: bikeData.color,
                category: bikeData.category,
                tagNumber: bikeData.tagNumber,
                distinguishingFeatures: bikeData.distinguishingFeatures,
                notes: bikeData.notes,
              },
              photoUrl: bikeData.photoUrl,
              bicycleId: newBike.id,
            },
            newBike.id
          );
        }
      }

      const newLog: UsageLog = {
        id: `log-${Date.now()}`,
        spotId: bikeData.spotId,
        spotNumber: bikeData.spotNumber || 'Sem Vaga Fixa',
        apartment: `${bikeData.apartment} (${bikeData.block})`,
        residentName: bikeData.residentName,
        type: 'cadastro_bike',
        timestamp: nowIso,
        method: 'painel_admin',
        notes: `Nova bicicleta cadastrada: ${bikeData.brandModel} (${bikeData.color}) - Morador: ${bikeData.residentName}.`,
      };
      setLogs((prev) => [newLog, ...prev]);

      showToast(`Bicicleta "${bikeData.brandModel}" cadastrada com sucesso!`);
    }

    setIsBikeRegisterModalOpen(false);
    setBikeToEdit(null);
  };

  // Biennial Reevaluation Save Handler
  const handleConfirmReevaluation = (
    bike: RegisteredBicycle,
    data: {
      residentStatus: 'ativo' | 'mudou_se' | 'em_averiguacao';
      bikeCondition: 'bom_estado' | 'pouco_uso' | 'abandonada';
      notes: string;
      abandonmentReasons: string[];
    }
  ) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem concluir reavaliações.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();
    const statusMap = {
      ativo: data.bikeCondition === 'abandonada' ? 'abandonada' : 'em_dia',
      mudou_se: 'morador_inativo',
      em_averiguacao: 'pendente',
    } as const;

    const newStatus = statusMap[data.residentStatus];

    setRegisteredBikes((prev) =>
      prev.map((b) => {
        if (b.id === bike.id) {
          return {
            ...b,
            lastReevaluatedAt: nowIso,
            reevaluationStatus: newStatus,
            reevaluationNotes:
              data.notes ||
              `Reavaliação bienal realizada. Morador: ${data.residentStatus}. Condição: ${data.bikeCondition}.`,
          };
        }
        return b;
      })
    );

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: bike.spotId,
      spotNumber: bike.spotNumber || 'Sem Vaga Fixa',
      apartment: `${bike.apartment} (${bike.block})`,
      residentName: bike.residentName,
      type: 'reavaliacao_bienal',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Reavaliação bienal (+2 anos) concluída para ${bike.brandModel}. Morador: ${data.residentStatus}. Condição física: ${data.bikeCondition}. ${
        data.abandonmentReasons.length > 0 ? `Sinais: ${data.abandonmentReasons.join(', ')}.` : ''
      } ${data.notes ? `Obs: ${data.notes}` : ''}`,
    };

    setLogs((prev) => [newLog, ...prev]);
    setBikeToReevaluate(null);
    showToast(`Reavaliação bienal da bicicleta "${bike.brandModel}" concluída com sucesso!`);
  };

  // Report handling via WhatsApp: log and feedback
  const handleReportSent = (
    bike: RegisteredBicycle,
    reason: BikeReportReason,
    customMessage: string,
    locationOrDetail?: string
  ) => {
    const nowIso = new Date().toISOString();
    const reasonText =
      reason === 'reevaluacao_bienal'
        ? 'Reavaliação Bienal (+2 Anos)'
        : reason === 'lugar_indevido'
        ? 'Lugar Indevido'
        : reason === 'condicoes_criticas'
        ? 'Condições Críticas / Abandono'
        : 'Contato Geral';

    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: bike.spotId,
      spotNumber: bike.spotNumber || 'Sem Vaga Fixa',
      apartment: `${bike.apartment} (${bike.block})`,
      residentName: bike.residentName,
      type: reason === 'reevaluacao_bienal' ? 'reavaliacao_bienal' : 'notificacao_reporte',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Notificação WhatsApp enviada para ${bike.residentName} (${bike.residentPhone}). Motivo: ${reasonText}. Detalhe: ${locationOrDetail || 'Aviso formal'}.`,
    };

    setLogs((prev) => [newLog, ...prev]);
    setBikeToReport(null);
    setReportInitialReason(undefined);
    showToast(`Notificação registrada no histórico e aberta no WhatsApp com sucesso!`);
  };

  // Delete bike registration handling with confirmation
  const handleConfirmDeleteBike = (bike: RegisteredBicycle) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem excluir bicicletas.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();

    // If bike was allocated to a spot, unbind/release the spot safely
    if (bike.spotId || bike.spotNumber) {
      setSpots((prevSpots) =>
        prevSpots.map((s) => {
          if (s.id === bike.spotId || s.spotNumber === bike.spotNumber) {
            return {
              ...s,
              currentAllocation: undefined,
              lastUsageDate: undefined,
            };
          }
          return s;
        })
      );

      // If drawer was open for this spot, close it
      if (
        selectedOccupiedSpot &&
        (selectedOccupiedSpot.id === bike.spotId || selectedOccupiedSpot.spotNumber === bike.spotNumber)
      ) {
        setSelectedOccupiedSpot(null);
      }
    }

    // Remove bike from registeredBikes
    setRegisteredBikes((prev) => prev.filter((b) => b.id !== bike.id));

    // If edit modal was open for this bike, close it
    if (isBikeRegisterModalOpen && bikeToEdit?.id === bike.id) {
      setIsBikeRegisterModalOpen(false);
      setBikeToEdit(null);
    }

    // Register audit log
    const newLog: UsageLog = {
      id: `log-${Date.now()}`,
      spotId: bike.spotId,
      spotNumber: bike.spotNumber || 'Sem Vaga Fixa',
      apartment: `${bike.apartment} (${bike.block})`,
      residentName: bike.residentName,
      type: 'exclusao_bike',
      timestamp: nowIso,
      method: 'painel_admin',
      notes: `Cadastro da bicicleta ${bike.brandModel} (${bike.color}) do Apto ${bike.apartment} removido do sistema.${
        bike.spotNumber ? ` A Vaga Suspensa ${bike.spotNumber} foi desvinculada e liberada.` : ''
      }`,
    };

    setLogs((prev) => [newLog, ...prev]);
    setBikeToDelete(null);
    showToast(`Cadastro da bicicleta "${bike.brandModel}" excluído com sucesso!`);
  };

  // Action from catalog: assign an available spot to an existing registered bike
  const handleAssignSpotToBike = (bike: RegisteredBicycle) => {
    if (!canManageCondominium) {
      showToast('Somente síndico ou administradora podem atribuir vagas.', 'info');
      return;
    }
    if (availableSpots.length === 0) {
      showToast('Todas as vagas suspensas estão ocupadas no momento.', 'info');
      return;
    }
    setBikeAwaitingSpotChoice(bike);
  };

  const handleChooseSpotForBike = (spot: BicycleSpot) => {
    if (!bikeAwaitingSpotChoice || spot.currentAllocation) return;
    setInitialBikeForAllocation(bikeAwaitingSpotChoice);
    setSpotToAllocate(spot);
    setBikeAwaitingSpotChoice(null);
  };

  const handleApproveRequest = (request: SpotRequest, spot: BicycleSpot) => {
    const requestedBike = request.bicycle_id
      ? registeredBikes.find((bike) => bike.id === request.bicycle_id && !bike.spotId)
      : registeredBikes.find((bike) =>
          !bike.spotId &&
          bike.residentName === request.resident_name &&
          bike.apartment === request.apartment &&
          `${bike.brandModel} · ${bike.color} · ${bike.tagNumber}` === request.bicycle_description
        );
    if (!requestedBike) {
      showToast('A bicicleta desta solicitação não foi encontrada entre os cadastros sem vaga.', 'info');
      return;
    }
    setApprovalRequest(request);
    setInitialBikeForAllocation(requestedBike);
    setSpotToAllocate(spot);
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white antialiased w-full overflow-x-hidden">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          id="system-toast"
          className="fixed bottom-20 sm:bottom-5 right-4 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl glass-panel text-slate-800 text-xs border border-slate-300/80 animate-slideUp max-w-[90vw] sm:max-w-md"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
          )}
          <span className="font-mono text-xs text-slate-800">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header (Clean & Responsive Navbar) */}
      <Header
        config={config}
        spots={spots}
        dueReevaluationsCount={dueReevaluationsCount}
        onTabChange={setActiveTab}
        canManageSettings={canManageCondominium}
        isCloudMode={isCloudMode}
        onSignOut={isCloudMode ? signOut : undefined}
        supportModeLabel={isVisitor ? 'Modo visitante · demonstração somente leitura' : isSupportMode ? 'Modo de teste Nobrutec' : undefined}
        onExitSupportMode={isSupportMode ? exitSupportMode : undefined}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHelpGuide={() => {
          setGuideInitialStep(undefined);
          setIsHelpGuideOpen(true);
        }}
      />

      {isSupportMode && (
        <button
          type="button"
          onClick={() => exitSupportMode()}
          className="fixed bottom-20 left-4 z-[80] inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-2xl ring-1 ring-amber-400/70 transition hover:bg-slate-800 sm:bottom-6 sm:left-6"
          title="Voltar para a Central Nobrutec"
        >
          <ArrowLeft className="h-4 w-4 text-amber-400" />
          Central Nobrutec
        </button>
      )}

      {bikeAwaitingSpotChoice && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-700 p-5">
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-[.18em] text-amber-300">Escolher vaga livre</p>
                <h2 className="mt-1 text-base font-black text-white">{bikeAwaitingSpotChoice.brandModel}</h2>
                <p className="mt-1 text-xs text-slate-400">Morador: {bikeAwaitingSpotChoice.residentName} · Apto {bikeAwaitingSpotChoice.apartment}</p>
              </div>
              <button type="button" onClick={() => setBikeAwaitingSpotChoice(null)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" title="Cancelar"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-5">
              <p className="mb-3 text-xs text-slate-400">Selecione onde esta bicicleta ficará. Apenas vagas desocupadas aparecem abaixo.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableSpots.map((spot) => (
                  <button key={spot.id} type="button" onClick={() => handleChooseSpotForBike(spot)} className="rounded-xl border border-emerald-800/70 bg-emerald-950/30 px-3 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-950/60">
                    <span className="block font-mono text-sm font-black text-emerald-300">{spot.spotNumber}</span>
                    <span className="mt-1 block text-[11px] text-emerald-100/70">{spot.sector || 'Setor não informado'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-700 p-4 text-right"><button type="button" onClick={() => setBikeAwaitingSpotChoice(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800">Cancelar</button></div>
          </section>
        </div>
      )}

      {/* Desktop Navigation Bar (Allocated above the body on desktop) */}
      <DesktopNav
        activeTab={activeTab}
        spotsCount={spots.length}
        registeredBikesCount={registeredBikes.length}
        dueReevaluationsCount={dueReevaluationsCount}
        logsCount={logs.length}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8">
        {activeTab !== 'dashboard' && <section className="page-context mb-4 overflow-hidden rounded-2xl border border-orange-100 bg-white/90 px-4 py-4 shadow-sm sm:mb-5 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e9890c]">Painel do condomínio</p>
              <h1 className="mt-1 text-xl font-black text-[#0d1733] sm:text-2xl">{activeTab === 'map' ? 'Visão geral das vagas' : activeTab === 'bikes' ? 'Cadastro e controle de bicicletas' : activeTab === 'tasks' ? 'Tarefas e pendências' : activeTab === 'requests' ? 'Solicitações de vaga' : 'Histórico e auditoria'}</h1>
              <p className="mt-1 text-xs text-slate-500">{activeTab === 'map' ? 'Consulte a ocupação, encontre bicicletas e opere o bicicletário com rapidez.' : activeTab === 'bikes' ? 'Mantenha os cadastros completos e identifique pendências facilmente.' : activeTab === 'tasks' ? 'Resolva primeiro o que exige decisão no bicicletário.' : activeTab === 'requests' ? 'Organize a fila e aprove solicitações com segurança.' : 'Acompanhe todas as movimentações importantes do condomínio.'}</p>
            </div>
            {activeTab === 'bikes' ? (
              <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[360px]">
                <div className="rounded-xl bg-[#0d1733] px-3 py-2 text-white"><p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Bicicletas</p><p className="mt-0.5 text-lg font-black text-[#F19A00]">{registeredBikes.length}</p></div>
                <div className="rounded-xl border border-amber-100 bg-[#fffaf0] px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Aguardando vaga</p><p className="mt-0.5 text-lg font-black text-amber-700">{registeredBikes.filter((bike) => !bike.spotNumber).length}</p></div>
                <div className="rounded-xl border border-orange-100 bg-[#fff8ed] px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Reavaliar</p><p className="mt-0.5 text-lg font-black text-[#e87c0b]">{dueReevaluationsCount}</p></div>
                <div className="col-span-3 flex items-center justify-end gap-2 pt-1"><button type="button" onClick={() => setIsPdfExportModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-[#0d1733] transition hover:bg-slate-50"><FileDown className="h-3.5 w-3.5" />Baixar PDF</button><button type="button" onClick={() => { setBikeToEdit(null); setIsBikeRegisterModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f19a00] px-3 py-2 text-[10px] font-black text-[#0d1733] transition hover:bg-[#ffad1b]"><Plus className="h-3.5 w-3.5" />Cadastrar bicicleta</button></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:min-w-[230px]"><div className="rounded-xl bg-[#0d1733] px-3 py-2 text-white"><p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Vagas livres</p><p className="mt-0.5 text-lg font-black text-[#F19A00]">{availableSpots.length}</p></div><div className="rounded-xl border border-orange-100 bg-[#fff8ed] px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Bicicletas</p><p className="mt-0.5 text-lg font-black text-[#0d1733]">{registeredBikes.length}</p></div></div>
            )}
          </div>
        </section>}
        {activeTab === 'dashboard' ? (
          <DashboardView
            spots={displaySpots}
            bikes={registeredBikes}
            logs={logs}
            config={config}
            onTabChange={setActiveTab}
            onOpenBike={(bike) => {
              setBikeToEdit(bike || null);
              setIsBikeRegisterModalOpen(true);
            }}
            onStartReevaluation={(bike) => setBikeToReevaluate(bike)}
            onAssignSpot={handleAssignSpotToBike}
          />
        ) : activeTab === 'map' ? (
          <SpotMap
            spots={displaySpots}
            config={config}
            selectedSpot={selectedOccupiedSpot}
            onSelectSpot={handleSelectSpot}
            onQuickQr={handleQuickQr}
            onSaveSectorPhoto={handleSaveSectorPhoto}
          />
        ) : activeTab === 'bikes' ? (
          <BikeCatalogView
            bikes={registeredBikes}
            spots={displaySpots}
            config={config}
            onOpenRegisterModal={(b) => {
              setBikeToEdit(b || null);
              setIsBikeRegisterModalOpen(true);
            }}
            onOpenReportModal={(b) => {
              setReportInitialReason(undefined);
              setBikeToReport(b);
            }}
            onOpenReevaluationModal={(b) => setBikeToReevaluate(b)}
            onAssignSpotToBike={handleAssignSpotToBike}
            onRequestDeleteBike={(b) => setBikeToDelete(b)}
            onToast={showToast}
            onBackToTasks={taskReturnContext === 'bikes' ? () => { setTaskReturnContext(null); setActiveTab('tasks'); } : undefined}
          />
        ) : activeTab === 'tasks' ? (
          <TasksHub bikes={registeredBikes} spots={displaySpots} dueCount={dueReevaluationsCount} condominiumId={activeCondominiumId} onTabChange={setActiveTab} onOpenTask={(focus) => { const target = focus === 'reevaluation' ? 'bikes' : 'requests'; setTaskReturnContext(target); setActiveTab(target); }} onStartReevaluation={(bike) => setBikeToReevaluate(bike)} onAssignSpot={handleAssignSpotToBike} />
        ) : activeTab === 'requests' ? (
          <SpotRequestsView
            condominiumId={activeCondominiumId}
            spots={displaySpots}
            bikes={registeredBikes}
            canManage={canManageCondominium}
            onAllocate={handleApproveRequest}
            onBackToTasks={taskReturnContext === 'requests' ? () => { setTaskReturnContext(null); setActiveTab('tasks'); } : undefined}
          />
        ) : (
          <HistoryView
            logs={logs}
            onSelectSpotById={(spotId) => {
              const sp = displaySpots.find((s) => s.id === spotId);
              if (sp) {
                handleSelectSpot(sp);
              }
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile devices) */}
      <BottomNav
        activeTab={activeTab}
        registeredBikesCount={registeredBikes.length}
        dueReevaluationsCount={dueReevaluationsCount}
        onTabChange={setActiveTab}
        onOpenConfig={() => setIsConfigOpen(true)}
        canManageSettings={canManageCondominium}
      />

      {/* Footer with Bicicletário Fácil branding (hidden or compact on mobile) */}
      <footer className="mt-6 sm:mt-12 py-6 sm:py-8 border-t border-slate-200/90 glass-header mb-16 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <BicicletarioFacilLogo variant="horizontal" size="sm" />
            <div className="border-l border-slate-300 pl-3 text-left">
              <p className="text-[11px] font-mono text-slate-500 leading-tight">
                Sistema de Gestão & Controle de Vagas Suspensas
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {config.condominiumName}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Painel Administrativo para Condomínios &bull; Vagas com QR Code, Cadastro de Bikes e Reporte via WhatsApp
          </p>
        </div>
      </footer>

      {/* Spot Detail Drawer (Panel showing photo and resident info for occupied spots) */}
      <SpotDetailDrawer
        spot={selectedOccupiedSpot ? displaySpots.find((spot) => spot.id === selectedOccupiedSpot.id) || selectedOccupiedSpot : null}
        config={config}
        logs={logs}
        onClose={() => setSelectedOccupiedSpot(null)}
        onOpenQr={(s) => setQrModalSpot(s)}
        onRegisterUsage={handleRegisterUsage}
        onReleaseSpot={handleReleaseSpot}
        onUpdateConcession={handleUpdateConcession}
        onUpdatePhoto={handleUpdatePhoto}
        onOpenSectorPhoto={(sector) => setDrawerSectorPhotoTarget(sector)}
      />

      {/* Allocate Modal (For allocating a vacant spot with existing or new bike) */}
      <AllocateModal
        spot={spotToAllocate}
        registeredBikes={registeredBikes}
        initialSelectedBike={initialBikeForAllocation}
        initialResident={approvalRequest ? { residentName: approvalRequest.resident_name, apartment: approvalRequest.apartment, block: approvalRequest.block, residentPhone: approvalRequest.resident_phone, notes: approvalRequest.notes } : null}
        onClose={() => {
          setSpotToAllocate(null);
          setInitialBikeForAllocation(null);
          setApprovalRequest(null);
        }}
        onConfirm={handleConfirmAllocation}
      />

      {/* QR Code Identification Plaque Modal */}
      <QrCodeModal
        spot={qrModalSpot ? displaySpots.find((spot) => spot.id === qrModalSpot.id) || qrModalSpot : null}
        condominiumName={config.condominiumName}
        onClose={() => setQrModalSpot(null)}
        onOpenPublicConsult={(s) => setPublicConsultSpot(s)}
      />

      {/* Public Consultation Modal for QR Code scan outside the app */}
      <SpotPublicConsultModal
        spot={publicConsultSpot ? displaySpots.find((spot) => spot.id === publicConsultSpot.id) || publicConsultSpot : null}
        condominiumName={config.condominiumName}
        onClose={() => setPublicConsultSpot(null)}
      />

      {/* Rules of Idle Tolerance / Ociosidade Config Modal & Master Maintenance */}
      <OciosidadeConfigModal
        config={config}
        spots={spots}
        isOpen={isConfigOpen}
        registeredBikesCount={registeredBikes.length}
        logsCount={logs.length}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
        onSyncPlanSpots={handleSyncPlanSpots}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onResetDefaults={handleResetDefaults}
        onApplyNewStructure={handleApplyNewStructure}
        onExportCondoPackage={handleExportCondoPackage}
        onImportCondoPackage={handleImportCondoPackage}
        canUseMasterMaintenance={canUseMasterMaintenance}
      />

      <PdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        allBikes={registeredBikes}
        filteredBikes={registeredBikes}
        config={config}
        onToast={(text, type) => setToastMessage({ text, type: type || 'info' })}
      />
      {/* Register / Edit Bike Modal */}
      {isBikeRegisterModalOpen && (
        <BikeRegisterModal
          initialBike={bikeToEdit}
          availableSpots={availableSpots}
          existingBikes={registeredBikes}
          onClose={() => {
            setIsBikeRegisterModalOpen(false);
            setBikeToEdit(null);
          }}
          onSave={handleSaveRegisteredBike}
          onOpenReportWhatsApp={(b) => {
            setIsBikeRegisterModalOpen(false);
            setBikeToEdit(null);
            setReportInitialReason('reevaluacao_bienal');
            setBikeToReport(b);
          }}
          onDeleteRequest={(b) => {
            setBikeToDelete(b);
          }}
        />
      )}

      {/* Biennial Reevaluation Modal */}
      {bikeToReevaluate && (
        <BikeReevaluationModal
          bike={bikeToReevaluate}
          config={config}
          onClose={() => setBikeToReevaluate(null)}
          onConfirmReevaluation={handleConfirmReevaluation}
          onOpenReportWhatsApp={(b) => {
            setReportInitialReason('reevaluacao_bienal');
            setBikeToReport(b);
          }}
        />
      )}

      {/* WhatsApp Report Modal */}
      {bikeToReport && (
        <BikeReportModal
          bike={bikeToReport}
          config={config}
          initialReason={reportInitialReason}
          onClose={() => {
            setBikeToReport(null);
            setReportInitialReason(undefined);
          }}
          onReportSent={handleReportSent}
        />
      )}

      {/* Delete Bike Confirmation Warning Modal */}
      {bikeToDelete && (
        <DeleteBikeConfirmModal
          bike={bikeToDelete}
          onClose={() => setBikeToDelete(null)}
          onConfirm={handleConfirmDeleteBike}
        />
      )}

      {/* Help, Intro & Guide for Síndicos Modal */}
      <HelpGuideModal
        isOpen={isHelpGuideOpen}
        initialStepIndex={guideInitialStep}
        onClose={() => {
          setIsHelpGuideOpen(false);
          setGuideInitialStep(undefined);
        }}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setIsHelpGuideOpen(false);
        }}
        onStartInAppTour={(stepIndex) => {
          setIsHelpGuideOpen(false);
          setTourStepIndex(stepIndex);
        }}
      />

      {/* Interactive In-App Tour Overlay with Visual Spotlight Ring & Floating Instruction Balloon */}
      {tourStepIndex !== null && (
        <InAppTourOverlay
          stepIndex={tourStepIndex}
          onReturnToGuide={(stepIdx) => {
            setTourStepIndex(null);
            setGuideInitialStep(stepIdx);
            setIsHelpGuideOpen(true);
          }}
          onNextStep={() => {
            setTourStepIndex((prev) => (prev !== null && prev < TOUR_STEPS.length - 1 ? prev + 1 : prev));
          }}
          onPrevStep={() => {
            setTourStepIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
          }}
          onCloseTour={() => {
            setTourStepIndex(null);
          }}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
          }}
        />
      )}

      {/* Sector Photo Modal triggered from Drawer */}
      {drawerSectorPhotoTarget && (
        <SectorPhotoModal
          isOpen={!!drawerSectorPhotoTarget}
          sectorName={drawerSectorPhotoTarget}
          sectorSpotCount={spots.filter((s) => s.sector === drawerSectorPhotoTarget).length}
          initialData={config.sectorPhotos?.[drawerSectorPhotoTarget]}
          onClose={() => setDrawerSectorPhotoTarget(null)}
          onSave={handleSaveSectorPhoto}
        />
      )}

      {/* Connectivity & Offline Status Indicator */}
      <OfflineIndicator syncState={syncState} pendingChanges={pendingChanges} />
    </div>
  );
}
