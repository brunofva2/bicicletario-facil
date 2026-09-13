import mountainBlue from '../assets/bike-photos/mountain-blue.png';
import electricUrban from '../assets/bike-photos/electric-urban.png';
import roadRed from '../assets/bike-photos/road-red.png';
import foldingOrange from '../assets/bike-photos/folding-orange.png';
import mountainBlack from '../assets/bike-photos/mountain-black.png';
import gravelGreen from '../assets/bike-photos/gravel-green.png';
import urbanTeal from '../assets/bike-photos/urban-teal.png';
import cityBurgundy from '../assets/bike-photos/city-burgundy.png';
import foldingYellow from '../assets/bike-photos/folding-yellow.png';
import hybridBlue from '../assets/bike-photos/hybrid-blue.png';

/**
 * Fotos realistas geradas exclusivamente para os exemplos do Bicicletário Fácil.
 * Não dependem de bancos externos ou de imagens de terceiros.
 */
export const OFFLINE_SAMPLE_PHOTOS: string[] = [
  mountainBlue,
  electricUrban,
  roadRed,
  foldingOrange,
  mountainBlack,
  gravelGreen,
  urbanTeal,
  cityBurgundy,
  foldingYellow,
  hybridBlue,
];

export function getBikeFallbackPhoto(index: number = 0): string {
  return OFFLINE_SAMPLE_PHOTOS[Math.abs(index) % OFFLINE_SAMPLE_PHOTOS.length];
}
