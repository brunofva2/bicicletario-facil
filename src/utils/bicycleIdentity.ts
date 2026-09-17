import type { BicycleSpot, RegisteredBicycle } from '../types';

/** A displayed number or resident name is never an allocation identity. */
export function isAllocatedToBike(spot: BicycleSpot, bike: RegisteredBicycle): boolean {
  const allocation = spot.currentAllocation;
  if (!allocation) return false;
  if (allocation.bicycleId) return allocation.bicycleId === bike.id;
  // Compatibility with old snapshots: only the exact stored spot id is safe.
  return Boolean(bike.spotId && bike.spotId === spot.id);
}

export function releaseBikeSpots(spots: BicycleSpot[], bike: RegisteredBicycle): BicycleSpot[] {
  return spots.map((spot) => isAllocatedToBike(spot, bike)
    ? { ...spot, currentAllocation: undefined, lastUsageDate: undefined }
    : spot);
}

export function reconcileBikeSpots(bikes: RegisteredBicycle[], spots: BicycleSpot[]): RegisteredBicycle[] {
  const usedSpots = new Set<string>();
  return bikes.map((bike) => {
    const matches = spots.filter((spot) => isAllocatedToBike(spot, bike));
    if (matches.length > 1 || (matches[0] && usedSpots.has(matches[0].id))) {
      throw new Error('Há vínculos ambíguos. Revise as bicicletas vinculadas antes de aplicar a estrutura.');
    }
    const spot = matches[0];
    if (spot) usedSpots.add(spot.id);
    return { ...bike, spotId: spot?.id, spotNumber: spot?.spotNumber };
  });
}
