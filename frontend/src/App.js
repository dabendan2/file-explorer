import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Image as ImageIcon } from 'lucide-react';

const App = () => {
  // Use environment variable for version matching
  const gitSha = process.env.REACT_APP_GIT_SHA || 'unknown';
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(() => {
    return localStorage.getItem('explorer-path') || '';
  });
  const [loading, setLoading] = useState(true);
  const [fileContent, setFileContent] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'viewer'
  const [selectedFile, setSelectedFile] = useState(null);

  const formatSize = (bytes) => {
    if (bytes === 0 || bytes === '-') return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchFiles = (path = '') => {
    setLoading(true);
    setViewMode('list');
    setFileContent(null);
    setSelectedFile(null);
    
    const url = path ? `/explorer/api/files?path=${encodeURIComponent(path)}` : '/explorer/api/files';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then(data => {
        if (data.error) {
          console.error('API Error:', data.error);
          setLoading(false);
          return;
        }
        setFiles(data);
        setCurrentPath(path);
        localStorage.setItem('explorer-path', path);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch files:', err);
        setLoading(false);
      });
  };

  const fetchFileContent = (file) => {
    setLoading(true);
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
    
    if (isImage) {
      setFileContent(`/explorer/api/content?path=${encodeURIComponent(path)}`);
      setSelectedFile(file);
      setViewMode('viewer');
      setLoading(false);
    } else {
      fetch(`/explorer/api/content?path=${encodeURIComponent(path)}`)
        .then(res => {
          if (!res.ok) throw new Error('API content request failed');
          return res.text();
        })
        .then(text => {
          setFileContent(text);
          setSelectedFile(file);
          setViewMode('viewer');
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch content:', err);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    // 1. Version Check - Must be first and MUST throw on mismatch
    fetch('/explorer/api/version')
      .then(res => {
        if (!res.ok) throw new Error('Version check failed');
        return res.json();
      })
      .then(data => {
        const backendSha = data.gitSha;
        if (backendSha !== gitSha && gitSha !== 'unknown') {
          // Rule: Version mismatch must directly throw Error without try-catch
          throw new Error(`Git SHA mismatch: FE(${gitSha}) vs BE(${backendSha})`);
        }
        // If version matches, then fetch data
        fetchFiles(currentPath);
      })
      .catch(err => {
        // If it's a version error, re-throw it to break the app as requested
        if (err.message.includes('Git SHA mismatch')) {
          throw err;
        }
        console.error('Initialization error:', err);
        setLoading(false);
      });
  }, []);

  const navigateTo = (index) => {
    const segments = currentPath.split('/');
    const newPath = segments.slice(0, index + 1).join('/');
    fetchFiles(newPath);
  };

  const pathSegments = currentPath ? currentPath.split('/') : [];

  const getIconColor = (index) => {
    const colors = ['text-blue-400', 'text-red-400', 'text-yellow-400', 'text-green-400'];
    return colors[index % colors.length];
  };

  const isImageFile = selectedFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name);

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-gray-800 font-sans selection:bg-pink-100 antialiased">
      {/* 頂部路徑列 (Path Bar Component) - Google Style + 溫馨圓潤 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-orange-100 px-2 py-1.5 shadow-sm">
        <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth">
          <button 
            onClick={() => fetchFiles('')}
            className="text-blue-500 font-bold text-base whitespace-nowrap px-2 py-1 rounded-xl hover:bg-blue-50 active:scale-95 transition-all"
          >
            🏠 Home
          </button>
          {pathSegments.map((segment, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={14} className="text-orange-200 shrink-0 mx-0.5" />
              <button
                onClick={() => navigateTo(i)}
                className="text-blue-500 font-medium text-base whitespace-nowrap px-2 py-1 rounded-xl hover:bg-blue-50 active:scale-95 transition-all"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-2 max-w-2xl mx-auto">
        {viewMode === 'viewer' ? (
          /* 內容檢視器 (File Viewer) - 溫馨舒適切換 */
          <div className="bg-white rounded-[1.5rem] p-2 border border-orange-50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="font-bold text-gray-700 truncate mr-2 text-base">📄 {selectedFile?.name}</h3>
              <button 
                onClick={() => setViewMode('list')}
                className="bg-orange-100 text-orange-600 text-base font-bold px-3 py-1 rounded-full active:scale-90 transition-transform"
              >
                返回
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-140px)] rounded-xl bg-orange-50/30">
              {isImageFile ? (
                <img src={fileContent} alt={selectedFile.name} className="max-w-full h-auto rounded-lg mx-auto shadow-inner" />
              ) : (
                <pre className="text-base font-mono text-gray-700 whitespace-pre-wrap leading-relaxed p-2">
                  {fileContent}
                </pre>
              )}
            </div>
          </div>
        ) : (
          /* 下方列表 (File List Component) - 極簡可愛溫馨 */
          <div className="space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-400 rounded-full animate-spin"></div>
                <p className="text-orange-300 font-medium text-base">正在準備您的檔案...</p>
              </div>
            ) : (
              files.map((file, i) => (
                <div 
                  key={i} 
                  className="group flex items-center p-1.5 bg-white/40 hover:bg-white active:bg-orange-50 rounded-[1rem] transition-all cursor-pointer border border-transparent hover:border-orange-50 active:shadow-inner"
                  onClick={() => file.type === 'folder' ? fetchFiles(currentPath ? `${currentPath}/${file.name}` : file.name) : fetchFileContent(file)}
                >
                  <div className={`w-11 h-11 rounded-2xl mr-3 flex items-center justify-center shrink-0 ${file.type === 'folder' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                    {file.type === 'folder' ? 
                      <Folder size={22} className={getIconColor(i)} /> : 
                      (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? 
                        <ImageIcon size={22} className="text-blue-400" /> : 
                        <File size={22} className="text-gray-400" />
                      )
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-gray-700 truncate leading-tight">{file.name}</div>
                    <div className="text-xs text-gray-400 font-medium flex gap-2 mt-0.5">
                      <span>{file.type === 'folder' ? '資料夾' : formatSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.modified}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Aesthetic Decoration */}
      <div className="fixed -bottom-6 -left-6 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="fixed -top-6 -right-6 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    </div>
  );
};

export default App;
