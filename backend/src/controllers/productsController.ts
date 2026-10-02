import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { productsService, ProductFilters } from '../services/productsService';
import path from 'path';
import { logger } from '../utils/structuredLogger';

// Browsers and spreadsheet tools disagree on the CSV media type, so the
// allowlist covers the values legitimate clients actually send. It stays an
// allowlist: anything outside it is rejected rather than sniffed.
const ALLOWED_CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'text/comma-separated-values',
];

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await productsService.getAll(req.query as unknown as ProductFilters);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getById(Number(req.params.id));

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  res.status(200).json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await productsService.create({
    ...req.body,
    supplierId: req.user!.id,
  });

  res.status(201).json({ success: true, message: 'Product created successfully', data: product });
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await productsService.getById(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const updated = await productsService.update(product, req.body);
  res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const product = await productsService.getById(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  await productsService.delete(product);
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const categoryList = await productsService.getCategories();
  res.status(200).json({ success: true, data: categoryList });
});

export const getAvailableSpecifications = asyncHandler(async (req: Request, res: Response) => {
  const specs = await productsService.getAvailableSpecifications();
  res.status(200).json({ success: true, data: specs });
});

// Relative to the working directory. The backend image creates it, but a fresh
// checkout run with `npm run dev` does not have it, and neither multer's
// function-form destination nor fs.writeFileSync creates missing directories.
const UPLOAD_DIR = 'uploads';

const ensureUploadDir = (): void => {
  const fs = require('fs');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};

export const importProductsFromCSV = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const multer = require('multer');
    const { CSVImporter } = require('../utils/csvImporter');

    const storage = multer.diskStorage({
      destination: (
        req: Request,
        file: { fieldname: string; originalname: string; mimetype: string },
        cb: (error: Error | null, destination: string) => void
      ) => {
        try {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
        } catch (error) {
          cb(error as Error, UPLOAD_DIR);
        }
      },
      filename: (
        req: Request,
        file: { fieldname: string; originalname: string; mimetype: string },
        cb: (error: Error | null, filename: string) => void
      ) => {
        // The stored name is generated entirely server-side and always ends in
        // `.csv`. Deriving the extension from `file.originalname` let a caller
        // plant an arbitrary extension (.html, .js, .php) inside uploads/.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}.csv`);
      },
    });

    const upload = multer({
      storage: storage,
      fileFilter: (
        req: Request,
        file: { fieldname: string; originalname: string; mimetype: string },
        cb: (error: Error | null, acceptFile: boolean) => void
      ) => {
        // Both signals must agree. Either one alone is client-supplied and
        // trivially spoofed; the file's own content is still re-validated
        // row-by-row by CSVImporter before anything is persisted.
        const hasCsvExtension = path.extname(file.originalname).toLowerCase() === '.csv';
        const hasCsvMimeType = ALLOWED_CSV_MIME_TYPES.includes(file.mimetype);

        if (hasCsvExtension && hasCsvMimeType) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
      // Bound not just file size but also the number of files/fields and the
      // size of any non-file form fields, so a single request cannot exhaust
      // memory or smuggle extra uploads past the single-file expectation.
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
        fields: 10,
        fieldSize: 1024 * 100, // 100 KB per text field (e.g. batchSize)
      },
    }).single('csvFile');

    upload(req, res, async (err: Error) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message || 'File upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No CSV file provided' });
      }

      const uploadedFilePath = req.file.path;

      try {
        const { skipErrors = true, batchSize = 100 } = req.body;
        const result = await CSVImporter.importProductsFromCSV(uploadedFilePath, {
          batchSize: parseInt(batchSize) || 100,
          skipErrors: skipErrors !== 'false',
          supplierId: req.user!.id,
        });

        res.status(200).json({
          success: result.success,
          message: `Import completed. ${result.imported} products imported, ${result.failed} failed.`,
          data: {
            imported: result.imported,
            failed: result.failed,
            errors: result.errors.slice(0, 10),
            totalErrors: result.errors.length,
          },
        });
      } catch (error) {
        // Same policy as errorHandler: the cause goes to the server log, and the
        // caller gets a generic message instead of driver or file-system text.
        logger.error('CSV import failed', { error });
        res.status(500).json({ success: false, error: 'Import failed' });
      } finally {
        // The upload is only an input to this request, so it must not outlive
        // it, whether the import succeeded or threw.
        removeUploadedFile(uploadedFilePath);
      }
    });
  }
);

// Runs after the response has been sent and nothing awaits the multer
// callback, so a failure here is logged rather than thrown.
const removeUploadedFile = (filePath: string): void => {
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    logger.error('Failed to remove uploaded CSV', { error });
  }
};

export const generateSampleCSV = asyncHandler(async (req: Request, res: Response) => {
  const { CSVImporter } = require('../utils/csvImporter');
  const sampleFilePath = path.join(UPLOAD_DIR, `sample-products-${Date.now()}.csv`);

  try {
    ensureUploadDir();
    CSVImporter.generateSampleCSV(sampleFilePath);
    res.download(sampleFilePath, 'sample-products.csv', err => {
      if (err) logger.error('Failed to download file', { error: err });
      const fs = require('fs');
      if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);
    });
  } catch (error) {
    logger.error('Failed to generate sample CSV', { error });
    res.status(500).json({ success: false, error: 'Failed to generate sample CSV' });
  }
});

export const getImportStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { CSVImporter } = require('../utils/csvImporter');
  try {
    // Admins see the whole marketplace; a supplier only ever sees its own row.
    const scopeToSupplierId = req.user!.role === 'admin' ? undefined : req.user!.id;
    const stats = await CSVImporter.getImportStats(scopeToSupplierId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get import statistics', { error });
    res.status(500).json({ success: false, error: 'Failed to get import statistics' });
  }
});
