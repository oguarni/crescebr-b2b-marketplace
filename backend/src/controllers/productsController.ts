import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { productsService, ProductFilters } from '../services/productsService';
import path from 'path';

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
        cb(null, 'uploads/');
      },
      filename: (
        req: Request,
        file: { fieldname: string; originalname: string; mimetype: string },
        cb: (error: Error | null, filename: string) => void
      ) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    });

    const upload = multer({
      storage: storage,
      fileFilter: (
        req: Request,
        file: { fieldname: string; originalname: string; mimetype: string },
        cb: (error: Error | null, acceptFile: boolean) => void
      ) => {
        if (
          file.mimetype === 'text/csv' ||
          path.extname(file.originalname).toLowerCase() === '.csv'
        ) {
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

      try {
        const { skipErrors = true, batchSize = 100 } = req.body;
        const result = await CSVImporter.importProductsFromCSV(req.file.path, {
          batchSize: parseInt(batchSize) || 100,
          skipErrors: skipErrors !== 'false',
          supplierId: req.user!.id,
        });

        const fs = require('fs');
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

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
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Import failed',
        });
      }
    });
  }
);

export const generateSampleCSV = asyncHandler(async (req: Request, res: Response) => {
  const { CSVImporter } = require('../utils/csvImporter');
  const sampleFilePath = path.join('uploads', `sample-products-${Date.now()}.csv`);

  try {
    CSVImporter.generateSampleCSV(sampleFilePath);
    res.download(sampleFilePath, 'sample-products.csv', err => {
      if (err) console.error('Error downloading file:', err);
      const fs = require('fs');
      if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate sample CSV',
    });
  }
});

export const getImportStats = asyncHandler(async (req: Request, res: Response) => {
  const { CSVImporter } = require('../utils/csvImporter');
  try {
    const stats = await CSVImporter.getImportStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get import statistics',
    });
  }
});
