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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-2 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center overflow-x-auto no-scrollbar flex-1 mr-2">
          <button 
            onClick={() => fetchFiles('')}
            className="flex items-center text-[#1a73e8] hover:bg-blue-50 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            <span className="text-2xl font-semibold mr-1">Drive</span>
          </button>
          {pathSegments.map((segment, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={20} className="text-gray-400 shrink-0 mx-1" />
              <button
                onClick={() => fetchFiles(pathSegments.slice(0, i + 1).join('/'))}
                className="text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors text-lg font-medium whitespace-nowrap"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="text-base text-gray-400 font-mono shrink-0 px-2 select-none border-l border-gray-100">
          {gitSha}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto p-0">
        {viewMode === 'viewer' ? (
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center px-2 py-2 border-b border-gray-100 bg-gray-50">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors mr-2">
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-medium truncate">{selectedFile?.name}</h2>
            </div>
            <div className="p-2 bg-white">
              {selectedFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name) ? (
                <img src={fileContent} alt="" className="max-w-full h-auto mx-auto shadow-md rounded-sm" />
              ) : (
                <pre className="text-base font-mono bg-gray-50 p-2 rounded-lg overflow-x-auto leading-relaxed border border-gray-200">
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
                  className="flex items-center px-2 py-2 hover:bg-gray-50 active:bg-blue-50 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 flex items-center justify-center mr-4">
                    {file.type === 'folder' ? (
                      <Folder size={24} className="text-gray-500 fill-gray-500" />
                    ) : (
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? 
                        <ImageIcon size={24} className="text-blue-500" /> : 
                        <File size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-base text-gray-900 font-normal truncate block">{file.name}</span>
                  </div>
                  {file.type === 'file' && (
                    <div className="text-base text-gray-500 font-normal ml-4 shrink-0">
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
