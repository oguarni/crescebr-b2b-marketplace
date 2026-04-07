import { Sequelize } from 'sequelize';

// Mock database for tests
export const mockSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

// Mock the database config to use our test database
jest.mock('../config/database', () => mockSequelize);

// Mock Redis client
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(3600),
    keys: jest.fn().mockResolvedValue([]),
    pipeline: jest.fn(() => ({
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    quit: jest.fn().mockResolvedValue('OK'),
  })),
  closeRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

// Mock JWT token utilities
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
  generateToken: jest.fn(),
}));

// Mock external API calls
jest.mock('axios');

// Setup test database
beforeAll(async () => {
  // Initialize test database
  await mockSequelize.authenticate();
});

afterAll(async () => {
  // Clean up test database
  await mockSequelize.close();
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  role: 'buyer',
  companyName: 'Test Company',
  status: 'approved',
  ...overrides,
});

global.createMockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 100.0,
  imageUrl: 'https://example.com/image.jpg',
  category: 'Test Category',
  supplierId: 1,
  ...overrides,
});

global.createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  companyId: 1,
  quotationId: 1,
  totalAmount: 100.0,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

global.createMockQuotation = (overrides = {}) => ({
  id: 1,
  companyId: 1,
  status: 'processed',
  totalAmount: 100.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

declare global {
  var createMockUser: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  var createMockProduct: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  var createMockOrder: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  var createMockQuotation: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}
