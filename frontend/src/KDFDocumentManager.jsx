import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Eye, Calendar, Hash, Menu, X, Edit, Trash2, MoreVertical, ArrowLeft, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The initial set of documents, used only if localStorage is empty.
const initialMockDocuments = [];
const BACKEND_URL = 'http://localhost:5000';

// Accordion Component for displaying document sections
const Accordion = ({ sections }) => {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    if (!sections || sections.length === 0) {
        return <p className="text-gray-400 text-sm">No sections were identified in this document.</p>;
    }

    return (
        <div className="space-y-2">
            {sections.map((section, index) => (
                <div key={index} className="bg-zinc-800/50 rounded-lg">
                    <button
                        onClick={() => toggleAccordion(index)}
                        className="w-full flex justify-between items-center text-left p-4 font-medium text-white hover:bg-zinc-700/50 transition-colors"
                    >
                        <span>{section.title}</span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
                    </button>
                    {openIndex === index && (
                        <div className="p-4 border-t border-zinc-700">
                            <div className="prose prose-sm prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {section.summary}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


// DocumentView Component
const DocumentView = ({ document, onBack }) => {
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
      { sender: 'ai', text: 'Hello! Ask me anything about this document.' }
    ]);
    const [isAiThinking, setIsAiThinking] = useState(false);
  
    const handleSendMessage = async (e) => {
      e.preventDefault();
      if (chatInput.trim() === '' || !document.documentId) {
          if (!document.documentId) {
              setChatMessages(prev => [...prev, { sender: 'ai', text: "This document hasn't been processed by the AI engine yet. Please re-upload it to enable chat." }]);
          }
          return;
      }
  
      const newUserMessage = { sender: 'user', text: chatInput };
      setChatMessages(prev => [...prev, newUserMessage]);
      const question = chatInput;
      setChatInput('');
      setIsAiThinking(true);
  
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question,
            documentId: document.documentId
          }),
        });
  
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Failed to get a response from the AI.');
        }
  
        const data = await response.json();
        const aiResponse = { sender: 'ai', text: data.answer };
        setChatMessages(prev => [...prev, aiResponse]);
  
      } catch (error) {
        console.error("Chat error:", error);
        const errorResponse = { sender: 'ai', text: `Sorry, an error occurred: ${error.message}` };
        setChatMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsAiThinking(false);
      }
    };
  
    if (document?.error) {
      return (
        <div className="w-full max-w-4xl mx-auto text-center py-20">
          <h2 className="text-3xl font-bold text-red-500 mb-4">DOCUMENT NOT FOUND</h2>
          <p className="text-gray-400 mb-8">The document may have been moved or deleted.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Documents
          </button>
        </div>
      );
    }
    
    const documentUrl = document.filePath ? `${BACKEND_URL}${document.filePath}` : '';
  
    return (
      <div className="w-full max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Documents
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-grow lg:w-[65%]">
            <div className="bg-zinc-900 rounded-xl shadow-lg p-8 h-full">
              <h1 className="text-4xl font-bold text-white mb-6 pb-6 border-b border-zinc-700">{document.title}</h1>
              <iframe src={documentUrl} title={document.title} className="w-full h-[70vh] bg-white rounded-md border-0" />
            </div>
          </div>
          <div className="lg:w-[35%] flex flex-col">
            <div className="bg-zinc-900 rounded-xl shadow-lg h-full flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-zinc-700"><h2 className="text-xl font-bold text-white text-center">AI Assistant</h2></div>
              <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-gray-200'}`}>
                      <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown></div>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-zinc-700 text-gray-200 animate-pulse">Thinking...</div></div>
                )}
              </div>
              <div className="p-4 border-t border-zinc-700">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask a question..." className="flex-grow p-2 bg-zinc-800 text-white rounded-lg border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50" disabled={!chatInput.trim() || isAiThinking}>Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};


const KDFDocumentManager = () => {
  const [documents, setDocuments] = useState(() => {
    try { const savedDocs = localStorage.getItem('kdf_documents'); return savedDocs ? JSON.parse(savedDocs) : initialMockDocuments; } catch (error) { console.error("Could not parse documents from localStorage", error); return initialMockDocuments; }
  });

  useEffect(() => {
    try { localStorage.setItem('kdf_documents', JSON.stringify(documents)); } catch (error) { console.error("Could not save documents to localStorage", error); }
  }, [documents]);

  const [currentMode, setCurrentMode] = useState('learn');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, document: null });
  const [renameModal, setRenameModal] = useState({ show: false, document: null, newTitle: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, document: null });
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.startsWith('/documents/')) {
        const id = parseInt(path.split('/')[2]);
        if (!isNaN(id)) { const docToView = documents.find(doc => doc.id === id); setViewingDocument(docToView || { error: 'Not Found' }); }
      } else { setViewingDocument(null); }
    };
    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [documents]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = () => setUser({ name: 'Demo User' });
  const handleLogout = () => setUser(null);

  const handleDocumentQuickView = (document) => {
    setSelectedDocument(document);
    setDocuments(docs => docs.map(doc => doc.id === document.id ? { ...doc, lastOpened: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', "'") } : doc));
  };
  
  const navigateToDocumentPage = (document) => {
    const newPath = `/documents/${document.id}`;
    window.history.pushState({ path: newPath }, '', newPath);
    setViewingDocument(document);
  };

  const handleGoBackToList = () => {
    const newPath = '/';
    window.history.pushState({ path: newPath }, '', newPath);
    setViewingDocument(null);
  }

  const handleNewDocument = () => setShowUploadModal(true);
  
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setFileToUpload(null);
  }

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('document', file);
  
    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Upload and processing failed'); }
      const result = await response.json();
  
      const maxId = documents.reduce((max, doc) => doc.id > max ? doc.id : max, 0);

      const newDoc = {
        id: maxId + 1,
        title: file.name.replace(/\.[^/.]+$/, ""),
        lastOpened: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', "'"),
        added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', "'"),
        pages: 0,
        thumbnail: "https://via.placeholder.com/163x217/808080/ffffff?text=Processed",
        type: 'processed',
        filePath: result.filePath,
        documentId: result.documentId,
        summary: result.summary,
        sections: result.sections
      };
  
      setDocuments(docs => [newDoc, ...docs]);
      closeUploadModal();
  
    } catch (error) {
      console.error('Error during file upload and processing:', error);
      alert(`Error: Could not process the document. ${error.message}`);
    } finally {
        setIsUploading(false);
    }
  };

    // --- THIS IS THE FIX ---
    // This line is now BEFORE the return statement.
    const filteredDocuments = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen w-full bg-zinc-950 relative">
            <div className={`sticky top-0 z-50 transition-colors duration-300 ${isScrolled ? 'bg-zinc-950' : 'bg-transparent'}`}>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isScrolled || viewingDocument ? 'max-h-0' : 'max-h-40'}`}>
                    <div className="w-full h-14 sm:h-16 lg:h-20 px-4 sm:px-8 lg:px-[110px] pt-4 sm:pt-6 lg:pt-[37px] overflow-hidden">
                        <div className="w-full flex justify-between items-center">
                            <div className="flex items-center gap-4 sm:gap-6"><div className="text-white text-2xl sm:text-3xl font-normal font-['Bowlby_One']">KDF</div></div>
                            <div className="hidden lg:flex h-12 items-center gap-6">
                                <div className="flex items-center gap-9">
                                    <div className="flex items-center gap-9">
                                        <button className="text-white text-base font-normal font-['Roboto'] hover:text-indigo-300 transition-colors">preferences</button>
                                        <button className="text-white text-base font-normal font-['Roboto'] hover:text-indigo-300 transition-colors">about</button>
                                    </div>
                                    {user ? (<div className="flex items-center gap-4"><span className="text-white text-sm">{user.name}</span><button onClick={handleLogout} className="text-white text-base font-normal font-['Roboto'] hover:text-red-400 transition-colors">logout</button></div>) : (<><button onClick={handleLogin} className="text-white text-base font-normal font-['Roboto'] hover:text-indigo-300 transition-colors">login</button><button className="text-white text-base font-normal font-['Roboto'] hover:text-indigo-300 transition-colors">signup</button></>)}
                                </div>
                            </div>
                            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden text-white p-2">{showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
                        </div>
                    </div>
                </div>
                {!viewingDocument && (
                    <div className="border-b border-zinc-800/50">
                        <div className={`w-full flex justify-center py-4 px-4 ${!isScrolled && 'border-t border-zinc-800/50'}`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full max-w-md">
                                <div className="relative bg-neutral-800/80 backdrop-blur-sm rounded-full p-1.5 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.4)] border border-neutral-700/50">
                                    <div className="flex items-center relative">
                                        <div className={`absolute top-0 bottom-0 bg-indigo-600 rounded-full shadow-lg transition-all duration-300 ease-out ${currentMode === 'learn' ? 'left-0 w-[calc(50%-2px)]' : 'left-[calc(50%+2px)] w-[calc(50%-2px)]'}`}/>
                                        <button onClick={() => setCurrentMode('learn')} className={`relative z-10 px-6 sm:px-8 py-2.5 rounded-full font-medium transition-all duration-300 min-w-[80px] sm:min-w-[100px] ${currentMode === 'learn' ? 'text-white shadow-md' : 'text-gray-300 hover:text-white'}`}><div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span className="text-sm sm:text-base font-['Roboto']">Learn</span></div></button>
                                        <button onClick={() => setCurrentMode('analyse')} className={`relative z-10 px-6 sm:px-8 py-2.5 rounded-full font-medium transition-all duration-300 min-w-[80px] sm:min-w-[100px] ${currentMode === 'analyse' ? 'text-white shadow-md' : 'text-gray-300 hover:text-white'}`}><div className="flex items-center gap-2"><Eye className="w-4 h-4" /><span className="text-sm sm:text-base font-['Roboto']">Analyze</span></div></button>
                                    </div>
                                </div>
                                <div className="relative flex-1 max-w-xs">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="text" placeholder="Search documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/60 backdrop-blur-sm border border-neutral-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" />
                                        {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full px-4 sm:px-8 lg:px-[51px] pt-8 sm:pt-12">
                {viewingDocument ? (
                <DocumentView document={viewingDocument} onBack={handleGoBackToList} />
                ) : (
                <div className="w-full max-w-[1337px] mx-auto px-4 sm:px-8 lg:px-48 py-6 sm:py-8 lg:py-9 bg-zinc-900 rounded-[32px] sm:rounded-[42px] lg:rounded-[52px] shadow-[0px_-4px_13px_0px_rgba(46,46,46,0.44)] outline outline-1 outline-offset-[-0.50px] flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
                    <div className="w-full max-w-[989px] flex flex-col justify-start items-start gap-8 sm:gap-12 lg:gap-20">
                    <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-12 lg:gap-28">
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 lg:gap-16">
                            <button onClick={handleNewDocument} className="w-32 h-44 sm:w-36 sm:h-48 lg:w-40 lg:h-56 relative bg-neutral-700 rounded-lg sm:rounded-xl lg:rounded-xl shadow-[3px_4px_9px_2px_rgba(0,0,0,0.27)] outline outline-[2px] lg:outline-[3px] outline-offset-[-2px] lg:outline-offset-[-3px] outline-white overflow-hidden hover:outline-indigo-300 transition-all group">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 overflow-hidden"><Plus className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white group-hover:text-indigo-300 transition-colors" /></div>
                            </button>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="text-white text-xl sm:text-2xl font-bold font-serif mb-2">New Document</div>
                                <div className="flex flex-col gap-1 text-sm sm:text-base"><div className="text-white font-normal font-serif">Click to upload</div><div className="text-white font-normal font-serif">PDF, DOC, TXT</div><div className="text-white font-normal font-serif">Max: 10MB</div></div>
                            </div>
                        </div>
                        {filteredDocuments.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 lg:gap-16">
                            <div onClick={() => navigateToDocumentPage(filteredDocuments[0])} onContextMenu={(e) => handleRightClick(e, filteredDocuments[0])} className="relative group cursor-pointer">
                            <img className="w-32 h-44 sm:w-36 sm:h-48 lg:w-40 lg:h-56 relative rounded-lg sm:rounded-xl lg:rounded-xl shadow-[3px_4px_9px_2px_rgba(0,0,0,0.44)] group-hover:shadow-[3px_4px_9px_2px_rgba(99,102,241,0.44)] transition-all" src={filteredDocuments[0].thumbnail} alt={filteredDocuments[0].title} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className='absolute inset-0 bg-black/50 rounded-lg sm:rounded-xl lg:rounded-xl'></div>
                                <button onClick={(e) => { e.stopPropagation(); handleDocumentQuickView(filteredDocuments[0]); }} className="relative w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors pointer-events-auto" title={'Quick View'}><Eye className="w-8 h-8 text-white" /></button>
                            </div>
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                            <div className="text-white text-xl sm:text-2xl font-bold font-serif mb-2 truncate">{filteredDocuments[0].title}</div>
                            <div className="flex flex-col gap-1 text-sm sm:text-base">
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Last Opened: {filteredDocuments[0].lastOpened}</span></div>
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Plus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Added: {filteredDocuments[0].added}</span></div>
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Hash className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Pages: {filteredDocuments[0].pages}</span></div>
                            </div>
                            </div>
                        </div>
                        )}
                    </div>
                    {filteredDocuments.length > 1 && (
                        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-12 lg:gap-28">
                        {filteredDocuments.slice(1).map((doc) => (
                            <div key={doc.id} className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 lg:gap-16">
                            <div onClick={() => navigateToDocumentPage(doc)} onContextMenu={(e) => handleRightClick(e, doc)} className="relative group cursor-pointer">
                                <img className="w-32 h-44 sm:w-36 sm:h-48 lg:w-40 lg:h-56 relative rounded-lg sm:rounded-xl lg:rounded-xl shadow-[3px_4px_9px_2px_rgba(0,0,0,0.44)] group-hover:shadow-[3px_4px_9px_2px_rgba(99,102,241,0.44)] transition-all" src={doc.thumbnail} alt={doc.title} />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className='absolute inset-0 bg-black/50 rounded-lg sm:rounded-xl lg:rounded-xl'></div>
                                <button onClick={(e) => { e.stopPropagation(); handleDocumentQuickView(doc); }} className="relative w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors pointer-events-auto" title={'Quick View'}><Eye className="w-8 h-8 text-white" /></button>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                <div className="text-white text-xl sm:text-2xl font-bold font-serif mb-2 truncate">{doc.title}</div>
                                <div className="flex flex-col gap-1 text-sm sm:text-base">
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Last Opened: {doc.lastOpened}</span></div>
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Plus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Added: {doc.added}</span></div>
                                <div className="text-white font-normal font-serif flex items-center justify-center sm:justify-start gap-2"><Hash className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /><span className="truncate">Pages: {doc.pages}</span></div>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                    </div>
                </div>
                )}
            </div>
            
            {showUploadModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> <div className="bg-zinc-900 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 max-w-md w-full"> <h3 className="text-white text-xl sm:text-2xl font-bold mb-4">Process New Document</h3> <input type="file" accept=".pdf" onChange={(e) => setFileToUpload(e.target.files[0])} disabled={isUploading} className="w-full p-3 bg-zinc-800 text-white rounded-lg mb-4 text-sm sm:text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"/> {fileToUpload && <p className='text-sm text-gray-400 my-4'>Selected: {fileToUpload.name}</p>} {isUploading && <p className='text-sm text-indigo-400 my-4 animate-pulse'>Processing document... This may take a moment.</p>} <div className="flex gap-4 mt-4"> <button onClick={closeUploadModal} disabled={isUploading} className="flex-1 py-2 px-4 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm sm:text-base disabled:opacity-50">Cancel</button> <button onClick={() => handleFileUpload(fileToUpload)} disabled={!fileToUpload || isUploading} className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed">{isUploading ? 'Processing...' : 'Upload & Process'}</button> </div> </div> </div> )}
            {selectedDocument && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> <div className="bg-zinc-900 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"> <div className="flex justify-between items-start mb-6"> <h3 className="text-white text-xl sm:text-2xl font-bold pr-4 truncate">{selectedDocument.title}</h3> <button onClick={() => setSelectedDocument(null)} className="text-white hover:text-gray-400 text-2xl flex-shrink-0"> × </button> </div> <div className="text-white space-y-4 text-sm sm:text-base"> <div className="flex items-center gap-2"><FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /><span>Document Type: {selectedDocument.type}</span></div> <div className="flex items-center gap-2"><Hash className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /><span>Pages: {selectedDocument.pages}</span></div> <div className="flex items-center gap-2"><Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /><span>Last Opened: {selectedDocument.lastOpened}</span></div> <div className="flex items-center gap-2"><Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /><span>Added: {selectedDocument.added}</span></div> {selectedDocument.summary && ( <div className="mt-6 pt-4 border-t border-zinc-700"> <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-indigo-400"><FileText className="w-5 h-5"/>AI-Generated Summary</h4> <div className="prose prose-sm prose-invert max-w-none bg-zinc-800/50 p-4 rounded-lg"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDocument.summary}</ReactMarkdown></div> </div> )} {selectedDocument.sections && selectedDocument.sections.length > 0 && ( <div className="mt-6 pt-4 border-t border-zinc-700"> <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-indigo-400"><Menu className="w-5 h-5"/>Section Breakdown</h4> <Accordion sections={selectedDocument.sections} /> </div> )} </div> </div> </div> )}
        </div>
    );
};

export default KDFDocumentManager;