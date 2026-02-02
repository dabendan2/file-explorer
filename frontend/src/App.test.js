import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders explorer title', () => {
  render(<App />);
  const linkElement = screen.getByText(/Explorer/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders file list with correct sizes', () => {
  render(<App />);
  expect(screen.getByText(/README.md/i)).toBeInTheDocument();
  expect(screen.getByText(/1.2 KB/i)).toBeInTheDocument();
  expect(screen.getByText(/config.json/i)).toBeInTheDocument();
  expect(screen.getByText(/512 B/i)).toBeInTheDocument();
});
