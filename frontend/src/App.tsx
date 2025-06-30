// frontend/src/App.tsx - UPDATED WITH REAL API INTEGRATION

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { DocumentTable } from './components/Search/DocumentTable';
import { RenovationROI } from './components/Automate/RenovationROI';
import { GCMatch } from './components/Automate/GCMatch';
import { FactSheet } from './components/Snapshot/FactSheet';
import { ChatInterface } from './components/Copilot/ChatInterface';
import { FileUpload } from './components/Common/FileUpload';
import { LapisUsage } from '../../shared/types';
import { Bot, X, AlertCircle } from 'lucide-react';
import apiService from './services/api'; // REAL API SERVICE

function App() {
  const [activeTask, setActiveTask] = useState<'search' | 'automate' | 'snapshot'>('search');
  const [activeAutomateTab, setActiveAutomateTab] = useState<'roi' | 'gc'>('roi');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [rehabScope, setRehabScope] = useState<any>(null);
  const [lapisUsage, setLapisUsage] = useState<LapisUsage>({
    search: 0,
    automate: 0,
    snapshot: 0,
    remaining: 210,
    total: 210
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationId = 'conv-' + Date.now();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load Lapis usage
      const usage = await apiService.getLapisUsage();
      setLapisUsage(usage);
      
      // Load existing documents
      const documentsResponse = await apiService.getDocumentFields();
      if (documentsResponse.success && documentsResponse.data) {
        setDocuments(documentsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

   // in App.tsx
const handleRunAutomation = async (ids: string[]) => {
  try {
    setLoading(true);
    setError(null);

    // POST to /api/automate/renovation-roi with real IDs
    const result = await apiService.runAutomation(ids);
    console.log('Automation result:', result);

    // Update your Lapis usage, UI, etc. as needed
  } catch (err) {
    console.error('Failed to run automation', err);
    setError('Failed to run automation');
  } finally {
    setLoading(false);
  }
};


// frontend/src/App.tsx

const handleUpload = async (files: File[]) => {
  try {
    setLoading(true);
    setError(null);

    // Upload files to backend
    const result = await apiService.uploadDocuments(files);

    if (result.documents) {
      // Normalize so each doc has an `.id`, plus top-level props
      const normalized = result.documents.map(d => ({
        id: d.id,
        filename: d.filename,
        type: d.type,
        status: d.status,
        uploadedAt: d.uploadedAt,
        // spread your extracted fields into top-level props:
        ...d.extractedFields
      }));

      // Merge into state
      setDocuments(prev => [...prev, ...normalized]);

      // Update Lapis usage (files.length * 2 for search)
      const newUsage = { ...lapisUsage };
      newUsage.search += files.length * 2;
      newUsage.remaining -= files.length * 2;
      setLapisUsage(newUsage);

      console.log(`Successfully uploaded ${files.length} files`);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    setError('Failed to upload documents. Please try again.');
  } finally {
    setLoading(false);
  }
};



  const handleDocumentSelect = (docIds: string[]) => {
    const selected = documents.filter(doc => docIds.includes(doc.id));
    setSelectedDocuments(selected);
  };

  const handleFieldUpdate = async (documentId: string, field: string, value: any) => {
    try {
      await apiService.updateField(documentId, field, value);
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, [field]: value }
            : doc
        )
      );
    } catch (error) {
      console.error('Failed to update field:', error);
      setError('Failed to update field');
    }
  };

  const handleGenerateReport = async (scope: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const documentIds = selectedDocuments.map(doc => doc.id);
      const result = await apiService.generateRenovationROI(
        documentIds,
        scope.targetROI || 15,
        scope.budgetCap || 100000
      );
      
      setRehabScope(result.rehabScope);
      
      // Update Lapis usage
      const newUsage = { ...lapisUsage };
      newUsage.automate += 8;
      newUsage.remaining -= 8;
      setLapisUsage(newUsage);
      
      console.log('Renovation ROI report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Failed to generate renovation ROI report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFactSheet = async (factSheet: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const documentIds = selectedDocuments.map(doc => doc.id);
      const result = await apiService.generateFactSheet(documentIds, rehabScope?.id);
      
      // Update Lapis usage
      const newUsage = { ...lapisUsage };
      newUsage.snapshot += 1;
      newUsage.remaining -= 1;
      setLapisUsage(newUsage);
      
      console.log('Fact sheet generated successfully');
      
      // Optionally download the PDF
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to generate fact sheet:', error);
      setError('Failed to generate fact sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (message: string) => {
    try {
      const response = await apiService.sendChatMessage(conversationId, message);
      return response;
    } catch (error) {
      console.error('Chat message failed:', error);
      throw error;
    }
  };

  const handleSendRFPs = async (contractors: any[], startDate: string, zipCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!rehabScope?.id) {
        setError('Please generate a rehab scope first');
        return;
      }
      
      const result = await apiService.executeGCMatch(
        rehabScope.id,
        startDate,
        zipCode
      );
      
      console.log(`RFPs sent to ${contractors.length} contractors`);
      console.log('GC Match results:', result);
    } catch (error) {
      console.error('Failed to send RFPs:', error);
      setError('Failed to send RFPs to contractors');
    } finally {
      setLoading(false);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TriPilot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        activeTask={activeTask}
        onTaskChange={setActiveTask}
        lapisUsage={lapisUsage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {activeTask === 'search' && 'Search & Explore Documents'}
              {activeTask === 'automate' && 'Automate Analysis'}
              {activeTask === 'snapshot' && 'Generate Snapshots'}
            </h1>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                TRIAL • {lapisUsage.remaining} Lapis
              </span>
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {activeTask === 'search' && (
              <>
                {documents.length === 0 ? (
                  <div className="max-w-2xl mx-auto">
                    <FileUpload onUpload={handleUpload} />
                  </div>
                ) : (
                         <DocumentTable
                            documents={documents}
                            onFieldUpdate={handleFieldUpdate}
                            onDocumentSelect={handleDocumentSelect}
                            onRunAutomation={handleRunAutomation}
                          />

                )}
              </>
            )}

            {activeTask === 'automate' && (
              <>
                {/* Automate Tabs */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setActiveAutomateTab('roi')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      activeAutomateTab === 'roi'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Renovation ROI
                  </button>
                  <button
                    onClick={() => setActiveAutomateTab('gc')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      activeAutomateTab === 'gc'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    GC-Match
                  </button>
                </div>

                {activeAutomateTab === 'roi' ? (
                  <RenovationROI
                    selectedDocuments={selectedDocuments}
                    onGenerateReport={handleGenerateReport}
                  />
                ) : (
                  <GCMatch
                    rehabScope={rehabScope}
                    onSendRFPs={handleSendRFPs}
                  />
                )}
              </>
            )}

            {activeTask === 'snapshot' && (
              <FactSheet
                selectedDocuments={selectedDocuments}
                rehabScope={rehabScope}
                onGenerateFactSheet={handleGenerateFactSheet}
              />
            )}
          </div>
        </div>

        {/* Copilot Chat Sidebar */}
        <div className={`transition-all duration-300 ${
          isChatExpanded ? 'w-96' : 'w-0'
        } bg-white shadow-lg overflow-hidden flex flex-col`}>
          <ChatInterface
            conversationId={conversationId}
            onSendMessage={handleSendChat}
            isExpanded={isChatExpanded}
          />
        </div>
      </div>

      {/* Floating Copilot Button */}
      <button
        onClick={() => setIsChatExpanded(!isChatExpanded)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isChatExpanded 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-blue-600 hover:bg-blue-700 animate-pulse'
        }`}
      >
        {isChatExpanded ? (
          <X className="text-white" size={24} />
        ) : (
          <Bot className="text-white" size={24} />
        )}
      </button>
    </div>
  );
}

export default App;