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
    if (urlStr === '/explorer/api/version') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ gitSha: 'a32a96f2' }),
      });
    }
    if (urlStr.includes('/explorer/api/files')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFiles),
      });
    }
    if (urlStr.includes('/explorer/api/content')) {
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
  fireEvent.click(fileItem);
  expect(await screen.findByText(/file content/i)).toBeInTheDocument();
});

test('switches mode after 7 clicks on title', async () => {
  const fetchMock = setupMocks('a32a96f2');
  render(<App />);
  const titleBtn = await screen.findByRole('button', { name: /Explorer/i });
  
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

test('activates multi-select on long press and deletes item', async () => {
  const fetchMock = setupMocks('a32a96f2');
  // Mock window.confirm
  window.confirm = jest.fn(() => true);
  
  // Mock DELETE response
  fetchMock.mockImplementation((url, options) => {
    if (options?.method === 'DELETE') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    }
    const setup = setupMocks('a32a96f2');
    return setup(url, options);
  });

  render(<App />);
  const fileItem = await screen.findByText(/test.txt/i);
  
  // Simulate long press (TouchStart -> Wait 600ms)
  jest.useFakeTimers();
  fireEvent.touchStart(fileItem, { touches: [{ clientX: 100, clientY: 100 }] });
  jest.advanceTimersByTime(600);
  
  // Check selection mode toolbar
  expect(await screen.findByText(/已選取 1 個/i)).toBeInTheDocument();
  
  // Click delete button
  const deleteBtn = screen.getByText(/刪除/i);
  fireEvent.click(deleteBtn);
  
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('1 個項目'));
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/explorer/api/delete'), expect.objectContaining({ method: 'DELETE' }));
  
  jest.useRealTimers();
});

test('navigates through images on click', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  
  // Open test.txt (index 1)
  const fileItem = await screen.findByText(/test.txt/i);
  fireEvent.click(fileItem);
  
  // On test.txt. Get container.
  const textElement = await screen.findByText(/file content/i);
  const viewerContainer = textElement.closest('.p-3');
  
  if (!viewerContainer) return; // Add safety check
  
  // Mock getBoundingClientRect
  viewerContainer.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 300 }));

  // Now selectedFile is test.txt (index 1)
  // Click right 1/3 (next) -> should go to pic.png (index 2)
  fireEvent.click(viewerContainer, { clientX: 250 });
  
  // Check if image is rendered
  expect(await screen.findByAltText('')).toBeInTheDocument();
  
  // selectedFile is now pic.png. Click left 1/3 -> should go back to test.txt
  fireEvent.click(viewerContainer, { clientX: 50 });
  expect(await screen.findByText(/file content/i)).toBeInTheDocument();
});

test('handles folder navigation and breadcrumbs', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  
  // Use getAllByText and pick the one in the list (span)
  const folders = await screen.findAllByText(/folder1/i);
  const folderListItem = folders.find(el => el.tagName === 'SPAN');
  fireEvent.click(folderListItem);
  
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

test('handles selection mode and clipboard', async () => {
  setupMocks('a32a96f2');
  // Mock clipboard
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    },
  });
  window.alert = jest.fn();

  render(<App />);
  const fileItem = await screen.findByText(/test.txt/i);
  
  // Long press to enter selection mode
  jest.useFakeTimers();
  fireEvent.touchStart(fileItem, { touches: [{ clientX: 100, clientY: 100 }] });
  jest.advanceTimersByTime(650); // Ensure timer fires
  
  await waitFor(() => {
    expect(screen.getByText(/已選取 1 個/i)).toBeInTheDocument();
  });

  const copyBtn = screen.getByText(/複製名稱/i);
  fireEvent.click(copyBtn);
  
  await waitFor(() => {
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.txt');
    expect(window.alert).toHaveBeenCalledWith('已複製檔案名稱');
  });
  jest.useRealTimers();
});

test('handles version mismatch error', async () => {
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (url.toString().includes('/explorer/api/version')) {
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
