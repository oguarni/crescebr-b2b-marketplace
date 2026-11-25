import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import toast from 'react-hot-toast';
import type { SystemSettingsRecord } from '@shared/types';
import AdminSettingsPage from '../AdminSettingsPage';
import { settingsService } from '../../services/settingsService';
import { DEFAULT_SYSTEM_SETTINGS } from '../../utils/systemSettingsRules';

vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getAdminSettings: vi.fn(),
    updateAdminSettings: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toastFn };
});

const getSettings = vi.mocked(settingsService.getAdminSettings);
const updateSettings = vi.mocked(settingsService.updateAdminSettings);

const record = (overrides: Partial<SystemSettingsRecord> = {}): SystemSettingsRecord => ({
  settings: DEFAULT_SYSTEM_SETTINGS,
  defaults: DEFAULT_SYSTEM_SETTINGS,
  version: 3,
  updatedAt: '2026-11-20T15:30:00.000Z',
  updatedBy: { id: 1, email: 'admin@crescebr.com', companyName: 'CresceBR Admin' },
  ...overrides,
});

const httpError = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, null, {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const taxField = () => screen.getByLabelText('Alíquota de imposto estimada');
const saveButton = () => screen.getByRole('button', { name: 'Salvar alterações' });

const renderLoaded = async () => {
  const user = userEvent.setup();
  render(<AdminSettingsPage />);
  await screen.findByRole('heading', { name: 'Configurações do sistema', level: 1 });
  return user;
};

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue(record());
  });

  it('shows the saved values, their editor and nothing to save', async () => {
    await renderLoaded();

    expect(taxField()).toHaveValue('18');
    expect(screen.getByLabelText('Validade da cotação')).toHaveValue('30');
    expect(screen.getByText(/por CresceBR Admin/)).toBeInTheDocument();
    expect(screen.getByText('501 unidades ou mais')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Nenhuma alteração pendente.')).toBeInTheDocument();
  });

  it('says when the defaults were never changed', async () => {
    getSettings.mockResolvedValue(record({ version: 0, updatedAt: null, updatedBy: null }));
    await renderLoaded();
    expect(screen.getByText(/ainda não alterados/)).toBeInTheDocument();
  });

  it('saves the edited document with the version it read', async () => {
    updateSettings.mockResolvedValue(
      record({ settings: { ...DEFAULT_SYSTEM_SETTINGS, taxRate: 0.125 }, version: 4 })
    );
    const user = await renderLoaded();

    await user.clear(taxField());
    await user.type(taxField(), '12,5');
    expect(screen.getByText('Há alterações não salvas.')).toBeInTheDocument();
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({ ...DEFAULT_SYSTEM_SETTINGS, taxRate: 0.125 }, 3)
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Configurações salvas. As próximas cotações já usam os novos valores.'
    );
    expect(taxField()).toHaveValue('12.5');
    expect(saveButton()).toBeDisabled();
  });

  it('explains an invalid value in Portuguese, as a percentage, and blocks saving', async () => {
    const user = await renderLoaded();

    await user.clear(taxField());
    await user.type(taxField(), '80');

    expect(screen.getByText('Deve estar entre 0 e 50')).toBeInTheDocument();
    expect(screen.getByText('Corrija os campos destacados para salvar.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('flags an express delivery slower than standard', async () => {
    const user = await renderLoaded();
    const express = screen.getByRole('group', { name: 'Expresso' });
    const days = within(express).getByLabelText('Prazo de entrega');

    await user.clear(days);
    await user.type(days, '9');

    expect(screen.getByRole('alert')).toHaveTextContent(/Expresso não pode passar/);
  });

  it('asks to reload when another admin saved first', async () => {
    updateSettings.mockRejectedValueOnce(httpError(409, { success: false }));
    getSettings
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(
        record({ settings: { ...DEFAULT_SYSTEM_SETTINGS, taxRate: 0.2 }, version: 4 })
      );
    const user = await renderLoaded();

    await user.clear(taxField());
    await user.type(taxField(), '19');
    await user.click(saveButton());

    expect(await screen.findByText(/Outro administrador salvou/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Recarregar' }));
    await waitFor(() => expect(taxField()).toHaveValue('20'));
    expect(screen.queryByText(/Outro administrador salvou/)).not.toBeInTheDocument();
  });

  it('places a server-side rule violation on its field', async () => {
    updateSettings.mockRejectedValueOnce(
      httpError(400, {
        success: false,
        details: [
          { path: 'settings.quotationValidityDays', code: 'range', params: { min: 1, max: 180 } },
          { path: 'version', msg: 'version must be a non-negative integer' },
        ],
      })
    );
    const user = await renderLoaded();

    await user.clear(taxField());
    await user.type(taxField(), '19');
    await user.click(saveButton());

    expect(await screen.findByText('Deve estar entre 1 e 180')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Corrija os campos destacados para salvar.');
  });

  it('reports an unexpected save failure', async () => {
    updateSettings.mockRejectedValueOnce(new Error('Network down'));
    const user = await renderLoaded();

    await user.clear(taxField());
    await user.type(taxField(), '19');
    await user.click(saveButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível salvar as configurações.')
    );
  });

  it('loads the defaults into the form and lets the admin discard them', async () => {
    getSettings.mockResolvedValue(
      record({ settings: { ...DEFAULT_SYSTEM_SETTINGS, taxRate: 0.1 } })
    );
    const user = await renderLoaded();
    expect(taxField()).toHaveValue('10');

    await user.click(screen.getByRole('button', { name: 'Restaurar padrões' }));
    expect(taxField()).toHaveValue('18');
    expect(toast).toHaveBeenCalledWith(
      'Valores padrão carregados no formulário. Revise e salve para aplicar.'
    );

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(taxField()).toHaveValue('10');
  });

  it('adds and removes volume tiers', async () => {
    const user = await renderLoaded();

    await user.click(screen.getByRole('button', { name: 'Adicionar faixa' }));
    expect(screen.getByText('511 unidades ou mais')).toBeInTheDocument();
    expect(screen.getByLabelText('De 501 até')).toHaveValue('510');

    await user.click(screen.getByRole('button', { name: 'Remover faixa 6' }));
    expect(screen.getByText('501 unidades ou mais')).toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    getSettings.mockRejectedValueOnce(new Error('Server Error')).mockResolvedValueOnce(record());
    const user = userEvent.setup();
    render(<AdminSettingsPage />);

    expect(await screen.findByText('Server Error')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByLabelText('Alíquota de imposto estimada')).toHaveValue('18');
  });
});
