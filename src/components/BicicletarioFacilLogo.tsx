import React from 'react';

interface LogoProps {
  variant?: 'full' | 'horizontal' | 'centered' | 'stacked' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const BicicletarioFacilLogo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  // Geometric condensed sans-serif with elegant spacing for BICICLETÁRIO
  const titleSizes = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  };

  // Sizing for FÁCIL (horizontal mode)
  const facilSizes = {
    sm: 'text-[9px] sm:text-[10px] tracking-[0.25em]',
    md: 'text-[10px] sm:text-[11px] tracking-[0.28em]',
    lg: 'text-xs sm:text-sm tracking-[0.32em]',
    xl: 'text-sm sm:text-base tracking-[0.35em]',
  };

  // Sizing for FÁCIL when centered (proportional letter-spacing)
  const facilCenteredSizes = {
    sm: 'text-[10px] sm:text-[11px] tracking-[0.45em] pl-[0.45em]',
    md: 'text-[11px] sm:text-[12px] tracking-[0.5em] pl-[0.5em]',
    lg: 'text-xs sm:text-sm tracking-[0.55em] pl-[0.55em]',
    xl: 'text-sm sm:text-base tracking-[0.6em] pl-[0.6em]',
  };

  // Sizing for "administração de vagas" - subtle, slightly smaller than FÁCIL
  const tagSizes = {
    sm: 'text-[8px] sm:text-[8.5px]',
    md: 'text-[9px] sm:text-[9.5px]',
    lg: 'text-[10.5px] sm:text-[11.5px]',
    xl: 'text-xs sm:text-sm',
  };

  // Centered / Stacked layout (ideal for Plaques and Badges)
  if (variant === 'centered' || variant === 'stacked' || variant === 'full') {
    return (
      <div
        className={`inline-flex flex-col items-center text-center select-none leading-none ${className}`}
        aria-label="Logo Bicicletário Fácil - Administração de Vagas"
      >
        {/* BICICLETÁRIO */}
        <div
          className={`font-extrabold uppercase leading-none tracking-[0.08em] text-center ${titleSizes[size]}`}
          style={{
            fontFamily: "'Barlow Condensed', 'Oswald', system-ui, -apple-system, sans-serif",
            letterSpacing: '0.085em',
          }}
        >
          <span className="text-slate-900 font-extrabold">BICICLETÁ</span>
          <span className="text-[#C87612] font-extrabold">RIO</span>
        </div>

        {/* FÁCIL no centro logo abaixo de BICICLETÁRIO */}
        <div
          className={`font-bold uppercase text-slate-800 text-center mt-1 leading-none ${facilCenteredSizes[size]}`}
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          }}
        >
          FÁCIL
        </div>

        {/* administração de vagas mantida abaixo da palavra FÁCIL */}
        {showTagline && (
          <div
            className={`font-normal text-slate-500 lowercase text-center mt-1 leading-none tracking-tight ${tagSizes[size]}`}
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            }}
          >
            administração de vagas
          </div>
        )}
      </div>
    );
  }

  // Default horizontal layout
  return (
    <div
      className={`inline-flex flex-col select-none leading-none ${className}`}
      aria-label="Logo Bicicletário Fácil - Administração de Vagas"
    >
      {/* BICICLETÁRIO - Fonte sans-serif geométrica condensada com espaçamento */}
      <div
        className={`font-extrabold uppercase leading-none tracking-[0.08em] ${titleSizes[size]}`}
        style={{
          fontFamily: "'Barlow Condensed', 'Oswald', system-ui, -apple-system, sans-serif",
          letterSpacing: '0.085em',
        }}
      >
        <span className="text-slate-900 font-extrabold">BICICLETÁ</span>
        <span className="text-[#C87612] font-extrabold">RIO</span>
      </div>

      {/* FÁCIL + administração de vagas ao lado */}
      <div className="flex items-center mt-1 leading-none">
        <span
          className={`font-bold uppercase text-slate-800 leading-none ${facilSizes[size]}`}
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          }}
        >
          FÁCIL
        </span>

        {showTagline && (
          <span className="hidden sm:inline-flex items-center">
            <span
              className="w-1 h-1 rounded-full bg-slate-300 mx-1.5 inline-block shrink-0"
              aria-hidden="true"
            />
            <span
              className={`font-normal text-slate-500 lowercase leading-none tracking-tight ${tagSizes[size]}`}
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              }}
            >
              administração de vagas
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
