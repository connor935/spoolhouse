import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveRefresh } from './live-refresh';

const refresh = vi.hoisted(() => vi.fn());
// Stable like Next's router: a fresh object per render would re-run the effect.
const router = vi.hoisted(() => ({ refresh }));
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
}));

// Minimal EventSource double: records instances so tests can fire events.
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: (() => void) | null = null;
  onopen: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  FakeEventSource.instances = [];
  nav.pathname = '/';
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const latest = () => FakeEventSource.instances.at(-1)!;

describe('LiveRefresh', () => {
  it('renders nothing and subscribes to /api/events', () => {
    const { container } = render(<LiveRefresh />);
    expect(container).toBeEmptyDOMElement();
    expect(latest().url).toBe('/api/events');
  });

  it('debounces a burst of events into one refresh', () => {
    render(<LiveRefresh />);
    latest().onmessage!();
    latest().onmessage!();
    act(() => vi.advanceTimersByTime(399));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refreshes after a reconnect, not on the first open', () => {
    render(<LiveRefresh />);
    latest().onopen!();
    expect(refresh).not.toHaveBeenCalled();
    latest().onopen!();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refreshes when the tab becomes visible again', () => {
    render(<LiveRefresh />);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('does not connect on public auth pages', () => {
    nav.pathname = '/login';
    render(<LiveRefresh />);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('keeps one stream across ordinary navigations', () => {
    const { rerender } = render(<LiveRefresh />);
    nav.pathname = '/inventory';
    rerender(<LiveRefresh />);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('closes the stream on logout and on unmount', () => {
    const { rerender, unmount } = render(<LiveRefresh />);
    const first = latest();
    nav.pathname = '/login';
    rerender(<LiveRefresh />);
    expect(first.closed).toBe(true);
    nav.pathname = '/';
    rerender(<LiveRefresh />);
    unmount();
    expect(latest().closed).toBe(true);
  });
});
