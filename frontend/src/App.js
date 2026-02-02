import React, { useState } from 'react';
import { Folder, File, ChevronRight, Search, HardDrive, Clock, Star } from 'lucide-react';

const Explorer = () => {
  const [files] = useState([
    { name: 'Documents', type: 'folder', size: '-', modified: '2024-01-20' },
    { name: 'Images', type: 'folder', size: '-', modified: '2024-01-21' },
    { name: 'Project_Alpha', type: 'folder', size: '-', modified: '2024-01-22' },
    { name: 'README.md', type: 'file', size: '1.2 KB', modified: '2024-01-22' },
    { name: 'config.json', type: 'file', size: '512 B', modified: '2024-01-22' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2 font-bold text-blue-600">
          <HardDrive size={20} />
          <span>Explorer</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
            <div className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer text-sm">
              <Star size={16} className="text-amber-600" />
              <span>Favorites</span>
            </div>
            <div className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer text-sm">
              <Clock size={16} className="text-blue-600" />
              <span>Recent</span>
            </div>
            <div className="pt-4 pb-2 px-2 text-xs font-bold text-gray-400 uppercase">Locations</div>
            <div className="flex items-center gap-2 p-2 bg-blue-100 text-blue-600 rounded-lg cursor-pointer text-sm font-medium">
              <Folder size={16} />
              <span>Root (/)</span>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-1 text-sm text-gray-500 overflow-hidden">
              <span className="hover:text-blue-600 cursor-pointer">Computer</span>
              <ChevronRight size={14} />
              <span className="font-medium text-gray-800 truncate">/</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-64">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search files..."
                className="w-full bg-gray-100 border-none rounded-full py-1.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-600/50 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* File Grid/List */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-200">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Modified</th>
              </tr>
            </thead>
            <tbody>
              {files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file, i) => (
                <tr key={i} className="hover:bg-gray-100 group cursor-pointer border-b border-gray-50 transition-colors">
                  <td className="py-2 px-4 flex items-center gap-3">
                    {file.type === 'folder' ? 
                      <Folder size={18} className="text-blue-600 fill-blue-100" /> : 
                      <File size={18} className="text-gray-400" />
                    }
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-500">{file.size}</td>
                  <td className="py-2 px-4 text-sm text-gray-500">{file.modified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Explorer;
