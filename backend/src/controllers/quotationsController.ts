import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { quotationService } from '../services/quotation.service';
import { QuoteService } from '../services/quoteService';

// Customer endpoints
export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const quotation = await quotationService.validateAndCreate({
    items: req.body.items,
    companyId: req.user!.id,
  });

  res.status(201).json({
    success: true,
    message: 'Quotation created successfully',
    data: quotation,
  });
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

// Supplier endpoint - returns only quotations that include the supplier's products
export const getSupplierQuotations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const quotations = await quotationService.getForSupplier(req.user!.id);

    res.status(200).json({
      success: true,
      data: quotations,
    });
  }
);

export const getQuotationById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;

  const quotation = await quotationService.getById(parseInt(id), req.user!.id, req.user!.role);

  res.status(200).json({
    success: true,
    data: quotation,
  });
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

  // Suppliers are restricted to quotations that include their products; admins
  // may update any quotation. Role is enforced upstream by requireRole.
  const updatedQuotation =
    req.user!.role === 'supplier'
      ? await quotationService.updateBySupplier(parseInt(id), req.user!.id, {
          status,
          adminNotes,
        })
      : await quotationService.updateByAdmin(parseInt(id), {
          status,
          adminNotes,
        });

  res.status(200).json({
    success: true,
    message: 'Quotation updated successfully',
    data: updatedQuotation,
  });
});

export const calculateQuote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { items, buyerLocation, supplierLocation, shippingMethod } = req.body;

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
});

export const getQuotationCalculations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const companyId = req.user!.id;
    const userRole = req.user!.role;

    // Authorize before computing or returning anything. Scoping only
    // `customer` let any authenticated supplier read any quotation's items and
    // full pricing breakdown, including competitors' quotations.
    await quotationService.getById(parseInt(id), companyId, userRole);

    const result = await QuoteService.getQuotationWithCalculations(parseInt(id));
    const formattedResponse = QuoteService.formatQuoteResponse(result.calculations);

    res.status(200).json({
      success: true,
      data: {
        quotation: result.quotation,
        ...formattedResponse,
        calculations: result.calculations,
      },
    });
  }
);

export const processQuotationWithCalculations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;

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
  }
);

export const getMultipleSupplierQuotes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { productId, quantity, buyerLocation, supplierIds, shippingMethod } = req.body;

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
  }
);
