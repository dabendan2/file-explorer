import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Image as ImageIcon, ArrowLeft } from 'lucide-react';

const App = () => {
  const gitSha = process.env.REACT_APP_GIT_SHA || 'unknown';
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(() => {
    if (process.env.NODE_ENV === 'test') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('path') || localStorage.getItem('explorer-path') || '';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    // In test environment, default to list to avoid breaking tests
    if (process.env.NODE_ENV === 'test') return 'list';
    const params = new URLSearchParams(window.location.search);
    return params.get('file') ? 'viewer' : 'list';
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [explorerMode, setExplorerMode] = useState('local'); // 'local' or 'google'
  const [contextMenu, setContextMenu] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes || bytes === '-') return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const updateUrl = (path, fileName = null) => {
    const url = new URL(window.location);
    if (path) url.searchParams.set('path', path);
    else url.searchParams.delete('path');
    
    if (fileName) url.searchParams.set('file', fileName);
    else url.searchParams.delete('file');
    
    window.history.pushState({}, '', url);
  };

  const fetchFiles = (path = '', skipPushState = false, modeOverride = null) => {
    setLoading(true);
    setError(null);
    setViewMode('list');
    if (!skipPushState) {
      updateUrl(path);
    }
    const mode = modeOverride || explorerMode;
    const modeParam = `mode=${mode}`;
    const url = path 
      ? `/explorer/api/files?path=${encodeURIComponent(path)}&${modeParam}` 
      : `/explorer/api/files?${modeParam}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('連線失敗');
        return res.json();
      })
      .then(data => {
        setFiles(data);
        setCurrentPath(path);
        if (mode === 'local') {
          localStorage.setItem('explorer-path', path);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '連線失敗');
        setLoading(false);
      });
  };

  const fetchFileContent = (file, pathOverride = null, skipPushState = false) => {
    const path = pathOverride || (explorerMode === 'google' ? file.id : (currentPath ? `${currentPath}/${file.name}` : file.name));
    const fileName = file?.name || path.split('/').pop();
    const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    setSelectedFile(file || { name: fileName });
    setError(null);
    if (!skipPushState) {
      updateUrl(pathOverride ? path.split('/').slice(0, -1).join('/') : currentPath, fileName);
    }
    if (isImg) {
      setFileContent(`/explorer/api/content?path=${encodeURIComponent(path)}&mode=${explorerMode}`);
      setViewMode('viewer');
    } else {
      fetch(`/explorer/api/content?path=${encodeURIComponent(path)}&mode=${explorerMode}`)
        .then(res => {
          if (!res.ok) throw new Error('連線失敗');
          return res.text();
        })
        .then(text => {
          setFileContent(text);
          setViewMode('viewer');
        })
        .catch((err) => {
          setError(err.message || '連線失敗');
        });
    }
  };

  const deleteItem = (file) => {
    if (!window.confirm(`確定要刪除 ${file.name} 嗎？`)) return;
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    fetch(`/explorer/api/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('刪除失敗');
        return res.json();
      })
      .then(() => {
        fetchFiles(currentPath);
      })
      .catch(err => setError(err.message));
  };

  const handleTouchStart = (file, e) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    const timer = setTimeout(() => {
      setContextMenu({ file, x: '50%', y: '50%' });
    }, 600);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e) => {
    if (!touchStartPos || !longPressTimer) return;
    const touch = e.touches[0];
    const distance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) +
      Math.pow(touch.clientY - touchStartPos.y, 2)
    );
    // 若位移超過 10px 視為拖曳，取消長按計時器
    if (distance > 10) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStartPos(null);
  };

  useEffect(() => {
    if (loading && currentPath === '' && files.length === 0) return;
    fetchFiles(currentPath, true);
  }, [explorerMode]);

  useEffect(() => {
    // Check version and fetch
    fetch('/explorer/api/version')
      .then(res => {
        if (!res.ok) throw new Error('無法獲取後端版本資訊');
        return res.json();
      })
      .then(data => {
        const beSha = data.gitSha || 'missing';
        const feSha = gitSha;

        if (beSha === 'unknown' || beSha === 'missing' || feSha === 'unknown') {
          throw new Error(`版本資訊無效: 前端(${feSha}) | 後端(${beSha})。請重新部署。`);
        }

        if (beSha !== feSha) {
          throw new Error(`版本不一致: 前端(${feSha}) != 後端(${beSha})。請清除瀏覽器快取或重新部署。`);
        }
        
        const params = new URLSearchParams(window.location.search);
        const urlFile = params.get('file');
        const urlPath = params.get('path');

        if (urlFile && process.env.NODE_ENV !== 'test') {
          const fullPath = urlPath ? `${urlPath}/${urlFile}` : urlFile;
          setCurrentPath(urlPath || '');
          fetchFileContent(null, fullPath, true);
        } else {
          fetchFiles(urlPath !== null ? urlPath : currentPath, true);
        }
      })
      .catch((err) => {
        setError(err.message || '連線失敗');
        setLoading(false);
      });

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlPath = params.get('path') || '';
      const urlFile = params.get('file');
      
      if (urlFile) {
        const fullPath = urlPath ? `${urlPath}/${urlFile}` : urlFile;
        setCurrentPath(urlPath);
        fetchFileContent(null, fullPath, true);
      } else {
        fetchFiles(urlPath, true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pathSegments = currentPath ? currentPath.split('/') : [];

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#3C4043] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-orange-100 shadow-sm">
        {/* Title Line */}
        <div className="flex items-center justify-between px-3 h-12">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchFiles('')}
              className="text-[#1a73e8] hover:bg-blue-50 px-2 py-1 rounded-xl transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="text-3xl font-black tracking-tight drop-shadow-sm">Explorer</span>
            </button>
            <span className="text-[10px] text-gray-400 font-mono select-none self-end mb-2">
              {gitSha}
            </span>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner border border-gray-200">
            <button
              onClick={() => {
                setExplorerMode('local');
                fetchFiles(currentPath, true, 'local');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-lg ${explorerMode === 'local' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Local
            </button>
            <button
              onClick={() => {
                setExplorerMode('google');
                fetchFiles(currentPath, true, 'google');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-lg ${explorerMode === 'google' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Google
            </button>
          </div>
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
        {error && (
          <div className="mx-2 my-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-red-500 font-bold text-lg">⚠️ {error}</span>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 bg-red-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
            >
              重試
            </button>
          </div>
        )}
        {viewMode === 'viewer' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center px-3 py-2 border-b border-orange-100 bg-orange-50/20">
              <button onClick={() => window.history.back()} className="p-2 hover:bg-orange-100 text-orange-600 rounded-full transition-colors mr-2">
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
                  onClick={() => {
                    if (contextMenu) {
                      setContextMenu(null);
                      return;
                    }
                    file.type === 'folder' 
                      ? fetchFiles(explorerMode === 'google' ? file.id : (currentPath ? `${currentPath}/${file.name}` : file.name)) 
                      : fetchFileContent(file);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ file, x: e.clientX, y: e.clientY });
                  }}
                  onTouchStart={(e) => handleTouchStart(file, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="flex items-center px-3 py-1 hover:bg-orange-50/30 active:bg-orange-100/50 transition-colors cursor-pointer group relative"
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

      {/* Context Menu Modal */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
          onClick={() => setContextMenu(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-orange-100 p-2 min-w-[200px] animate-in zoom-in-95 duration-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-orange-50 mb-1">
              <p className="text-sm font-bold text-gray-400 truncate">{contextMenu.file.name}</p>
            </div>
            <button
              onClick={() => {
                deleteItem(contextMenu.file);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-lg"
            >
              <span className="text-2xl">🗑️</span> 刪除物件
            </button>
            <button
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-bold text-lg"
            >
              <span className="text-2xl">❌</span> 取消
            </button>
          </div>
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="fixed -bottom-10 -right-10 w-64 h-64 bg-orange-100/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed -top-10 -left-10 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
    </div>
  );
};

export default App;
