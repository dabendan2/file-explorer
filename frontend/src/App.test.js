import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

const mockFiles = [
  { name: 'folder1', type: 'folder', size: 0, modified: '2026-02-03' },
  { name: 'test.txt', type: 'file', size: 1024, modified: '2026-02-03' },
  { name: 'pic.png', type: 'file', size: 2048, modified: '2026-02-03' }
];

const setupMocks = (gitSha = 'a32a96f2') => {
  return jest.spyOn(global, 'fetch').mockImplementation((url) => {
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
    if (urlStr.includes('/file-explorer/api/content')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('file content'),
      });
    }
    return Promise.reject(new Error('Unknown URL: ' + urlStr));
  });
};

const originalEnv = process.env;

beforeEach(() => {
  localStorage.clear();
  process.env = { ...originalEnv, REACT_APP_GIT_SHA: 'a32a96f2' };
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = originalEnv;
});

test('renders file list when version matches Git SHA', async () => {
  setupMocks('a32a96f2'); // This mock SHA matches process.env.REACT_APP_GIT_SHA
  render(<App />);
  expect(await screen.findByText(/folder1/i)).toBeInTheDocument();
});

test('switches to viewer mode on file click', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  const fileItem = await screen.findByText(/test.txt/i);
  // Click on the icon/container part, not the text to avoid rename
  const container = fileItem.closest('div').parentElement;
  fireEvent.click(container);
  expect(await screen.findByText(/file content/i)).toBeInTheDocument();
});

test('switches mode after 7 clicks on title', async () => {
  const fetchMock = setupMocks('a32a96f2');
  render(<App />);
  const titleBtn = await screen.findByRole('button', { name: /File Explorer/i });
  
  // Click 7 times
  for (let i = 0; i < 7; i++) {
    fireEvent.click(titleBtn);
  }
  
  // Expect fetch to have been called with mode=google
  await waitFor(() => {
    const calls = fetchMock.mock.calls.map(c => c[0]);
    expect(calls.some(url => url.includes('mode=google'))).toBe(true);
  }, { timeout: 3000 });
});

test('adheres to font size and padding constraints', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  
  // Wait for list to render
  const folderItem = await screen.findByText(/folder1/i);
  const fileListContainer = folderItem.closest('div').parentElement;

  // 1. Check font sizes (All text elements must be >= text-base)
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && !['SCRIPT', 'STYLE', 'SVG', 'path'].includes(el.tagName)) {
      const classes = Array.from(el.classList);
      const fontSizeClasses = classes.filter(cls => cls.startsWith('text-'));
      
      fontSizeClasses.forEach(cls => {
        const size = cls.split('-')[1];
        // Skip check for version/SHA text which uses text-[10px]
        if (el.className.includes('text-[10px]')) return;
        
        // 1. 攔截預設的小字體類別 (禁止 xs, sm, base)
        expect(['xs', 'sm', 'base']).not.toContain(size);
        
        // 2. 攔截自定義的小字體數值 (必須 >= 18px)
        const pixelMatch = size.match(/\[(\d+)px\]/);
        if (pixelMatch) {
          const pxValue = parseInt(pixelMatch[1]);
          expect(pxValue).toBeGreaterThanOrEqual(18);
        }
      });
    }
  });

  // 2. Check padding (must not exceed p-2 / 0.5rem)
  const elementsWithPadding = document.querySelectorAll('[class*="p-"]');
  expect(elementsWithPadding.length).toBeGreaterThan(0);
  elementsWithPadding.forEach(el => {
    const classes = Array.from(el.classList);
    classes.forEach(cls => {
      const match = cls.match(/^p(?:[trblxy])?-(\d+(\.\d+)?)$/);
      if (match) {
        const paddingVal = parseFloat(match[1]);
        expect(paddingVal).toBeLessThanOrEqual(2);
      }
    });
  });
});

test('navigates through images on click', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  
  // Current order: folder1, test.txt, pic.png (all unstarred in mockFiles)
  // Let's modify pic.png to be starred to test the new sort too.
  // Actually, let's just stick to the current unstarred sort: folder1, pic.png, test.txt (alphabetical)
  
  const picItem = await screen.findByText(/pic.png/i);
  fireEvent.click(picItem.closest('.group'));
  
  const imgElement = await screen.findByAltText('');
  const viewerContainerImg = imgElement.closest('.p-3');
  viewerContainerImg.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 300 }));
  
  // pic.png is index 1 (after folder1). Next is test.txt (index 2).
  fireEvent.click(viewerContainerImg, { clientX: 250 });
  
  expect(await screen.findByText(/file content/i)).toBeInTheDocument();
  
  // test.txt is index 2. Previous is pic.png (index 1).
  const viewerContainerTxt = screen.getByText(/file content/i).closest('.p-3');
  viewerContainerTxt.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 300 }));
  fireEvent.click(viewerContainerTxt, { clientX: 50 });
  
  expect(await screen.findByAltText('')).toBeInTheDocument();
});

test('handles folder navigation and breadcrumbs', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  
  // Use getAllByText and pick the one in the list (span)
  const folders = await screen.findAllByText(/folder1/i);
  const folderListItem = folders.find(el => el.tagName === 'SPAN');
  const container = folderListItem.closest('.group');
  fireEvent.click(container);
  
  await waitFor(() => {
    expect(screen.getByText('Home')).toBeInTheDocument();
    // The breadcrumb folder1 should be the button
    const breadcrumb = screen.getAllByText('folder1').find(el => el.tagName === 'BUTTON');
    expect(breadcrumb).toHaveClass('text-orange-500');
  });

  const homeBtn = screen.getByText('Home');
  fireEvent.click(homeBtn);
  expect(await screen.findByText(/folder1/i)).toBeInTheDocument();
});

test('handles API errors and retry', async () => {
  const fetchMock = setupMocks('a32a96f2');
  fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network Error')));
  
  render(<App />);
  expect(await screen.findByText(/Network Error/i)).toBeInTheDocument();
  
  const retryBtn = screen.getByText(/重試/i);
  // Mock success for retry
  setupMocks('a32a96f2');
  
  // window.location.reload is not mockable easily, but we can check if it's called
  const originalLocation = window.location;
  delete window.location;
  window.location = { ...originalLocation, reload: jest.fn() };
  fireEvent.click(retryBtn);
  expect(window.location.reload).toHaveBeenCalled();
  window.location = originalLocation;
});

test('handles context menu rename', async () => {
  const fetchMock = setupMocks('a32a96f2');
  render(<App />);
  const filename = await screen.findByText('test.txt');
  
  // Trigger context menu
  fireEvent.contextMenu(filename.closest('.group'));
  
  // Click rename
  const renameBtn = screen.getByText(/重新命名/i);
  fireEvent.click(renameBtn);
  
  // Should show input
  const input = await screen.findByDisplayValue('test.txt');
  expect(input).toBeInTheDocument();
  
  // Change name and enter
  fireEvent.change(input, { target: { value: 'newname.txt' } });
  
  fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
  fireEvent.keyDown(input, { key: 'Enter' });
  
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/file-explorer/api/rename', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ oldPath: 'test.txt', newPath: 'newname.txt' })
    }));
  });
});

test('handles version mismatch error', async () => {
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (url.toString().includes('/file-explorer/api/version')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ gitSha: 'mismatch-sha' }),
      });
    }
    return setupMocks('a32a96f2')(url);
  });

  render(<App />);
  expect(await screen.findByText(/版本不一致/i)).toBeInTheDocument();
});

test('allows browsing hidden files like .env', async () => {
  const fetchMock = setupMocks('a32a96f2');
  
  fetchMock.mockImplementation((url) => {
    const urlStr = url.toString();
    if (urlStr.includes('/file-explorer/api/version')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ gitSha: 'a32a96f2' }),
      });
    }
    if (urlStr.includes('/file-explorer/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([...mockFiles, { name: '.env', type: 'file', size: 100 }]),
      });
    }
    if (urlStr.includes('path=.env')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('PORT=PLACEHOLDER')
      });
    }
    return setupMocks('a32a96f2')(url);
  });

  render(<App />);
  const fileItem = await screen.findByText('.env');
  
  // 點擊檔名以外的容器部分以觸發內容讀取
  const container = fileItem.closest('div').parentElement;
  fireEvent.click(container);

  // 根據 TDD 預期：後端應該要成功回傳內容
  expect(await screen.findByText(/PORT=PLACEHOLDER/i)).toBeInTheDocument();
});
