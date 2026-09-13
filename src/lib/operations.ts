import { supabase } from './supabase';

/**
 * Comandos operacionais atômicos no banco.
 * Estes métodos serão usados pela interface durante a migração gradual do
 * snapshot para as tabelas normalizadas de produção.
 */
export async function assignBicycleToSpot(input: {
  condominiumId: string;
  spotId: string;
  bicycleId: string;
  concessionType?: 'vitalicio' | 'determinado';
  concessionEndDate?: string;
  note?: string;
}) {
  if (!supabase) throw new Error('Conexão com a nuvem não configurada.');
  const { data, error } = await supabase.rpc('assign_bicycle_to_spot', {
    p_condominium_id: input.condominiumId,
    p_spot_id: input.spotId,
    p_bicycle_id: input.bicycleId,
    p_concession_type: input.concessionType ?? (input.concessionEndDate ? 'determinado' : 'vitalicio'),
    p_concession_end_date: input.concessionEndDate ?? null,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function releaseSpotAllocation(input: {
  condominiumId: string;
  allocationId: string;
  note?: string;
}) {
  if (!supabase) throw new Error('Conexão com a nuvem não configurada.');
  const { data, error } = await supabase.rpc('release_spot_allocation', {
    p_condominium_id: input.condominiumId,
    p_allocation_id: input.allocationId,
    p_note: input.note?.trim() || null,
  });
  if (error) throw error;
  return data;
}
