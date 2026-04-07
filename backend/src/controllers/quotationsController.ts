import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { quotationService } from '../services/quotation.service';
import { QuoteService } from '../services/quoteService';

// Customer endpoints
export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const quotation = await quotationService.validateAndCreate({
      items: req.body.items,
      companyId: req.user!.id,
    });

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quotation',
    });
  }
});

export const getCustomerQuotations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const quotations = await quotationService.getForCustomer(req.user!.id);

    res.status(200).json({
      success: true,
      data: quotations,
    });
  }
);

export const getQuotationById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const quotation = await quotationService.getById(parseInt(id), req.user!.id, req.user!.role);

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get quotation';
    const status =
      message === 'Quotation not found' ? 404 : message === 'Access denied' ? 403 : 400;

    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

// Admin endpoints
export const getAllQuotations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const quotations = await quotationService.getAllForAdmin();

  res.status(200).json({
    success: true,
    data: quotations,
  });
});

export const updateQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { status, adminNotes } = req.body;

  try {
    const updatedQuotation = await quotationService.updateByAdmin(parseInt(id), {
      status,
      adminNotes,
    });

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update quotation';
    const status = message === 'Quotation not found' ? 404 : 400;

    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

export const calculateQuote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { items, buyerLocation, supplierLocation, shippingMethod } = req.body;

  try {
    const calculations = await QuoteService.calculateQuoteComparison(items, {
      buyerLocation,
      supplierLocation,
      shippingMethod,
    });

    const formattedResponse = QuoteService.formatQuoteResponse(calculations);

    res.status(200).json({
      success: true,
      data: {
        ...formattedResponse,
        calculations: calculations,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Quote calculation failed',
    });
  }
});

export const getQuotationCalculations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const companyId = req.user!.id;
    const userRole = req.user!.role;

    try {
      const result = await QuoteService.getQuotationWithCalculations(parseInt(id));

      if (userRole === 'customer' && result.quotation.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const formattedResponse = QuoteService.formatQuoteResponse(result.calculations);

      res.status(200).json({
        success: true,
        data: {
          quotation: result.quotation,
          ...formattedResponse,
          calculations: result.calculations,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quotation calculations',
      });
    }
  }
);

export const processQuotationWithCalculations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;

    try {
      const result = await QuoteService.getQuotationWithCalculations(parseInt(id));

      await QuoteService.updateQuotationWithCalculations(parseInt(id), result.calculations);

      const updatedQuotation = await quotationService.getById(parseInt(id), req.user!.id, 'admin');

      const formattedResponse = QuoteService.formatQuoteResponse(result.calculations);

      res.status(200).json({
        success: true,
        message: 'Quotation processed with calculations',
        data: {
          quotation: updatedQuotation,
          ...formattedResponse,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process quotation',
      });
    }
  }
);

export const getMultipleSupplierQuotes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity, buyerLocation, supplierIds, shippingMethod } = req.body;

    try {
      const quotes = await QuoteService.getMultipleSupplierQuotes(
        productId,
        quantity,
        buyerLocation,
        supplierIds,
        shippingMethod
      );

      res.status(200).json({
        success: true,
        data: {
          quotes,
          productId,
          quantity,
          buyerLocation,
          shippingMethod: shippingMethod || 'standard',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get supplier quotes',
      });
    }
  }
);
