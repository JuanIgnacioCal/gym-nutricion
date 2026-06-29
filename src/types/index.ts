export interface GymConfig {
  gym: {
    nombre: string;
    tagline: string;
    logo: string;
    colores: {
      primario: string;
      acento: string;
      fondo: string;
      superficie: string;
      superficieAlt: string;
      texto: string;
      textoSecundario: string;
      borde: string;
      exito: string;
      error: string;
      /** Color de texto/íconos sobre botones primarios (opcional, default negro). */
      sobrePrimario?: string;
    };
  };
  /** Email del dueño del gym. Solo este usuario puede ver el panel (/panel). Se setea por gym (white-label). */
  ownerEmail?: string;
}

export type TipoComida = 'desayuno' | 'almuerzo' | 'merienda' | 'cena';

export type NivelActividad = 'sedentario' | 'moderado' | 'activo' | 'muy_activo';
export type ObjetivoTipo = 'bajar' | 'mantener' | 'subir';
export type Sexo = 'masculino' | 'femenino';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  /** Datos físicos usados para calcular el TDEE */
  datos_fisicos?: {
    peso: number;       // kg
    altura: number;     // cm
    edad: number;       // años
    sexo: Sexo;
    nivel_actividad: NivelActividad;
    objetivo_tipo: ObjetivoTipo;
  };
  objetivo: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
    comidas: 3 | 4;
  };
  tema: 'oscuro' | 'claro';
  onboardingCompleto: boolean;
  /** True si el usuario logueado es el dueño del gym. Lo calcula el server en /api/auth/me. */
  esDueno?: boolean;
}

export interface Receta {
  id: number;
  nombre: string;
  nombre_original: string;
  origen: string;
  tipo_comida: string;
  categoria: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  porciones: number;
  tiempo_preparacion: number;
  tiempo_coccion: number;
  tiempo_total: number;
  ingredientes: string[];
  /** Pasos de preparación. Se cargan desde data/pasos.json por id de receta. */
  pasos?: string[];
  /** Factor de escala de porción aplicado en el plan (ej. 1.3 = 1.3 porciones). Solo en contexto de plan. */
  escala?: number;
  url_original: string;
  calificacion: number;
}

export interface RegistroDiario {
  id: number;
  usuario_id: string;
  fecha: string;
  tipo_comida: TipoComida;
  receta_id?: number;
  nombre_comida: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  gramos: number;
}

export interface PlanDiario {
  id: number;
  usuario_id: string;
  fecha: string;
  desayuno?: Receta;
  almuerzo?: Receta;
  merienda?: Receta;
  cena?: Receta;
}

export interface Favorito {
  id: number;
  usuario_id: string;
  receta_id?: number;
  receta?: Receta;
  comida_personalizada?: string;
  tipo: 'receta' | 'personalizado';
  created_at: string;
}

export interface AlimentoUSDA {
  fdcId: number;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  porcion: string;
}

/** Resultado de busqueda de alimento normalizado por 100g (USDA u Open Food Facts). */
export interface AlimentoBusqueda {
  fuente: 'usda' | 'openfoodfacts' | 'receta';
  id: string;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  porcion: string;
}

export interface MacroTotales {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

/** Serie temporal del panel del dueño: etiquetas + dos métricas alineadas por índice. */
export interface PanelSerie {
  labels: string[];
  planes: number[];
  comidas: number[];
}

/** Una fila de la tabla de socios del panel del dueño. */
export interface PanelSocio {
  id: string;
  nombre: string;
  email: string;
  /** Fecha de alta (YYYY-MM-DD). */
  alta: string;
  /** Último día con actividad (plan o registro), o null si nunca usó la app. */
  ultimo: string | null;
  kcal: number;
  comidas: 3 | 4;
  objetivo_tipo: ObjetivoTipo | null;
  /** True si esta fila es el propio dueño del gym (no se le resetea la clave desde el panel). */
  esDueno: boolean;
}

/** Respuesta de GET /api/panel: métricas agregadas del gym para el dueño. */
export interface PanelData {
  /** Fecha de referencia con la que se calcularon las métricas (YYYY-MM-DD). */
  generadoEl: string;
  kpis: { total: number; activos7: number; activos30: number; altasMes: number };
  serie: { dia: PanelSerie; semana: PanelSerie };
  socios: PanelSocio[];
  objetivos: { bajar: number; mantener: number; subir: number; sin_definir: number };
  kcalPromedio: number;
  comidasSplit: { tres: number; cuatro: number };
}

/** Plan de un día serializado (recetas ya escaladas a la porción del objetivo). */
export interface PlanDiaJSON {
  fecha: string;
  desayuno: Receta | null;
  almuerzo: Receta | null;
  merienda: Receta | null;
  cena: Receta | null;
}

/** Respuesta de /api/plan/semana: 7 días desde `inicio` (lunes). Cada día null si no tiene plan. */
export interface PlanSemana {
  inicio: string;
  dias: (PlanDiaJSON | null)[];
}
