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
