import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TheaterForm } from '../src/pages/OrganizerPage';

afterEach(cleanup);

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Theater name' }), 'Silver City');
  await user.type(screen.getByRole('textbox', { name: 'Address' }), 'Andheri West, Mumbai');
  return user;
}

describe('TheaterForm', () => {
  it('blocks a short address before calling the API', async () => {
    const onSubmit = vi.fn();
    render(<TheaterForm loading={false} onCancel={vi.fn()} onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Theater name' }), 'Silver City');
    await user.type(screen.getByRole('textbox', { name: 'Address' }), 'Mumbai');
    await user.click(screen.getByRole('button', { name: 'Create theater' }));

    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveAttribute('minlength', '8');
    expect(screen.getByRole('alert')).toHaveTextContent('Address must be at least 8 characters');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a failed request in the modal instead of leaving an unhandled rejection', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Theater could not be saved'));
    render(<TheaterForm loading={false} onCancel={vi.fn()} onSubmit={onSubmit} />);
    const user = await fillValidForm();

    await user.click(screen.getByRole('button', { name: 'Create theater' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.getByRole('alert')).toHaveTextContent('Theater could not be saved');
  });
});
