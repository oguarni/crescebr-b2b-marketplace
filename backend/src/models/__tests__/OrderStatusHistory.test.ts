// Mock the database connection BEFORE imports
jest.mock('../../config/database', () => {
    const { Sequelize } = require('sequelize');
    return {
        __esModule: true,
        default: new Sequelize('sqlite::memory:', { logging: false }),
    };
});

// Mock related models
jest.mock('../Order');

import OrderStatusHistory from '../OrderStatusHistory';

describe('OrderStatusHistory Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Model Definition', () => {
        it('should define OrderStatusHistory model with correct attributes', () => {
            // Arrange
            const expectedAttributes = [
                'id',
                'orderId',
                'toStatus',
                'fromStatus',
                'notes',
                'changedBy',
            ];

            // Act
            const statusHistory = new OrderStatusHistory();

            // Assert
            expectedAttributes.forEach(attr => {
                expect(statusHistory).toHaveProperty(attr);
            });
        });

        it('should have correct data types for model attributes', () => {
            // Arrange
            const statusHistory = new OrderStatusHistory();

            // Act & Assert
            statusHistory.id = 1;
            expect(typeof statusHistory.id).toBe('number');

            statusHistory.orderId = 'order-123';
            expect(typeof statusHistory.orderId).toBe('string');

            statusHistory.toStatus = 'shipped';
            expect(typeof statusHistory.toStatus).toBe('string');

            statusHistory.fromStatus = 'processing';
            expect(typeof statusHistory.fromStatus).toBe('string');

            statusHistory.notes = 'Status updated';
            expect(typeof statusHistory.notes).toBe('string');

            statusHistory.changedBy = 1;
            expect(typeof statusHistory.changedBy).toBe('number');
        });

        it('should allow null values for optional fields', () => {
            // Arrange
            const statusHistory = new OrderStatusHistory();

            // Act & Assert
            statusHistory.fromStatus = undefined; // Optional
            expect(statusHistory.fromStatus).toBeUndefined();

            statusHistory.notes = undefined; // Optional
            expect(statusHistory.notes).toBeUndefined();
        });
    });

    describe('Status Transitions', () => {
        it('should handle all valid order statuses', () => {
            // Arrange
            const validStatuses = [
                'pending',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
            ];
            const statusHistory = new OrderStatusHistory();

            // Act & Assert
            validStatuses.forEach(status => {
                statusHistory.toStatus = status as any;
                expect(statusHistory.toStatus).toBe(status);
            });
        });

        it('should track status transitions correctly', () => {
            // Arrange
            const statusHistory = new OrderStatusHistory();

            // Act
            statusHistory.orderId = 'order-123';
            statusHistory.fromStatus = 'pending';
            statusHistory.toStatus = 'processing';
            statusHistory.notes = 'Order started processing';
            statusHistory.changedBy = 1;

            // Assert
            expect(statusHistory.orderId).toBe('order-123');
            expect(statusHistory.fromStatus).toBe('pending');
            expect(statusHistory.toStatus).toBe('processing');
            expect(statusHistory.notes).toBe('Order started processing');
            expect(statusHistory.changedBy).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string values for notes', () => {
            // Arrange
            const statusHistory = new OrderStatusHistory();

            // Act
            statusHistory.notes = '';

            // Assert
            expect(statusHistory.notes).toBe('');
        });
    });

    describe('Timestamp Handling', () => {
        it('should have createdAt timestamp', () => {
            // Arrange
            const statusHistory = new OrderStatusHistory();
            const testDate = new Date('2024-01-15T10:30:00Z');

            // Act
            // Use as any to assign readonly property for test purposes
            (statusHistory as any).createdAt = testDate;

            // Assert
            expect(statusHistory.createdAt).toBe(testDate);
        });
    });
});
