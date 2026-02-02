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
        json: () => Promise.resolve({ gitSha }),
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

test('renders file list when version matches', async () => {
  setupMocks('a32a96f2');
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

test('persists path in localStorage', async () => {
  setupMocks('a32a96f2');
  render(<App />);
  const folderItem = await screen.findByText(/folder1/i);
  fireEvent.click(folderItem);
  await waitFor(() => {
    expect(localStorage.getItem('explorer-path')).toBe('folder1');
  });
});
