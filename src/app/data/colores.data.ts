// Colores representativos de cada seleccion para el avatar del jugador.
// Se usa el color primario de la camiseta. Si un pais no esta aqui, usa un gris neutro.

export const COLORES_PAIS: Record<string, string> = {
  'Argentina': '#6CACE4',
  'Alemania': '#1A1A1A',
  'Argelia': '#0A6B3B',
  'Arabia Saudita': '#1B7A43',
  'Brasil': '#F7CB00',
  'Francia': '#1E3A8A',
  'Espana': '#C60B1E',
  'Portugal': '#C8102E',
  'Inglaterra': '#FFFFFF',
  'Italia': '#1E4FA3',
  'Uruguay': '#5CB8E6',
  'Colombia': '#FCD116',
  'Mexico': '#006847',
  'Estados Unidos': '#1B2A4A',
};

export function colorPais(pais: string): string {
  return COLORES_PAIS[pais] || '#888780';
}

// Genera las iniciales del jugador (ej. "Lionel Messi" -> "LM").
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
