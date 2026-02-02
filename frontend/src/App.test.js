import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders app container', () => {
  render(<App />);
  // Check for Root breadcrumb
  const rootButton = screen.getByText(/Root/i);
  expect(rootButton).toBeInTheDocument();
});

test('renders file list with correct sizes from mocked fetch', async () => {
  const mockFiles = [
    { name: 'README.md', type: 'file', size: 1228.8, modified: '2024-01-22' },
    { name: 'empty.txt', type: 'file', size: 0, modified: '2024-01-22' },
    { name: 'empty_folder', type: 'folder', size: 0, modified: '2024-01-22' }
  ];
  jest.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      json: () => Promise.resolve(mockFiles),
    })
  );

  render(<App />);
  
  expect(await screen.findByText(/README.md/i)).toBeInTheDocument();
  expect(screen.getByText(/1.2 KB/i)).toBeInTheDocument();
  expect(screen.getByText(/empty.txt/i)).toBeInTheDocument();
  expect(screen.getByText(/資料夾/i)).toBeInTheDocument();

  global.fetch.mockRestore();
});
