import { Op } from 'sequelize';
import Product from '../models/Product';

export interface ProductFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  minPrice?: string;
  maxPrice?: string;
  minMoq?: string;
  maxMoq?: string;
  maxLeadTime?: string;
  availability?: string | string[];
  specifications?: string;
  sortBy?: string;
  sortOrder?: string;
  facets?: string;
}

export interface ProductsResult {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets?: Record<string, unknown>;
  searchMeta: {
    sortBy: string;
    sortOrder: string;
    filters: Record<string, unknown>;
  };
}

const VALID_SORT_FIELDS = [
  'createdAt',
  'name',
  'price',
  'category',
  'minimumOrderQuantity',
  'leadTime',
];
const VALID_SORT_ORDERS = ['ASC', 'DESC'];

function buildWhereClause(filters: ProductFilters): any {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    minMoq,
    maxMoq,
    maxLeadTime,
    availability,
    specifications,
  } = filters;
  const where: any = {};

  if (category && typeof category === 'string') {
    where.category = { [Op.like]: `%${category}%` };
  }

  if (search && typeof search === 'string') {
    const searchTerms = search
      .toLowerCase()
      .split(' ')
      .filter(term => term.length > 0);
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { category: { [Op.like]: `%${search}%` } },
      { specifications: { [Op.like]: `%${search}%` } },
    ];

    if (searchTerms.length > 1) {
      searchTerms.forEach(term => {
        where[Op.or].push(
          { name: { [Op.like]: `%${term}%` } },
          { description: { [Op.like]: `%${term}%` } }
        );
      });
    }
  }

  if (minPrice) {
    where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
  }
  if (maxPrice) {
    where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };
  }

  if (minMoq) {
    where.minimumOrderQuantity = { ...where.minimumOrderQuantity, [Op.gte]: parseInt(minMoq) };
  }
  if (maxMoq) {
    where.minimumOrderQuantity = { ...where.minimumOrderQuantity, [Op.lte]: parseInt(maxMoq) };
  }

  if (maxLeadTime) {
    where.leadTime = { [Op.lte]: parseInt(maxLeadTime) };
  }

  if (availability) {
    const availabilityArray = Array.isArray(availability) ? availability : [availability];
    where.availability = { [Op.in]: availabilityArray };
  }

  if (specifications && typeof specifications === 'string') {
    try {
      const specsFilter = JSON.parse(specifications);
      const specConditions: any[] = [];

      Object.entries(specsFilter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          specConditions.push({ [Op.or]: value.map(val => ({ [`specifications.${key}`]: val })) });
        } else if (
          typeof value === 'object' &&
          value !== null &&
          ('min' in value || 'max' in value)
        ) {
          const rangeCondition: any = {};
          if ('min' in value) rangeCondition[Op.gte] = (value as any).min;
          if ('max' in value) rangeCondition[Op.lte] = (value as any).max;
          specConditions.push({ [`specifications.${key}`]: rangeCondition });
        } else {
          specConditions.push({ [`specifications.${key}`]: value });
        }
      });

      if (specConditions.length > 0) {
        where[Op.and] = [...(where[Op.and] || []), ...specConditions];
      }
    } catch (error) {
      console.error('Error parsing specifications filter:', error);
    }
  }

  return where;
}

async function buildFacets(where: any): Promise<Record<string, unknown>> {
  const [categoryFacets, availabilityFacets, priceRanges] = await Promise.all([
    Product.findAll({
      attributes: ['category', [Product.sequelize!.fn('COUNT', '*'), 'count']],
      where,
      group: ['category'],
      order: [['category', 'ASC']],
    }),
    Product.findAll({
      attributes: ['availability', [Product.sequelize!.fn('COUNT', '*'), 'count']],
      where,
      group: ['availability'],
      order: [['availability', 'ASC']],
    }),
    Product.findAll({
      attributes: [
        [Product.sequelize!.fn('MIN', Product.sequelize!.col('price')), 'minPrice'],
        [Product.sequelize!.fn('MAX', Product.sequelize!.col('price')), 'maxPrice'],
        [Product.sequelize!.fn('AVG', Product.sequelize!.col('price')), 'avgPrice'],
      ],
      where,
    }),
  ]);

  return {
    categories: categoryFacets.map((item: any) => ({
      value: item.category,
      count: parseInt(item.getDataValue('count')),
    })),
    availability: availabilityFacets.map((item: any) => ({
      value: item.availability,
      count: parseInt(item.getDataValue('count')),
    })),
    priceRange: priceRanges[0]
      ? {
          min: parseFloat((priceRanges[0] as any).dataValues?.minPrice) || 0,
          max: parseFloat((priceRanges[0] as any).dataValues?.maxPrice) || 0,
          avg: parseFloat((priceRanges[0] as any).dataValues?.avgPrice) || 0,
        }
      : null,
  };
}

export const productsService = {
  async getAll(filters: ProductFilters): Promise<ProductsResult> {
    const {
      category,
      search,
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      minMoq,
      maxMoq,
      maxLeadTime,
      availability,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      facets = 'false',
    } = filters;

    const offset = (Number(page) - 1) * Number(limit);
    const where = buildWhereClause(filters);

    const sortField = VALID_SORT_FIELDS.includes(sortBy as string)
      ? (sortBy as string)
      : 'createdAt';
    const order = VALID_SORT_ORDERS.includes(sortOrder as string) ? (sortOrder as string) : 'DESC';

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [[sortField, order]],
    });

    const facetData = facets === 'true' ? await buildFacets(where) : undefined;

    return {
      products,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
      facets: facetData,
      searchMeta: {
        sortBy: sortField,
        sortOrder: order,
        filters: {
          category: category || null,
          search: search || null,
          priceRange: { min: minPrice || null, max: maxPrice || null },
          moqRange: { min: minMoq || null, max: maxMoq || null },
          maxLeadTime: maxLeadTime || null,
          availability: availability || null,
          hasSpecifications: !!filters.specifications,
        },
      },
    };
  },

  async getById(id: number): Promise<Product | null> {
    return Product.findByPk(id);
  },

  async create(data: {
    name: string;
    description: string;
    price: string | number;
    imageUrl: string;
    category: string;
    supplierId: number;
    specifications?: string;
    minimumOrderQuantity?: number;
  }): Promise<Product> {
    return Product.create({
      name: data.name,
      description: data.description,
      price: parseFloat(String(data.price)),
      imageUrl: data.imageUrl,
      category: data.category,
      supplierId: data.supplierId,
      specifications: (data.specifications || null) as any,
      unitPrice: parseFloat(String(data.price)),
      minimumOrderQuantity: data.minimumOrderQuantity || 1,
    });
  },

  async update(
    product: Product,
    data: {
      name: string;
      description: string;
      price: string | number;
      imageUrl: string;
      category: string;
      specifications?: string;
      minimumOrderQuantity?: number;
    }
  ): Promise<Product> {
    await product.update({
      name: data.name,
      description: data.description,
      price: parseFloat(String(data.price)),
      imageUrl: data.imageUrl,
      category: data.category,
      specifications: (data.specifications !== undefined
        ? data.specifications
        : product.specifications) as any,
      unitPrice: parseFloat(String(data.price)),
      minimumOrderQuantity:
        data.minimumOrderQuantity !== undefined
          ? data.minimumOrderQuantity
          : product.minimumOrderQuantity,
    });
    return product;
  },

  async delete(product: Product): Promise<void> {
    await product.destroy();
  },

  async getCategories(): Promise<string[]> {
    const categories = await Product.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']],
    });
    return categories.map(item => item.category);
  },

  async getAvailableSpecifications(): Promise<Record<string, string[]>> {
    const products = await Product.findAll({ attributes: ['specifications'] });
    const allSpecs: Record<string, Set<string>> = {};

    products.forEach(product => {
      if (product.specifications && typeof product.specifications === 'object') {
        Object.entries(product.specifications).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (!allSpecs[key]) allSpecs[key] = new Set();
            allSpecs[key].add(String(value));
          }
        });
      }
    });

    const result: Record<string, string[]> = {};
    Object.entries(allSpecs).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet).sort();
    });
    return result;
  },
};
