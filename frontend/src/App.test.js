import { render, screen } from '@testing-library/react';
import App from './App';

test('renders explorer title', () => {
  render(<App />);
  const linkElement = screen.getByText(/Explorer/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders file list', () => {
  render(<App />);
  const fileElement = screen.getByText(/README.md/i);
  expect(fileElement).toBeInTheDocument();
});
