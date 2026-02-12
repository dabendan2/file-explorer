import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

const mockFiles = [
  { name: 'test.txt', type: 'file', size: 1024, modified: '2026-02-03' },
  { name: 'other.txt', type: 'file', size: 1024, modified: '2026-02-03' }
];

const setupMocks = () => {
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
          text: () => Promise.resolve('this is text content'),
        });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
};

beforeEach(() => {
  process.env.REACT_APP_GIT_SHA = 'a32a96f2';
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('text content clicks do not navigate to other files', async () => {
    setupMocks();
    render(<App />);
    
    // Open test.txt
    const fileItem = await screen.findByText('test.txt');
    fireEvent.click(fileItem.closest('.group'));
    
    const pre = await screen.findByText('this is text content');
    const viewerContainer = pre.parentElement;
    
    // Mock getBoundingClientRect for navigation logic
    viewerContainer.getBoundingClientRect = jest.fn(() => ({ left: 0, width: 300 }));

    // Click on right side of content
    fireEvent.click(pre, { clientX: 250 });
    
    // Should still be on test.txt
    expect(screen.getByText('this is text content')).toBeInTheDocument();
    
    // Verify path bar still shows test.txt
    const pathBarContent = screen.getByText('test.txt', { selector: 'span' });
    expect(pathBarContent).toBeInTheDocument();
});
