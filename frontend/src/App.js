import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Image as ImageIcon, ArrowLeft } from 'lucide-react';

const App = () => {
  const gitSha = process.env.REACT_APP_GIT_SHA || 'unknown';
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(() => localStorage.getItem('explorer-path') || '');
  const [loading, setLoading] = useState(true);
  const [fileContent, setFileContent] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedFile, setSelectedFile] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes || bytes === '-') return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchFiles = (path = '') => {
    setLoading(true);
    setViewMode('list');
    const url = path ? `/explorer/api/files?path=${encodeURIComponent(path)}` : '/explorer/api/files';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setCurrentPath(path);
        localStorage.setItem('explorer-path', path);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchFileContent = (file) => {
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
    setSelectedFile(file);
    if (isImg) {
      setFileContent(`/explorer/api/content?path=${encodeURIComponent(path)}`);
      setViewMode('viewer');
    } else {
      fetch(`/explorer/api/content?path=${encodeURIComponent(path)}`)
        .then(res => res.text())
        .then(text => {
          setFileContent(text);
          setViewMode('viewer');
        });
    }
  };

  useEffect(() => {
    fetch('/explorer/api/version')
      .then(res => res.json())
      .then(data => {
        if (data.gitSha !== gitSha && gitSha !== 'unknown') {
          throw new Error(`Git SHA mismatch: FE(${gitSha}) vs BE(${data.gitSha})`);
        }
        fetchFiles(currentPath);
      });
  }, []);

  const pathSegments = currentPath ? currentPath.split('/') : [];

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#3C4043] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-orange-100 shadow-sm">
        {/* Title Line */}
        <div className="flex items-center justify-between px-3 h-12">
          <button 
            onClick={() => fetchFiles('')}
            className="text-[#1a73e8] hover:bg-blue-50 px-2 py-1 rounded-xl transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="text-3xl font-black tracking-tight drop-shadow-sm">Explorer</span>
          </button>
        </div>
        
        {/* Path Bar */}
        <div className="flex items-center px-3 h-9 bg-orange-50/30 overflow-x-auto no-scrollbar scroll-smooth border-t border-orange-50/50">
          <div className="flex items-center min-w-max">
            <button 
              onClick={() => fetchFiles('')}
              className="text-orange-400 hover:text-orange-600 text-lg font-medium px-2 py-0.5 rounded-lg transition-colors"
            >
              Home
            </button>
            {pathSegments.map((segment, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={20} className="text-orange-200 shrink-0 mx-0.5" />
                <button
                  onClick={() => fetchFiles(pathSegments.slice(0, i + 1).join('/'))}
                  className="text-orange-500 hover:text-orange-700 text-lg font-bold px-2 py-0.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {segment}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto">
        {viewMode === 'viewer' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center px-3 py-2 border-b border-orange-100 bg-orange-50/20">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-orange-100 text-orange-600 rounded-full transition-colors mr-2">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold truncate text-gray-700">{selectedFile?.name}</h2>
            </div>
            <div className="p-3">
              {selectedFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name) ? (
                <div className="bg-white p-2 rounded-2xl shadow-inner border border-orange-50">
                  <img src={fileContent} alt="" className="max-w-full h-auto mx-auto rounded-xl" />
                </div>
              ) : (
                <pre className="text-lg font-mono bg-[#FFFBF7] p-4 rounded-2xl overflow-x-auto leading-relaxed border border-orange-100 text-gray-800 shadow-sm">
                  {fileContent}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-orange-50/50 bg-white shadow-sm mx-2 my-2 rounded-2xl overflow-hidden border border-orange-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-400 rounded-full animate-spin"></div>
                <p className="text-orange-300 font-medium">載入中...</p>
              </div>
            ) : (
              files.map((file, i) => (
                <div 
                  key={i} 
                  onClick={() => file.type === 'folder' ? fetchFiles(currentPath ? `${currentPath}/${file.name}` : file.name) : fetchFileContent(file)}
                  className="flex items-center px-3 py-1 hover:bg-orange-50/30 active:bg-orange-100/50 transition-colors cursor-pointer group"
                >
                  <div className={`w-9 h-9 flex items-center justify-center mr-3 rounded-xl ${file.type === 'folder' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {file.type === 'folder' ? (
                      <Folder size={20} className="text-amber-500 fill-amber-200" />
                    ) : (
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? 
                        <ImageIcon size={20} className="text-blue-500" /> : 
                        <File size={20} className="text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-lg text-gray-800 font-semibold truncate block leading-tight">{file.name}</span>
                  </div>
                  {file.type === 'file' && (
                    <div className="text-lg text-orange-300 font-medium ml-4 shrink-0 font-mono">
                      {formatSize(file.size)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed -bottom-10 -right-10 w-64 h-64 bg-orange-100/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed -top-10 -left-10 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
    </div>
  );
};

export default App;
