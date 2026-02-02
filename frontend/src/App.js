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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      {/* Google Style Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <Menu size={24} className="text-gray-600" />
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
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          天
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-4 px-1">建議檔案</h2>
        
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
              <MoreVertical size={20} className="text-gray-400 ml-2" />
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button */}
      <button className="fixed right-6 bottom-6 w-14 h-14 bg-white shadow-lg rounded-2xl flex items-center justify-center text-gray-700 border border-gray-100 hover:shadow-xl active:scale-95 transition-all">
        <Plus size={28} className="text-blue-600" />
      </button>

      {/* Navigation Rail / Bottom Nav */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-6">
        <div className="flex flex-col items-center text-blue-600">
          <Folder size={24} fill="currentColor" fillOpacity="0.2" />
          <span className="text-[10px] mt-1 font-medium">檔案</span>
        </div>
        <div className="flex flex-col items-center text-gray-500">
          <Search size={24} />
          <span className="text-[10px] mt-1 font-medium">搜尋</span>
        </div>
        <div className="flex flex-col items-center text-gray-500">
          <Menu size={24} />
          <span className="text-[10px] mt-1 font-medium">共用</span>
        </div>
      </footer>
      
      {/* Version Tag */}
      <div className="hidden" data-version="1.0.2">v1.0.2</div>
    </div>
  );
};

export default Explorer;
