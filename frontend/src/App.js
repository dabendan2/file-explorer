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
    <div className="min-h-screen bg-white text-[#202124] font-sans antialiased">
      {/* Google Style Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        {/* 第一行：標題 */}
        <div className="flex items-center justify-between px-2 h-10">
          <button 
            onClick={() => fetchFiles('')}
            className="text-[#1a73e8] hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="text-3xl font-black tracking-tight">Explorer</span>
          </button>
        </div>
        
        {/* 第二行：Path Bar */}
        <div className="flex items-center px-2 h-8 bg-gray-50/50 overflow-x-auto no-scrollbar scroll-smooth border-t border-gray-50">
          <div className="flex items-center min-w-max">
            <button 
              onClick={() => fetchFiles('')}
              className="text-gray-500 hover:text-[#1a73e8] text-lg font-medium px-1.5 py-0.5 rounded-md transition-colors"
            >
              Home
            </button>
            {pathSegments.map((segment, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={18} className="text-gray-300 shrink-0 mx-0.5" />
                <button
                  onClick={() => fetchFiles(pathSegments.slice(0, i + 1).join('/'))}
                  className="text-gray-600 hover:text-[#1a73e8] text-lg font-bold px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap"
                >
                  {segment}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto p-0">
        {viewMode === 'viewer' ? (
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center px-2 py-2 border-b border-gray-100 bg-gray-50">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors mr-2">
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <h2 className="text-xl font-medium truncate">{selectedFile?.name}</h2>
            </div>
            <div className="p-2 bg-white">
              {selectedFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name) ? (
                <img src={fileContent} alt="" className="max-w-full h-auto mx-auto shadow-md rounded-sm" />
              ) : (
                <pre className="text-lg font-mono bg-gray-50 p-2 rounded-lg overflow-x-auto leading-relaxed border border-gray-200">
                  {fileContent}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              files.map((file, i) => (
                <div 
                  key={i} 
                  onClick={() => file.type === 'folder' ? fetchFiles(currentPath ? `${currentPath}/${file.name}` : file.name) : fetchFileContent(file)}
                  className="flex items-center px-2 py-0.5 hover:bg-gray-50 active:bg-blue-50 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 flex items-center justify-center mr-3">
                    {file.type === 'folder' ? (
                      <Folder size={20} className="text-gray-500 fill-gray-500" />
                    ) : (
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? 
                        <ImageIcon size={20} className="text-blue-500" /> : 
                        <File size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-lg text-gray-900 font-normal truncate block leading-none">{file.name}</span>
                  </div>
                  {file.type === 'file' && (
                    <div className="text-lg text-gray-500 font-normal ml-4 shrink-0 leading-none">
                      {formatSize(file.size)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
