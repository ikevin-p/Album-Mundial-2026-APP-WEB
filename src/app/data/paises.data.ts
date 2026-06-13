export interface PaisCatalogo {
  nombre: string;
  bandera: string;
  zona: string;
  colorCamiseta: string;
  colorSecundario: string;
  flagCode: string; // Código ISO 3166-1 alpha-2 para flagcdn.com
}

// Bandera real: https://flagcdn.com/w80/{codigo}.png
// Funciona con todos los países del mundo, sin API key
export const FLAG = (code: string) =>
  code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '';

export const PAISES_MUNDIAL: PaisCatalogo[] = [
  // CONCACAF
  { nombre:'Canada',         bandera:'🇨🇦', zona:'CONCACAF', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'ca' },
  { nombre:'Estados Unidos', bandera:'🇺🇸', zona:'CONCACAF', colorCamiseta:'#1B2A4A', colorSecundario:'#BF0A30', flagCode:'us' },
  { nombre:'Mexico',         bandera:'🇲🇽', zona:'CONCACAF', colorCamiseta:'#006847', colorSecundario:'#FFFFFF', flagCode:'mx' },
  { nombre:'Curazao',        bandera:'🇨🇼', zona:'CONCACAF', colorCamiseta:'#003DA5', colorSecundario:'#F9E100', flagCode:'cw' },
  { nombre:'Haiti',          bandera:'🇭🇹', zona:'CONCACAF', colorCamiseta:'#00209F', colorSecundario:'#D21034', flagCode:'ht' },
  { nombre:'Panama',         bandera:'🇵🇦', zona:'CONCACAF', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'pa' },
  // CONMEBOL
  { nombre:'Argentina',      bandera:'🇦🇷', zona:'CONMEBOL', colorCamiseta:'#6CACE4', colorSecundario:'#FFFFFF', flagCode:'ar' },
  { nombre:'Brasil',         bandera:'🇧🇷', zona:'CONMEBOL', colorCamiseta:'#F7CB00', colorSecundario:'#009C3B', flagCode:'br' },
  { nombre:'Colombia',       bandera:'🇨🇴', zona:'CONMEBOL', colorCamiseta:'#FCD116', colorSecundario:'#003087', flagCode:'co' },
  { nombre:'Ecuador',        bandera:'🇪🇨', zona:'CONMEBOL', colorCamiseta:'#FFD100', colorSecundario:'#003087', flagCode:'ec' },
  { nombre:'Paraguay',       bandera:'🇵🇾', zona:'CONMEBOL', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'py' },
  { nombre:'Uruguay',        bandera:'🇺🇾', zona:'CONMEBOL', colorCamiseta:'#5CB8E6', colorSecundario:'#FFFFFF', flagCode:'uy' },
  // UEFA
  { nombre:'Alemania',       bandera:'🇩🇪', zona:'UEFA', colorCamiseta:'#1A1A1A', colorSecundario:'#FFFFFF', flagCode:'de' },
  { nombre:'Austria',        bandera:'🇦🇹', zona:'UEFA', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'at' },
  { nombre:'Belgica',        bandera:'🇧🇪', zona:'UEFA', colorCamiseta:'#D52B1E', colorSecundario:'#1A1A1A', flagCode:'be' },
  { nombre:'Bosnia y Herzegovina', bandera:'🇧🇦', zona:'UEFA', colorCamiseta:'#003DA5', colorSecundario:'#FFD700', flagCode:'ba' },
  { nombre:'Croacia',        bandera:'🇭🇷', zona:'UEFA', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'hr' },
  { nombre:'Escocia',        bandera:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', zona:'UEFA', colorCamiseta:'#003DA5', colorSecundario:'#FFFFFF', flagCode:'gb-sct' },
  { nombre:'Espana',         bandera:'🇪🇸', zona:'UEFA', colorCamiseta:'#C60B1E', colorSecundario:'#FFD700', flagCode:'es' },
  { nombre:'Francia',        bandera:'🇫🇷', zona:'UEFA', colorCamiseta:'#1E3A8A', colorSecundario:'#FFFFFF', flagCode:'fr' },
  { nombre:'Inglaterra',     bandera:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', zona:'UEFA', colorCamiseta:'#FFFFFF', colorSecundario:'#CC0000', flagCode:'gb-eng' },
  { nombre:'Noruega',        bandera:'🇳🇴', zona:'UEFA', colorCamiseta:'#EF2B2D', colorSecundario:'#FFFFFF', flagCode:'no' },
  { nombre:'Paises Bajos',   bandera:'🇳🇱', zona:'UEFA', colorCamiseta:'#FF6600', colorSecundario:'#FFFFFF', flagCode:'nl' },
  { nombre:'Portugal',       bandera:'🇵🇹', zona:'UEFA', colorCamiseta:'#C8102E', colorSecundario:'#006600', flagCode:'pt' },
  { nombre:'Republica Checa',bandera:'🇨🇿', zona:'UEFA', colorCamiseta:'#D52B1E', colorSecundario:'#003DA5', flagCode:'cz' },
  { nombre:'Suecia',         bandera:'🇸🇪', zona:'UEFA', colorCamiseta:'#006AA7', colorSecundario:'#FECC02', flagCode:'se' },
  { nombre:'Suiza',          bandera:'🇨🇭', zona:'UEFA', colorCamiseta:'#D52B1E', colorSecundario:'#FFFFFF', flagCode:'ch' },
  { nombre:'Turquia',        bandera:'🇹🇷', zona:'UEFA', colorCamiseta:'#C8102E', colorSecundario:'#FFFFFF', flagCode:'tr' },
  // CAF
  { nombre:'Argelia',        bandera:'🇩🇿', zona:'CAF', colorCamiseta:'#006233', colorSecundario:'#FFFFFF', flagCode:'dz' },
  { nombre:'Cabo Verde',     bandera:'🇨🇻', zona:'CAF', colorCamiseta:'#003893', colorSecundario:'#CF2027', flagCode:'cv' },
  { nombre:'Costa de Marfil',bandera:'🇨🇮', zona:'CAF', colorCamiseta:'#F77F00', colorSecundario:'#009A44', flagCode:'ci' },
  { nombre:'Egipto',         bandera:'🇪🇬', zona:'CAF', colorCamiseta:'#C8102E', colorSecundario:'#FFFFFF', flagCode:'eg' },
  { nombre:'Ghana',          bandera:'🇬🇭', zona:'CAF', colorCamiseta:'#FFFFFF', colorSecundario:'#1A1A1A', flagCode:'gh' },
  { nombre:'Marruecos',      bandera:'🇲🇦', zona:'CAF', colorCamiseta:'#C8102E', colorSecundario:'#006233', flagCode:'ma' },
  { nombre:'Republica Democratica del Congo', bandera:'🇨🇩', zona:'CAF', colorCamiseta:'#007FFF', colorSecundario:'#F7D400', flagCode:'cd' },
  { nombre:'Senegal',        bandera:'🇸🇳', zona:'CAF', colorCamiseta:'#FFFFFF', colorSecundario:'#00A651', flagCode:'sn' },
  { nombre:'Sudafrica',      bandera:'🇿🇦', zona:'CAF', colorCamiseta:'#007A4D', colorSecundario:'#FFB81C', flagCode:'za' },
  { nombre:'Tunez',          bandera:'🇹🇳', zona:'CAF', colorCamiseta:'#C8102E', colorSecundario:'#FFFFFF', flagCode:'tn' },
  // AFC
  { nombre:'Arabia Saudita', bandera:'🇸🇦', zona:'AFC', colorCamiseta:'#006847', colorSecundario:'#FFFFFF', flagCode:'sa' },
  { nombre:'Australia',      bandera:'🇦🇺', zona:'AFC', colorCamiseta:'#FFD700', colorSecundario:'#006847', flagCode:'au' },
  { nombre:'Catar',          bandera:'🇶🇦', zona:'AFC', colorCamiseta:'#8D153A', colorSecundario:'#FFFFFF', flagCode:'qa' },
  { nombre:'Corea del Sur',  bandera:'🇰🇷', zona:'AFC', colorCamiseta:'#C8102E', colorSecundario:'#FFFFFF', flagCode:'kr' },
  { nombre:'Irak',           bandera:'🇮🇶', zona:'AFC', colorCamiseta:'#007A3D', colorSecundario:'#CE1126', flagCode:'iq' },
  { nombre:'Iran',           bandera:'🇮🇷', zona:'AFC', colorCamiseta:'#FFFFFF', colorSecundario:'#239F40', flagCode:'ir' },
  { nombre:'Japon',          bandera:'🇯🇵', zona:'AFC', colorCamiseta:'#1A1A1A', colorSecundario:'#FFFFFF', flagCode:'jp' },
  { nombre:'Jordania',       bandera:'🇯🇴', zona:'AFC', colorCamiseta:'#007A3D', colorSecundario:'#CE1126', flagCode:'jo' },
  { nombre:'Uzbekistan',     bandera:'🇺🇿', zona:'AFC', colorCamiseta:'#1EB6E8', colorSecundario:'#FFFFFF', flagCode:'uz' },
  // OFC
  { nombre:'Nueva Zelanda',  bandera:'🇳🇿', zona:'OFC', colorCamiseta:'#FFFFFF', colorSecundario:'#1A1A1A', flagCode:'nz' },
  // ESPECIALES
  { nombre:'Especiales',     bandera:'⭐', zona:'FIFA', colorCamiseta:'#FFD24C', colorSecundario:'#0A1F44', flagCode:'' },
];

export function getPais(nombre: string): PaisCatalogo {
  return PAISES_MUNDIAL.find(p => p.nombre === nombre)
    || { nombre, bandera:'🏳️', zona:'', colorCamiseta:'#888', colorSecundario:'#ccc', flagCode:'' };
}

export function iniciales(nombre: string): string {
  if (nombre.startsWith('Escudo'))       return '🛡️';
  if (nombre.startsWith('Estadio'))      return '🏟️';
  if (nombre.startsWith('World Cup'))    return '🏆';
  if (nombre.startsWith('Legend'))       return '👑';
  if (nombre.startsWith('Future'))       return '🌟';
  if (nombre.startsWith('Captain'))      return '©️';
  if (nombre.startsWith('Golden'))       return '🥇';
  if (nombre.startsWith('Best Goal'))    return '🧤';
  if (nombre.startsWith('Record'))       return '📋';
  if (nombre.startsWith('Rising'))       return '⚡';
  if (nombre.startsWith('Host'))         return '🏙️';
  if (nombre.startsWith('Stadium Icon')) return '🏟️';
  if (nombre.startsWith('Team Photo'))   return '📸';
  if (nombre.startsWith('Mascota'))      return '🦁';
  if (nombre.startsWith('Balón'))        return '⚽';
  const p = nombre.trim().split(/\s+/);
  if (p.length === 1) return p[0].substring(0,2).toUpperCase();
  return (p[0][0] + p[p.length-1][0]).toUpperCase();
}
