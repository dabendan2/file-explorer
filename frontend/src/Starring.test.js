import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

const mockFiles = [
  { name: 'folder1', type: 'folder', size: 0, modified: '2026-02-03' },
  { name: 'test.txt', type: 'file', size: 1024, modified: '2026-02-03' },
  { name: 'starred.txt', type: 'file', size: 1024, modified: '2026-02-03', starred: true }
];

const setupMocks = (gitSha = 'a32a96f2') => {
  return jest.spyOn(global, 'fetch').mockImplementation((url, options) => {
    const urlStr = url.toString();
    if (urlStr === '/file-explorer/api/version') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ gitSha: 'a32a96f2' }),
      });
    }
    if (urlStr.includes('/file-explorer/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFiles),
      });
    }
    if (urlStr.includes('/file-explorer/api/star')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
        });
    }
    return Promise.reject(new Error('Unknown URL: ' + urlStr));
  });
};

beforeEach(() => {
  process.env.REACT_APP_GIT_SHA = 'a32a96f2';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('starred files appear before non-starred files', async () => {
    // 預期 backend 會回傳正確排序，或者 frontend 負責排序
    // 此測試驗證 frontend 是否正確呈現 starred 檔案在上方
    setupMocks();
    render(<App />);
    
    await screen.findByText('folder1');
    
    // Toggle star on starred.txt
    const starredItem = await screen.findByText('starred.txt');
    fireEvent.contextMenu(starredItem.closest('.group'));
    fireEvent.click(screen.getByText(/加星號/i));

    const items = screen.getAllByText(/(\.txt|folder1)/)
        .filter(el => el.tagName === 'SPAN')
        .map(el => el.textContent);
    
    // 現在 starred.txt 應該在第一位
    expect(items[0]).toBe('starred.txt');
    expect(items[1]).toBe('folder1');
    expect(items[2]).toBe('test.txt');
});

test('context menu shows Star/Unstar, Delete, Rename', async () => {
    setupMocks();
    render(<App />);
    
    const fileItem = await screen.findByText('test.txt');
    const container = fileItem.closest('.group');
    
    // 右鍵觸發 Context Menu
    fireEvent.contextMenu(container);
    
    expect(screen.getByText(/加星號/i)).toBeInTheDocument();
    expect(screen.getByText(/重新命名/i)).toBeInTheDocument();
    expect(screen.getByText(/刪除物件/i)).toBeInTheDocument();
});

test('clicking Star updates local storage and refreshes list', async () => {
    setupMocks();
    render(<App />);
    
    const fileItem = await screen.findByText('test.txt');
    fireEvent.contextMenu(fileItem.closest('.group'));
    
    const starBtn = screen.getByText(/加星號/i);
    fireEvent.click(starBtn);
    
    // Check if star icon appears
    expect(await screen.findByTestId('star-icon-test.txt')).toBeInTheDocument();
    
    // Check local storage
    const saved = JSON.parse(localStorage.getItem('file-explorer-stars'));
    expect(saved['test.txt']).toBe(true);
});
