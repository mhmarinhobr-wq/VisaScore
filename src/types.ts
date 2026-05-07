export type Section = 
  | 'pessoal' 
  | 'trabalho' 
  | 'viagem' 
  | 'contato' 
  | 'historico_intl' 
  | 'historico_consular' 
  | 'vinculos' 
  | 'consistencia';

export interface Option {
  label: string;
  value: string;
  points: number;
}

export interface Question {
  id: string;
  section: Section;
  text: string;
  type: 'select' | 'text' | 'number';
  options?: Option[];
  placeholder?: string;
  penaltyIf?: {
    field: string;
    value: string;
    penalty: number;
  };
}

export interface SimulationResult {
  score: number;
  classification: 'Forte' | 'Médio' | 'Arriscado';
  positives: string[];
  negatives: string[];
  risks: string[];
  recommendations: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  status: 'active' | 'blocked' | 'pending';
  lastAccess: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface AppContent {
  ds160_1: string;
  ds160_2: string;
  ds160_3: string;
  ds160_4: string;
  checklist: string;
  preparation: string;
}

export type View = 'dashboard' | 'simulator' | 'result' | 'admin_users' | 'admin_content' | 'checklist';
