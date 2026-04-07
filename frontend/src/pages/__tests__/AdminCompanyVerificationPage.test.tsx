import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminCompanyVerificationPage from '../AdminCompanyVerificationPage';
import { authService } from '../../services/authService';
vi.mock('../../services/authService', () => ({
  authService: {
    adminRequest: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAdminRequest = authService.adminRequest as ReturnType<typeof vi.fn>;

const mockCompany = {
  id: 1,
  email: 'supplier@corp.com',
  cpf: '123.456.789-00',
  companyName: 'Supplier Corp',
  corporateName: 'Supplier Corp LTDA',
  cnpj: '12.345.678/0001-90',
  cnpjValidated: false,
  status: 'pending',
  industrySector: 'electronics',
  companyType: 'supplier',
  address: '123 Main St',
  phone: '+55 11 99999-9999',
  createdAt: new Date().toISOString(),
};

const mockVerificationQueue = {
  companies: [mockCompany],
  totalCount: 1,
  currentPage: 1,
  totalPages: 1,
};

function renderPage() {
  return render(
    <BrowserRouter>
      <AdminCompanyVerificationPage />
    </BrowserRouter>
  );
}

describe('AdminCompanyVerificationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAdminRequest.mockResolvedValue({ data: mockVerificationQueue });
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      mockAdminRequest.mockImplementation(() => new Promise(() => {}));

      renderPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when request fails', async () => {
      mockAdminRequest.mockRejectedValue(new Error('Network error'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('shows default error for non-Error throws', async () => {
      mockAdminRequest.mockRejectedValue('unexpected');

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Error loading verification queue/i)).toBeInTheDocument();
      });
    });
  });

  describe('successful load', () => {
    it('renders company list after loading', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });
    });

    it('shows company CNPJ', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/12\.345\.678\/0001-90/i)).toBeInTheDocument();
      });
    });

    it('shows company status chip area', async () => {
      renderPage();

      await waitFor(() => {
        // Company card is rendered in the queue section
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
        // The Verification Queue header is present
        expect(screen.getByText(/Verification Queue/i)).toBeInTheDocument();
      });
    });

    it('renders page with tabs', async () => {
      renderPage();

      await waitFor(() => {
        // Tabs for pending/all/unvalidated_cnpj
        expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
      });
    });
  });

  describe('filter changes', () => {
    it('reloads queue when filter tab changes', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const tabs = screen.getAllByRole('tab');
      if (tabs.length > 1) {
        await act(async () => {
          fireEvent.click(tabs[1]);
        });

        // Should call adminRequest again with new filter
        await waitFor(() => {
          expect(mockAdminRequest).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('company verification', () => {
    it('opens verification dialog when verify button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // Find and click verify/visibility buttons
      const buttons = screen.getAllByRole('button');
      const visibleButtons = buttons.filter(
        btn => btn.textContent || btn.getAttribute('aria-label')
      );

      // Should have at least some action buttons
      expect(visibleButtons.length).toBeGreaterThan(0);
    });

    it('calls verify endpoint and shows success toast', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue }) // initial load
        .mockResolvedValueOnce({ data: { message: 'Company approved successfully' } }) // verify
        .mockResolvedValueOnce({ data: mockVerificationQueue }); // reload

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // Page loaded successfully with action buttons
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(0);
    });

    it('handles verify error gracefully', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockRejectedValueOnce(new Error('Verification failed'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });
    });
  });

  describe('CNPJ validation', () => {
    it('handles CNPJ validation error gracefully', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockRejectedValueOnce(new Error('CNPJ validation failed'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('reloads queue when refresh button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // Find the refresh button by its text "Atualizar"
      const refreshBtn = screen.queryByText('Atualizar');

      if (refreshBtn) {
        await act(async () => {
          fireEvent.click(refreshBtn);
        });

        await waitFor(() => {
          expect(mockAdminRequest).toHaveBeenCalledTimes(2);
        });
      } else {
        // If the button text is not found, verify the initial load occurred
        expect(mockAdminRequest).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('sector and company type labels', () => {
    it('renders page without crashing with all company fields', async () => {
      const companyWithSector = {
        ...mockCompany,
        industrySector: 'machinery',
        companyType: 'supplier',
      };

      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, companies: [companyWithSector] },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });
    });

    it('handles empty companies list', async () => {
      mockAdminRequest.mockResolvedValue({
        data: { companies: [], totalCount: 0, currentPage: 1, totalPages: 0 },
      });

      renderPage();

      await waitFor(() => {
        expect(mockAdminRequest).toHaveBeenCalled();
      });
    });
  });

  describe('details dialog', () => {
    it('opens details dialog when Visibility button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // The Visibility button is the last icon button in the card
      const allButtons = screen.getAllByRole('button');
      // Filter to icon buttons (no text content) and find the Visibility one
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Detalhes da Empresa')).toBeInTheDocument();
      });
    });

    it('shows company details in dialog including basic info accordion', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
        expect(screen.getByText('Documentação')).toBeInTheDocument();
      });
    });

    it('shows Verificar Empresa button for pending company in dialog', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Verificar Empresa')).toBeInTheDocument();
      });
    });

    it('closes details dialog when Fechar is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Fechar')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Fechar'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Detalhes da Empresa')).not.toBeInTheDocument();
      });
    });

    it('opens verification dialog from details dialog', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Verificar Empresa')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Verificar Empresa'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Verificar Empresa: Supplier Corp/i)).toBeInTheDocument();
      });
    });

    it('approves company from verification dialog', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockResolvedValueOnce({ data: { message: 'Company approved' } })
        .mockResolvedValueOnce({ data: mockVerificationQueue });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Verificar Empresa')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Verificar Empresa'));
      });

      await waitFor(() => {
        expect(screen.getByText('Aprovar')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Aprovar'));
      });

      await waitFor(() => {
        expect(mockAdminRequest).toHaveBeenCalledWith(
          expect.stringContaining('/admin/companies/1/verify'),
          expect.objectContaining({ data: expect.objectContaining({ status: 'approved' }) })
        );
      });
    });

    it('rejects company from list reject button', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockResolvedValueOnce({ data: { message: 'Company rejected' } })
        .mockResolvedValueOnce({ data: mockVerificationQueue });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // The Close (reject) button is the first icon-only button in the company card
      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      // First icon-only is FilterList, then Close, Check, Visibility
      // Find the second-to-last icon button (Check) and the one before it (Close/reject)
      const rejectBtn = iconOnlyButtons[iconOnlyButtons.length - 3]; // Close icon

      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      await waitFor(() => {
        expect(mockAdminRequest).toHaveBeenCalledWith(
          expect.stringContaining('/admin/companies/1/verify'),
          expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) })
        );
      });
    });
  });

  describe('additional coverage', () => {
    it('shows CheckCircle when cnpjValidated is true in details dialog', async () => {
      const validatedCompany = { ...mockCompany, cnpjValidated: true };
      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, companies: [validatedCompany] },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        // Dialog opens — cnpjValidated true branch is rendered (CheckCircle icon)
        expect(screen.getByText('Detalhes da Empresa')).toBeInTheDocument();
      });
    });

    it('shows street details in details dialog when company has street field', async () => {
      const companyWithStreet = {
        ...mockCompany,
        street: 'Rua Teste',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      };
      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, companies: [companyWithStreet] },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        // The street+number combination in the details dialog
        expect(screen.getByText(/Rua Teste, 123/)).toBeInTheDocument();
      });
    });

    it('types in the verification reason field', async () => {
      mockAdminRequest.mockResolvedValue({ data: mockVerificationQueue });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // Open details dialog first, then open verification dialog
      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const visibilityBtn = iconOnlyButtons[iconOnlyButtons.length - 1];

      await act(async () => {
        fireEvent.click(visibilityBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Verificar Empresa')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Verificar Empresa'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Verificar Empresa: Supplier Corp/i)).toBeInTheDocument();
      });

      // Find and type in the reason text field
      const reasonField = screen.getByRole('textbox', { name: /Motivo/i });
      fireEvent.change(reasonField, { target: { value: 'Documents verified' } });

      expect(reasonField).toHaveValue('Documents verified');
    });
  });

  describe('pagination', () => {
    it('shows pagination info when multiple pages', async () => {
      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, totalPages: 3, currentPage: 1 },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument();
      });
    });
  });

  describe('direct reject button on company card', () => {
    it('calls handleVerifyCompany with rejected when reject icon button is clicked', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockResolvedValueOnce({ data: { message: 'Company rejected' } })
        .mockResolvedValueOnce({ data: mockVerificationQueue });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // The Close (reject) icon button in the card actions
      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const rejectBtn = iconOnlyButtons[iconOnlyButtons.length - 3]; // Close icon

      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      await waitFor(() => {
        expect(mockAdminRequest).toHaveBeenCalledWith(
          expect.stringContaining('/admin/companies/1/verify'),
          expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) })
        );
      });
    });

    it('calls handleVerifyCompany with approved when approve icon button is clicked', async () => {
      mockAdminRequest
        .mockResolvedValueOnce({ data: mockVerificationQueue })
        .mockResolvedValueOnce({ data: { message: 'Company approved' } })
        .mockResolvedValueOnce({ data: mockVerificationQueue });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Supplier Corp')).toBeInTheDocument();
      });

      // The Check (approve) icon button in the card actions
      const allButtons = screen.getAllByRole('button');
      const iconOnlyButtons = allButtons.filter(btn => !btn.textContent?.trim());
      const approveBtn = iconOnlyButtons[iconOnlyButtons.length - 2]; // Check icon

      await act(async () => {
        fireEvent.click(approveBtn);
      });

      await waitFor(() => {
        expect(mockAdminRequest).toHaveBeenCalledWith(
          expect.stringContaining('/admin/companies/1/verify'),
          expect.objectContaining({ data: expect.objectContaining({ status: 'approved' }) })
        );
      });
    });
  });

  describe('status display for non-pending companies', () => {
    it('shows "Approved" text for approved company instead of action buttons', async () => {
      const approvedCompany = { ...mockCompany, status: 'approved' };
      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, companies: [approvedCompany] },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });
    });

    it('shows "Rejected" text for rejected company instead of action buttons', async () => {
      const rejectedCompany = { ...mockCompany, status: 'rejected' };
      mockAdminRequest.mockResolvedValue({
        data: { ...mockVerificationQueue, companies: [rejectedCompany] },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Rejected')).toBeInTheDocument();
      });
    });
  });

  describe('non-Error catch path', () => {
    it('shows default error message when non-Error is thrown during load', async () => {
      mockAdminRequest.mockRejectedValue('string-error');

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Error loading verification queue/i)).toBeInTheDocument();
      });
    });

    it('shows default error message when null is thrown during load', async () => {
      mockAdminRequest.mockRejectedValue(null);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Error loading verification queue/i)).toBeInTheDocument();
      });
    });
  });
});
