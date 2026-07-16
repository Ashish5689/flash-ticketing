import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImagePickerField, type ImageSelection } from '../src/components/admin/ImagePickerField';

afterEach(cleanup);

function renderField(
  value: ImageSelection = { source: 'none' },
  options: { required?: boolean } = {},
) {
  const onChange = vi.fn();
  render(
    <ImagePickerField
      kind="poster"
      label="Poster image"
      onChange={onChange}
      required={options.required}
      value={value}
    />,
  );
  return onChange;
}

describe('ImagePickerField', () => {
  it('imports a direct HTTPS image URL', async () => {
    const user = userEvent.setup();
    const onChange = renderField();

    await user.click(screen.getByRole('button', { name: 'Import from URL' }));
    await user.type(
      screen.getByRole('textbox', { name: /Direct HTTPS image URL/ }),
      'https://images.example.com/poster.jpg',
    );
    await user.click(screen.getByRole('button', { name: 'Use URL' }));

    expect(onChange).toHaveBeenCalledWith({
      source: 'remote',
      url: 'https://images.example.com/poster.jpg',
    });
  });

  it('rejects non-HTTPS URL imports', async () => {
    const user = userEvent.setup();
    const onChange = renderField();

    await user.click(screen.getByRole('button', { name: 'Import from URL' }));
    await user.type(
      screen.getByRole('textbox', { name: /Direct HTTPS image URL/ }),
      'http://example.com/poster.jpg',
    );
    await user.click(screen.getByRole('button', { name: 'Use URL' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Paste a direct HTTPS image address.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a local image larger than 10 MB before opening the cropper', () => {
    const onChange = renderField();
    const input = screen.getByLabelText('Upload from device');
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'poster.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Images must be 10 MB or smaller.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows an optional existing image to be removed', async () => {
    const user = userEvent.setup();
    const onChange = renderField({ source: 'existing', url: 'https://example.com/poster.webp' });

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onChange).toHaveBeenCalledWith({ source: 'none' });
  });

  it('does not offer removal for a required poster', () => {
    renderField({ source: 'existing', url: 'https://example.com/poster.webp' }, { required: true });
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });
});
