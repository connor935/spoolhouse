import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SwaggerDocs } from './swagger-docs';

const SwaggerUIBundle = vi.hoisted(() => vi.fn());
vi.mock('swagger-ui-dist', () => ({ SwaggerUIBundle }));
vi.mock('swagger-ui-dist/swagger-ui.css', () => ({}));

describe('SwaggerDocs', () => {
  it('mounts Swagger UI for the spec URL into its own node', async () => {
    const { container } = render(<SwaggerDocs url="/api/v1/openapi.json" />);
    await waitFor(() => expect(SwaggerUIBundle).toHaveBeenCalledOnce());
    expect(SwaggerUIBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/openapi.json',
        domNode: container.firstChild,
        persistAuthorization: true,
      })
    );
  });

  it('does not mount after unmounting', async () => {
    SwaggerUIBundle.mockClear();
    const { unmount } = render(<SwaggerDocs url="/spec.json" />);
    unmount();
    await new Promise((r) => setTimeout(r, 0));
    expect(SwaggerUIBundle).not.toHaveBeenCalled();
  });
});
