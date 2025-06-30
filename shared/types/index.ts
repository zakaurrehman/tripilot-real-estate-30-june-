// shared/types/index.ts

// User and Auth Types
export interface User {
  id: string;
  email: string;
  subscription: 'trial' | 'pay-as-you-go' | 'starter' | 'pro' | 'enterprise';
  lapisUsed: number;
  lapisTotal: number;
  verticalType: 'real-estate' | 'supply-chain' | 'compliance' | 'construction';
  createdAt: Date;
  updatedAt: Date;
}

// Lapis Usage Tracking
export interface LapisUsage {
  search: number;
  automate: number;
  snapshot: number;
  remaining: number;
  total: number;
}

// Document Types
export type DocumentType = 'deed' | 'mls' | 'inspection' | 'photo' | 'other';

export interface ExtractedFields {
  // Core property fields
  address?: string;
  squareFootage?: number;
  beds?: number;
  baths?: number;
  yearBuilt?: number;
  propertyType?: string;
  
  // Financial fields
  listingPrice?: number;
  estimatedARV?: number;
  taxAssessment?: number;
  
  // Condition fields
  roofAge?: number;
  roofType?: string;
  heatingType?: string;
  coolingType?: string;
  kitchenCondition?: string;
  bathroomCondition?: string;
  
  // Legal/Administrative
  lienStatus?: 'Clear' | 'Liens Present' | 'Unknown';
  zoningType?: string;
  lotSize?: number;
  
  // Calculated fields
  infrastructureScore?: number;
  comps?: Comp[];
  
  // Metadata
  confidence?: Record<string, number>;
  sourceLabels?: Record<string, string[]>;
  [key: string]: any; // Allow additional fields
}

export interface Document {
  id: string;
  filename: string;
  type: DocumentType;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  hash: string;
  userId: string;
  extractedFields?: ExtractedFields;
  error?: string;
}

// Rehab and ROI Types
export enum WorkItemType {
  ROOF = 'Roof',
  KITCHEN = 'Kitchen',
  BATH = 'Bath',
  FLOORING = 'Flooring',
  INTERIOR_PAINT = 'Interior Paint',
  EXTERIOR_PAINT = 'Exterior Paint',
  WINDOWS = 'Windows',
  HVAC = 'HVAC',
  ELECTRICAL = 'Electrical Re-wire',
  PLUMBING = 'Plumbing',
  LANDSCAPING = 'Landscaping'
}

export interface WorkItemCost {
  cost: number;
  unit: 'sf' | 'each' | 'room' | 'total';
}

export const WORK_ITEM_COSTS: Record<WorkItemType, WorkItemCost> = {
  [WorkItemType.ROOF]: { cost: 10, unit: 'sf' },
  [WorkItemType.KITCHEN]: { cost: 25000, unit: 'total' },
  [WorkItemType.BATH]: { cost: 12000, unit: 'each' },
  [WorkItemType.FLOORING]: { cost: 5, unit: 'sf' },
  [WorkItemType.INTERIOR_PAINT]: { cost: 2, unit: 'sf' },
  [WorkItemType.EXTERIOR_PAINT]: { cost: 3, unit: 'sf' },
  [WorkItemType.WINDOWS]: { cost: 500, unit: 'each' },
  [WorkItemType.HVAC]: { cost: 8000, unit: 'total' },
  [WorkItemType.ELECTRICAL]: { cost: 15000, unit: 'total' },
  [WorkItemType.PLUMBING]: { cost: 12000, unit: 'total' },
  [WorkItemType.LANDSCAPING]: { cost: 5000, unit: 'total' }
};

export interface RehabItem {
  workType: WorkItemType;
  unitCost: number;
  quantity: number;
  unit: string;
  totalCost: number;
  notes?: string;
}

export interface RehabScope {
  propertyId: string;
  propertySize: number;
  items: RehabItem[];
  contingencyPercent: number;
  permitFees: number;
  totalCost: number;
  timeline: number; // in days
  projectedROI?: number;
}

// Contractor Types
export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: WorkItemType[];
  rating: number;
  availability: boolean;
  priceRange: 'low' | 'medium' | 'high';
  location: string;
  matchScore?: number;
  matchedSpecialties?: WorkItemType[];
  estimatedCost?: number;
}

// Fact Sheet Types
export interface Comp {
  address: string;
  soldPrice: number;
  soldDate: Date;
  squareFootage: number;
  beds: number;
  baths: number;
  distance: number; // miles
}

export interface FactSheet {
  propertyId: string;
  summary: {
    address: string;
    beds: number;
    baths: number;
    squareFootage: number;
    yearBuilt: number;
    propertyType: string;
  };
  financials: {
    listingPrice: number;
    estimatedARV: number;
    rehabCost: number;
    projectedROI: number;
  };
  comps: Comp[];
  lienStatus: string;
  infrastructureScore: number;
  highlights: string[];
  risks: string[];
  generatedAt: Date;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: 'search' | 'automate' | 'snapshot' | 'unclear';
  context?: any;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  documents: Document[];
  message: string;
}

export interface SearchResponse {
  results: any[];
  total: number;
  page: number;
  query: string;
}

export interface ChatResponse {
  conversationId: string;
  message: ChatMessage;
  suggestedActions?: string[];
}