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
