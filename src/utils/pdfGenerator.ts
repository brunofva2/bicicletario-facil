import { jsPDF } from 'jspdf';
import { RegisteredBicycle, SystemConfig } from '../types';
import { getBikeReevaluationInfo } from './reevaluation';

export interface PdfExportOptions {
  condominiumName: string;
  includePhotos?: boolean;
  filterLabel?: string;
  sortBy?: 'apartment' | 'resident' | 'spot' | 'recent';
  onProgress?: (progressText: string, percentage: number) => void;
}

/**
 * Loads an image (base64 or remote URL) and returns an optimized JPEG data URL
 * If CORS or network prevents loading, resolves null safely so PDF generation never fails.
 */
async function getOptimizedBase64Image(url?: string): Promise<string | null> {
  if (!url || typeof window === 'undefined') return null;

  // If already a raster base64 image data URL (JPEG/PNG/WEBP), return directly
  if (
    url.startsWith('data:image/jpeg') ||
    url.startsWith('data:image/png') ||
    url.startsWith('data:image/webp')
  ) {
    return url;
  }

  // For SVG data URLs or other images, render onto canvas to get a valid raster JPEG for jsPDF
  return new Promise((resolve) => {
    try {
      const img = new Image();
      if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }

      // 1800ms timeout failsafe
      const timer = setTimeout(() => {
        resolve(null);
      }, 1800);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          // Scale down for sharp thumbnail in PDF without bloat
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (err) {
          // If canvas tainted by cross-origin
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates and triggers download of a summarized PDF report with small thumbnails.
 */
export async function generateBicyclesPdf(
  bikes: RegisteredBicycle[],
  config: SystemConfig,
  options?: Partial<PdfExportOptions>
): Promise<void> {
  const condominiumName = options?.condominiumName || config.condominiumName || 'Condomínio';
  const includePhotos = options?.includePhotos ?? true;
  const sortBy = options?.sortBy || 'apartment';
  const filterLabel = options?.filterLabel;

  options?.onProgress?.('Organizando dados das bicicletas...', 10);

  // 1. Sort bikes according to user preference (Default: Apartamento & Morador)
  const sortedBikes = [...bikes].sort((a, b) => {
    if (sortBy === 'apartment') {
      const numA = parseInt(a.apartment.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.apartment.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      const blockComp = a.block.localeCompare(b.block);
      if (blockComp !== 0) return blockComp;
      return a.residentName.localeCompare(b.residentName);
    }
    if (sortBy === 'resident') {
      return a.residentName.localeCompare(b.residentName);
    }
    if (sortBy === 'spot') {
      if (a.spotNumber && !b.spotNumber) return -1;
      if (!a.spotNumber && b.spotNumber) return 1;
      return (a.spotNumber || '').localeCompare(b.spotNumber || '');
    }
    if (sortBy === 'recent') {
      return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
    }
    return 0;
  });

  // 2. Pre-process images in parallel batches
  const imageMap = new Map<string, string | null>();
  if (includePhotos) {
    options?.onProgress?.('Processando miniaturas das fotos...', 25);
    const promises = sortedBikes.map(async (bike, index) => {
      const imgData = await getOptimizedBase64Image(bike.photoUrl);
      imageMap.set(bike.id, imgData);
      const pct = Math.round(25 + ((index + 1) / sortedBikes.length) * 45);
      options?.onProgress?.(`Processando foto ${index + 1} de ${sortedBikes.length}...`, pct);
    });
    await Promise.all(promises);
  }

  options?.onProgress?.('Montando documento PDF...', 75);

  // 3. Initialize jsPDF (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 12;
  const marginRight = 12;
  const contentWidth = pageWidth - marginLeft - marginRight; // 186mm

  let currentY = 12;
  let currentPage = 1;

  // Summary Metrics
  const totalBikes = sortedBikes.length;
  const withSpot = sortedBikes.filter((b) => !!b.spotNumber).length;
  const withoutSpot = totalBikes - withSpot;
  const dueCount = sortedBikes.filter((b) => getBikeReevaluationInfo(b).isDue).length;
  const emissionDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper to draw Page Header
  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Top header banner background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CADASTRO GERAL DE BICICLETAS & CONTROLE DE VAGAS', marginLeft + 5, currentY + 7.5);

      // Condominium Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(226, 232, 240); // slate-200
      doc.text(`Condomínio: ${condominiumName}`, marginLeft + 5, currentY + 13.5);

      // Date of issue & badge
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Emissão: ${emissionDate} • Sistema Bicicletário Fácil`, marginLeft + 5, currentY + 19);

      // Right side badge in header
      doc.setFillColor(30, 41, 59); // slate-800
      doc.roundedRect(pageWidth - marginRight - 42, currentY + 4, 38, 16, 1.5, 1.5, 'F');
      doc.setTextColor(241, 245, 249);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${totalBikes} Bicicletas`, pageWidth - marginRight - 23, currentY + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Registradas no sistema', pageWidth - marginRight - 23, currentY + 16, { align: 'center' });

      currentY += 27;

      // Summary Statistics strip
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(marginLeft, currentY, contentWidth, 10, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Resumo:`, marginLeft + 4, currentY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Total: ${totalBikes} bikes   |   Com Vaga Fixa: ${withSpot}   |   Sem Vaga: ${withoutSpot}   |   Reavaliação (+2a): ${dueCount}${
          filterLabel ? `   |   Filtro: ${filterLabel}` : ''
        }`,
        marginLeft + 20,
        currentY + 6.5
      );

      currentY += 13;
    } else {
      // Compact header for subsequent pages
      doc.setFillColor(15, 23, 42);
      doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(
        `CADASTRO DE BICICLETAS • ${condominiumName.toUpperCase()} (Pág. ${currentPage})`,
        marginLeft + 4,
        currentY + 4.8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      doc.text(`Emissão: ${emissionDate}`, pageWidth - marginRight - 4, currentY + 4.8, { align: 'right' });

      currentY += 10;
    }
  };

  // Helper to draw Footer at bottom of every page
  const drawPageFooter = (page: number, total: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, pageHeight - 10, pageWidth - marginRight, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Bicicletário Fácil • Gestão Predial e Controle de Vagas Suspensas (Modo Local)',
      marginLeft,
      pageHeight - 6
    );
    doc.text(`Página ${page} de ${total}`, pageWidth - marginRight, pageHeight - 6, { align: 'right' });
  };

  // Draw Page 1 header
  drawPageHeader(true);

  // Bike Row Card Height & Sizing (Compact format with small thumbnail)
  const itemHeight = 28; // 28 mm per bike
  const thumbWidth = 24; // 24 mm wide
  const thumbHeight = 19; // 19 mm high

  for (let i = 0; i < sortedBikes.length; i++) {
    const bike = sortedBikes[i];
    const reeval = getBikeReevaluationInfo(bike);

    // Check if card fits on current page; otherwise add new page
    if (currentY + itemHeight > pageHeight - 14) {
      doc.addPage();
      currentPage++;
      currentY = 12;
      drawPageHeader(false);
    }

    const cardY = currentY;

    // Card background & border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(marginLeft, cardY, contentWidth, itemHeight, 1.5, 1.5, 'FD');

    // Accent line on left (green if has spot, amber if without, red if reevaluation due)
    if (reeval.isDue) {
      doc.setFillColor(245, 158, 11); // amber-500
    } else if (bike.spotNumber) {
      doc.setFillColor(16, 185, 129); // emerald-500
    } else {
      doc.setFillColor(203, 213, 225); // slate-300
    }
    doc.rect(marginLeft, cardY + 2, 1.2, itemHeight - 4, 'F');

    // 1. Thumbnail Image (Smaller size as requested)
    const thumbX = marginLeft + 3;
    const thumbY = cardY + 3.5;
    const cachedImg = imageMap.get(bike.id);

    if (cachedImg) {
      try {
        doc.addImage(cachedImg, 'JPEG', thumbX, thumbY, thumbWidth, thumbHeight);
        // Subtle border around photo
        doc.setDrawColor(203, 213, 225);
        doc.rect(thumbX, thumbY, thumbWidth, thumbHeight, 'S');
      } catch (e) {
        drawFallbackThumb(doc, thumbX, thumbY, thumbWidth, thumbHeight);
      }
    } else {
      drawFallbackThumb(doc, thumbX, thumbY, thumbWidth, thumbHeight);
    }

    // 2. Info Block (Prioritizing Apartment & Resident)
    const textStartX = thumbX + thumbWidth + 4;
    const textMaxWidth = contentWidth - (thumbWidth + 12);

    // Line 1: Apartamento & Morador (PRIMARY TITLE) + Spot Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`APTO ${bike.apartment} (${bike.block})`, textStartX, cardY + 6);

    // Morador Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`•  ${bike.residentName}`, textStartX + 36, cardY + 6);

    // Vaga Suspensa / Sem Vaga Tag (Right aligned)
    const rightBadgeX = pageWidth - marginRight - 4;
    if (bike.spotNumber) {
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(rightBadgeX - 30, cardY + 2.5, 30, 5, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text(`VAGA ${bike.spotNumber}`, rightBadgeX - 15, cardY + 6, { align: 'center' });
    } else {
      doc.setFillColor(254, 243, 199); // amber-50
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.roundedRect(rightBadgeX - 28, cardY + 2.5, 28, 5, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text('SEM VAGA FIXA', rightBadgeX - 14, cardY + 6, { align: 'center' });
    }

    // Line 2: Contact info (WhatsApp / Phone & Email)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const contactText = `Contato: ${bike.residentPhone}${bike.residentEmail ? `  |  E-mail: ${bike.residentEmail}` : ''}`;
    doc.text(contactText, textStartX, cardY + 11);

    // Line 3: Bike Specs (Brand/Model, Color, Category)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Bike: ${bike.brandModel}`, textStartX, cardY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(` |  Cor: ${bike.color}  |  Categoria: ${bike.category}`, textStartX + 32, cardY + 16);

    // Line 4: Seal, Serial / Chassis, and Registration Date
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const regDateStr = new Date(bike.registeredAt).toLocaleDateString('pt-BR');
    const sealText = `Selo: ${bike.tagNumber || 'Sem selo'}   |   Chassi: ${bike.serialNumber || 'N/I'}   |   Cadastro: ${regDateStr} (${reeval.timeDescription})`;
    doc.text(sealText, textStartX, cardY + 20.5);

    // Line 5: Features or Biennial Reevaluation Alert
    if (reeval.isDue) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(
        `[!] Reavaliação Bienal Requerida (+2 anos no condomínio - verificar se morador permanece ativo)`,
        textStartX,
        cardY + 24.5
      );
    } else if (bike.distinguishingFeatures) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const feat = bike.distinguishingFeatures.substring(0, 95);
      doc.text(`Detalhes: ${feat}${bike.distinguishingFeatures.length > 95 ? '...' : ''}`, textStartX, cardY + 24.5);
    }

    currentY += itemHeight + 2.5; // Next row
  }

  // Draw footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
  }

  options?.onProgress?.('Finalizando download...', 95);

  // Generate clean filename
  const cleanCondo = condominiumName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');
  const dateStr = new Date().toISOString().substring(0, 10);
  const filename = `relatorio-bicicletas-${cleanCondo}-${dateStr}.pdf`;

  doc.save(filename);
  options?.onProgress?.('Download concluído com sucesso!', 100);
}

/**
 * Fallback thumbnail renderer when image fails or is unavailable
 */
function drawFallbackThumb(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(x, y, w, h, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('FOTO BIKE', x + w / 2, y + h / 2, { align: 'center' });
}
