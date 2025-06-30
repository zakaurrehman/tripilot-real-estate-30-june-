// frontend/src/services/api.ts - UPDATED VERSION

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Document,
  RehabScope,
  Contractor,
  FactSheet,
  ChatMessage,
  ApiResponse,
  UploadResponse,
  SearchResponse,
  ChatResponse,
  LapisUsage
} from '../../../shared/types';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      // FIXED: Base URL points to backend with /api prefix
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // Add timeout
    });

    // Load token from localStorage on init
    this.token = localStorage.getItem('authToken');

    // Attach auth token if present
    this.api.interceptors.request.use(
      config => {
        if (this.token) {
          config.headers!['Authorization'] = `Bearer ${this.token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Global response handler
    this.api.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          // Don't redirect in development
          if (process.env.NODE_ENV === 'production') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // --------------------
  // Authentication
  // --------------------
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // --------------------
  // Search Endpoints
  // --------------------
  async uploadDocuments(files: File[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await this.api.post<UploadResponse>(
      '/search/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }

  async searchDocuments(query: string, filters?: any): Promise<SearchResponse> {
    const response = await this.api.post<SearchResponse>(
      '/search/query',
      { query, filters }
    );
    return response.data;
  }

async getDocumentFields(documentIds?: string[]): Promise<any> {
  const params = documentIds ? { documentIds: documentIds.join(',') } : {};
  const response = await this.api.get('/search/documents', { params });
  // currently returns { success, documents, columns, total }
  // so unwrap `documents`:
  return {
    rows: response.data.documents,  // ← pull out documents
    columns: response.data.columns,
    total: response.data.total
  };
}

  async updateField(
    documentId: string,
    field: string,
    value: any
  ): Promise<ApiResponse<void>> {
    const response = await this.api.put<ApiResponse<void>>(
      `/search/document/${documentId}/field`,
      { field, value }
    );
    return response.data;
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete<ApiResponse<void>>(
      `/search/document/${documentId}`
    );
    return response.data;
  }

  async exportTable(
    format: string,
    documentIds?: string[]
  ): Promise<Blob> {
    const params = {
      format,
      ...(documentIds && { documentIds: documentIds.join(',') })
    };
    const response = await this.api.get<Blob>(
      '/search/export',
      { params, responseType: 'blob' }
    );
    return response.data;
  }

  // --------------------
  // Automate Endpoints
  // --------------------
  async generateRenovationROI(
    documentIds: string[],
    targetROI: number = 15,
    budgetCap: number = 100000
  ): Promise<{ rehabScope: RehabScope; roi: number; downloadUrl: string }> {
    const response = await this.api.post(
      '/automate/renovation-roi',
      { documentIds, targetROI, budgetCap }
    );
    return response.data;
  }

  async executeGCMatch(
    scopeId: string,
    startDate: string,
    zipCode: string
  ): Promise<{ matchedContractors: Contractor[]; rfpResults: any[] }> {
    const response = await this.api.post(
      '/automate/gc-match',
      { scopeId, startDate, zipCode }
    );
    return response.data;
  }

  async downloadReport(filename: string): Promise<Blob> {
    const response = await this.api.get<Blob>(
      `/automate/download/${filename}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  async getRehabHistory(propertyId?: string): Promise<ApiResponse<any>> {
    const params = propertyId ? { propertyId } : {};
    const response = await this.api.get<ApiResponse<any>>(
      '/automate/history',
      { params }
    );
    return response.data;
  }

  // --------------------
  // Snapshot Endpoints
  // --------------------
  async generateFactSheet(
    documentIds: string[],
    rehabScopeId?: string
  ): Promise<{ factSheet: FactSheet; downloadUrl: string }> {
    const response = await this.api.post(
      '/snapshot/fact-sheet',
      { documentIds, rehabScopeId }
    );
    return response.data;
  }

  async quickSnapshot(address: string): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>(
      '/snapshot/quick',
      { address }
    );
    return response.data;
  }

  async getFactSheetHistory(propertyId?: string): Promise<ApiResponse<any>> {
    const params = propertyId ? { propertyId } : {};
    const response = await this.api.get<ApiResponse<any>>(
      '/snapshot/history',
      { params }
    );
    return response.data;
  }

  // --------------------
  // Chat Endpoints
  // --------------------
  async sendChatMessage(
    conversationId: string,
    message: string
  ): Promise<ChatResponse> {
    const response = await this.api.post<ChatResponse>(
      '/chat/message',
      { conversationId, message }
    );
    return response.data;
  }

  async getConversationHistory(conversationId: string): Promise<ApiResponse<any>> {
    const response = await this.api.get<ApiResponse<any>>(
      `/chat/conversation/${conversationId}`
    );
    return response.data;
  }

  async getSimilarQuestions(query: string): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>(
      '/chat/similar-questions',
      { query }
    );
    return response.data;
  }

  async clearConversation(conversationId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete<ApiResponse<void>>(
      `/chat/conversation/${conversationId}`
    );
    return response.data;
  }

  // --------------------
  // User Endpoints (MISSING - NEED TO ADD TO BACKEND)
  // --------------------
  async getLapisUsage(): Promise<LapisUsage> {
    const response = await this.api.get<LapisUsage>(
      '/user/lapis-usage'
    );
    return response.data;
  }

    async runAutomation(documentIds: string[]) {
    const { data } = await this.api.post('/automate/renovation-roi', { documentIds });
    return data;
  }
  async topUpLapis(amount: number): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>(
      '/user/top-up',
      { amount }
    );
    return response.data;
  }

  async upgradeSubscription(plan: string): Promise<ApiResponse<any>> {
    const response = await this.api.post<ApiResponse<any>>(
      '/user/upgrade',
      { plan }
    );
    return response.data;
  }

  // --------------------
  // Utility
  // --------------------
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.api.get<{ status: string }>('/health');
    return response.data;
  }

  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new ApiService();