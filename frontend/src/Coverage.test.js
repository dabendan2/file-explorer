import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

const mockFiles = [
  { name: 'video.mp4', type: 'file', size: 1024 * 5, modified: '2026-02-03' },
  { name: 'image.jpg', type: 'file', size: 1024 * 2, modified: '2026-02-03' }
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
    return Promise.resolve({ ok: true, text: () => Promise.resolve('content'), json: () => Promise.resolve({success: true}) });
  });
};

beforeEach(() => {
  process.env.REACT_APP_GIT_SHA = 'a32a96f2';
  jest.useFakeTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('handles touch interactions for long press', async () => {
  setupMocks();
  render(<App />);
  const file = await screen.findByText('video.mp4');
  const iconContainer = file.closest('.group').querySelector('.w-9');

  // Touch start and move slightly (within threshold)
  fireEvent.touchStart(iconContainer, { touches: [{ clientX: 10, clientY: 10 }] });
  fireEvent.touchMove(iconContainer, { touches: [{ clientX: 12, clientY: 12 }] });
  
  act(() => {
    jest.advanceTimersByTime(700);
  });

  // Context menu should appear
  expect(await screen.findByText(/刪除物件/i)).toBeInTheDocument();
});

test('handles touch move exceeding threshold cancels long press', async () => {
  setupMocks();
  render(<App />);
  const file = await screen.findByText('video.mp4');
  const iconContainer = file.closest('.group').querySelector('.w-9');

  fireEvent.touchStart(iconContainer, { touches: [{ clientX: 10, clientY: 10 }] });
  fireEvent.touchMove(iconContainer, { touches: [{ clientX: 50, clientY: 50 }] });
  
  act(() => {
    jest.advanceTimersByTime(700);
  });
  expect(screen.queryByText(/刪除物件/i)).not.toBeInTheDocument();
  
  fireEvent.touchEnd(iconContainer);
});

test('renders video and image viewers', async () => {
  setupMocks();
  render(<App />);
  
  // Click video
  const video = await screen.findByText('video.mp4');
  fireEvent.click(video.closest('.group'));
  
  // Should render video tag
  await waitFor(() => {
    const videoEl = document.querySelector('video');
    expect(videoEl).toBeInTheDocument();
  });

  // Back (Click Home or a breadcrumb)
  const backBtn = screen.getByRole('button', { name: /Home/i });
  fireEvent.click(backBtn);

  // Click image
  const image = await screen.findByText('image.jpg');
  fireEvent.click(image.closest('.group'));
  
  await waitFor(() => {
    const imgEl = document.querySelector('img');
    expect(imgEl).toBeInTheDocument();
  });
});
