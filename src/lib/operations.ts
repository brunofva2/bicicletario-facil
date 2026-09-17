import { supabase } from './supabase';
import type { ConcessionType, RegisteredBicycle } from '../types';

function requireCloud() {
  if (!supabase) throw new Error('Conexão com a nuvem não configurada.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Esta operação precisa de conexão para ser confirmada com segurança.');
  }
  return supabase;
}

function bicyclePayload(bicycle: RegisteredBicycle) {
  return {
    id: bicycle.id,
    residentName: bicycle.residentName,
    apartment: bicycle.apartment,
    block: bicycle.block,
    residentPhone: bicycle.residentPhone || null,
    residentEmail: bicycle.residentEmail || null,
    brandModel: bicycle.brandModel,
    color: bicycle.color,
    tagNumber: bicycle.tagNumber || null,
    photoUrl: bicycle.photoUrl || null,
    category: bicycle.category || null,
    serialNumber: bicycle.serialNumber || null,
    distinguishingFeatures: bicycle.distinguishingFeatures || null,
    notes: bicycle.notes || null,
    registeredAt: bicycle.registeredAt,
    lastReevaluatedAt: bicycle.lastReevaluatedAt || null,
    reevaluationStatus: bicycle.reevaluationStatus || 'em_dia',
    reevaluationNotes: bicycle.reevaluationNotes || null,
    lastReportAt: bicycle.lastReportDate || null,
    lastReportReason: bicycle.lastReportReason || null,
  };
}

/**
 * Comandos operacionais atômicos no banco.
 * Estes métodos serão usados pela interface durante a migração gradual do
 * snapshot para as tabelas normalizadas de produção.
 */
export async function assignBicycleToSpot(input: {
  condominiumId: string;
  spotLegacyId: string;
  bicycle: RegisteredBicycle;
  concessionType?: ConcessionType;
  concessionEndDate?: string;
  requestId?: string;
  note?: string;
}) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('assign_bicycle_to_spot_by_legacy_id', {
    p_condominium_id: input.condominiumId,
    p_spot_legacy_id: input.spotLegacyId,
    p_bicycle: bicyclePayload(input.bicycle),
    p_concession_type: input.concessionType ?? (input.concessionEndDate ? 'determinado' : 'vitalicio'),
    p_concession_end_date: input.concessionEndDate ?? null,
    p_request_id: input.requestId ?? null,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function releaseSpotAllocation(input: {
  condominiumId: string;
  spotLegacyId: string;
  note?: string;
}) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('release_spot_allocation_by_legacy_id', {
    p_condominium_id: input.condominiumId,
    p_spot_legacy_id: input.spotLegacyId,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function updateSpotConcession(input: {
  condominiumId: string;
  spotLegacyId: string;
  concessionType: ConcessionType;
  concessionEndDate?: string;
}) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('update_spot_concession_by_legacy_id', {
    p_condominium_id: input.condominiumId,
    p_spot_legacy_id: input.spotLegacyId,
    p_concession_type: input.concessionType,
    p_concession_end_date: input.concessionType === 'determinado' ? input.concessionEndDate ?? null : null,
  });
  if (error) throw error;
  return data;
}

export async function registerSpotUsage(input: { condominiumId: string; spotLegacyId: string }) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('register_spot_usage_by_legacy_id', {
    p_condominium_id: input.condominiumId,
    p_spot_legacy_id: input.spotLegacyId,
  });
  if (error) throw error;
  return data;
}

export async function archiveBicycle(input: { condominiumId: string; bicycleLegacyId: string; note?: string }) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('archive_bicycle_by_legacy_id', {
    p_condominium_id: input.condominiumId,
    p_bicycle_legacy_id: input.bicycleLegacyId,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function decideOperationalRequest(input: {
  condominiumId: string;
  requestId: string;
  action: 'reject' | 'complete' | 'convert_to_occurrence';
  note?: string;
}) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('decide_operational_request', {
    p_condominium_id: input.condominiumId,
    p_request_id: input.requestId,
    p_action: input.action,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function getSpotPublicSlug(input: { condominiumId: string; spotLegacyId: string }) {
  const cloud = requireCloud();
  const { data, error } = await cloud.rpc('get_spot_public_slug', {
    p_condominium_id: input.condominiumId,
    p_spot_legacy_id: input.spotLegacyId,
  });
  if (error) throw error;
  if (typeof data !== 'string' || !data) throw new Error('Identificação pública da vaga não encontrada.');
  return data;
}
