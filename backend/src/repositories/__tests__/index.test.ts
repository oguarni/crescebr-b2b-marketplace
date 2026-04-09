import * as repositories from '../index';

describe('Repositories Index', () => {
  it('should re-export quotationRepository', () => {
    expect(repositories.quotationRepository).toBeDefined();
    expect(typeof repositories.quotationRepository).toBe('object');
    expect(typeof repositories.quotationRepository.findById).toBe('function');
    expect(typeof repositories.quotationRepository.findByIdWithItems).toBe('function');
    expect(typeof repositories.quotationRepository.findByIdWithItemsAndUser).toBe('function');
    expect(typeof repositories.quotationRepository.findAllForCompany).toBe('function');
    expect(typeof repositories.quotationRepository.findAll).toBe('function');
    expect(typeof repositories.quotationRepository.create).toBe('function');
    expect(typeof repositories.quotationRepository.update).toBe('function');
  });

  it('should re-export productRepository', () => {
    expect(repositories.productRepository).toBeDefined();
    expect(typeof repositories.productRepository).toBe('object');
    expect(typeof repositories.productRepository.findById).toBe('function');
    expect(typeof repositories.productRepository.findByIdWithSupplier).toBe('function');
    expect(typeof repositories.productRepository.findAllActive).toBe('function');
    expect(typeof repositories.productRepository.findBySupplier).toBe('function');
    expect(typeof repositories.productRepository.findByIds).toBe('function');
  });
});
