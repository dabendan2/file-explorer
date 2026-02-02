import React, { useState, useEffect } from 'react';
import { Folder, File, Search, Menu, MoreVertical, Plus } from 'lucide-react';

const Explorer = () => {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const formatSize = (bytes) => {
    if (bytes === 0 || bytes === '-') return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch files:', err);
        setLoading(false);
      });
  }, []);

  const getIconColor = (index) => {
    const colors = ['text-blue-500', 'text-red-500', 'text-yellow-500', 'text-green-500'];
    return colors[index % colors.length];
  };

  const gitSha = process.env.REACT_APP_GIT_SHA || 'unknown';

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      {/* Google Style Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 gap-3 focus-within:bg-white focus-within:shadow-md transition-all">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="在 Explorer 中搜尋"
            className="bg-transparent border-none w-full outline-none text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col items-end shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            天
          </div>
          <span className="text-[8px] text-gray-400 font-mono mt-1">#{gitSha}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="space-y-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file, i) => (
            <div key={i} className="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors active:bg-gray-100">
              <div className={`p-2 rounded-lg mr-4 ${file.type === 'folder' ? 'bg-gray-100' : ''}`}>
                {file.type === 'folder' ? 
                  <Folder size={24} className={getIconColor(i)} fill="currentColor" fillOpacity="0.2" /> : 
                  <File size={24} className="text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-normal truncate">{file.name}</div>
                <div className="text-xs text-gray-500 flex gap-2">
                  <span>{file.type === 'folder' ? '資料夾' : formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{file.modified}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Version Tag */}
      <div className="hidden" data-version="1.0.2" data-git-sha={gitSha}>v1.0.2-{gitSha}</div>
    </div>
  );
};

export default Explorer;
