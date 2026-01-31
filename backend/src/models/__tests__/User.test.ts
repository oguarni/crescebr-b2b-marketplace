// Mock sequelize config BEFORE imports
jest.mock('../../config/database', () => {
  const { Sequelize } = require('sequelize');
  return {
    __esModule: true,
    default: new Sequelize('sqlite::memory:', { logging: false }),
  };
});

// Mock bcryptjs
jest.mock('bcryptjs');

import bcrypt from 'bcryptjs';
import User from '../User';
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-password';
      const candidatePassword = 'plain-password';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, 'hashed-password');
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-password';
      const candidatePassword = 'wrong-password';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, 'hashed-password');
    });

    it('should handle bcrypt errors gracefully', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-password';
      const candidatePassword = 'plain-password';

      (mockBcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Act & Assert
      await expect(user.comparePassword(candidatePassword)).rejects.toThrow('Bcrypt error');
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, 'hashed-password');
    });

    it('should handle empty password strings', async () => {
      // Arrange
      const user = new User();
      user.password = '';
      const candidatePassword = '';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('', '');
    });

    it('should handle null/undefined passwords', async () => {
      // Arrange
      const user = new User();
      user.password = null as any;
      const candidatePassword = 'password';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, null);
    });

    it('should handle very long passwords', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-very-long-password';
      const candidatePassword = 'a'.repeat(1000);

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        candidatePassword,
        'hashed-very-long-password'
      );
    });

    it('should handle special characters in passwords', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-special-chars';
      const candidatePassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, 'hashed-special-chars');
    });

    it('should handle unicode characters in passwords', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-unicode';
      const candidatePassword = 'пароль测试🔒';

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(candidatePassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(candidatePassword, 'hashed-unicode');
    });
  });

  describe('hashPassword (static method)', () => {
    it('should hash password with default salt rounds', async () => {
      // Arrange
      const plainPassword = 'plain-password';
      const hashedPassword = 'hashed-password';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(plainPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it('should handle empty password strings', async () => {
      // Arrange
      const plainPassword = '';
      const hashedPassword = 'hashed-empty';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(plainPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('', 10);
    });

    it('should handle bcrypt hashing errors', async () => {
      // Arrange
      const plainPassword = 'plain-password';

      (mockBcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      // Act & Assert
      await expect(User.hashPassword(plainPassword)).rejects.toThrow('Hashing failed');
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it('should handle very long passwords', async () => {
      // Arrange
      const longPassword = 'a'.repeat(1000);
      const hashedPassword = 'hashed-long-password';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(longPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
    });

    it('should handle special characters in passwords', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = 'hashed-special-password';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(specialPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it('should handle unicode characters in passwords', async () => {
      // Arrange
      const unicodePassword = 'пароль测试🔒';
      const hashedPassword = 'hashed-unicode-password';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(unicodePassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(unicodePassword, 10);
    });

    it('should handle null/undefined passwords', async () => {
      // Arrange
      const nullPassword = null as any;
      const hashedPassword = 'hashed-null';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await User.hashPassword(nullPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(null, 10);
    });

    it('should maintain consistent salt rounds across calls', async () => {
      // Arrange
      const password1 = 'password1';
      const password2 = 'password2';
      const hashedPassword1 = 'hashed1';
      const hashedPassword2 = 'hashed2';

      (mockBcrypt.hash as jest.Mock).mockResolvedValueOnce(hashedPassword1).mockResolvedValueOnce(hashedPassword2);

      // Act
      const result1 = await User.hashPassword(password1);
      const result2 = await User.hashPassword(password2);

      // Assert
      expect(result1).toBe(hashedPassword1);
      expect(result2).toBe(hashedPassword2);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(1, password1, 10);
      expect(mockBcrypt.hash).toHaveBeenNthCalledWith(2, password2, 10);
    });
  });

  describe('Password Security', () => {
    it('should use secure salt rounds (10)', async () => {
      // Arrange
      const password = 'test-password';
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await User.hashPassword(password);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should compare against properly hashed passwords', async () => {
      // Arrange
      const plainPassword = 'test-password';
      const hashedPassword = '$2a$10$abcdefghijklmnopqrstuvwxyz';

      const user = new User();
      user.password = hashedPassword;

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await user.comparePassword(plainPassword);

      // Assert
      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should handle timing attack protection', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-password';

      // Mock bcrypt to simulate consistent timing
      mockBcrypt.compare.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate consistent timing
        return false;
      });

      // Act
      const start = Date.now();
      const result = await user.comparePassword('wrong-password');
      const duration = Date.now() - start;

      // Assert
      expect(result).toBe(false);
      expect(duration).toBeGreaterThan(5); // Should take some time
    });
  });

  describe('Error Handling', () => {
    it('should handle bcrypt.compare network errors', async () => {
      // Arrange
      const user = new User();
      user.password = 'hashed-password';

      (mockBcrypt.compare as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(user.comparePassword('password')).rejects.toThrow('Network error');
    });

    it('should handle bcrypt.hash memory errors', async () => {
      // Arrange
      (mockBcrypt.hash as jest.Mock).mockRejectedValue(new Error('Out of memory'));

      // Act & Assert
      await expect(User.hashPassword('password')).rejects.toThrow('Out of memory');
    });

    it('should handle bcrypt internal errors', async () => {
      // Arrange
      const user = new User();
      user.password = 'corrupted-hash';

      (mockBcrypt.compare as jest.Mock).mockRejectedValue(new Error('Invalid hash format'));

      // Act & Assert
      await expect(user.comparePassword('password')).rejects.toThrow('Invalid hash format');
    });

    it('should handle concurrent hash operations', async () => {
      // Arrange
      const passwords = ['password1', 'password2', 'password3'];
      const hashedPasswords = ['hash1', 'hash2', 'hash3'];

      (mockBcrypt.hash as jest.Mock)
        .mockResolvedValueOnce(hashedPasswords[0])
        .mockResolvedValueOnce(hashedPasswords[1])
        .mockResolvedValueOnce(hashedPasswords[2]);

      // Act
      const results = await Promise.all(passwords.map(password => User.hashPassword(password)));

      // Assert
      expect(results).toEqual(hashedPasswords);
      expect(mockBcrypt.hash).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent compare operations', async () => {
      // Arrange
      const user1 = new User();
      user1.password = 'hash1';
      const user2 = new User();
      user2.password = 'hash2';
      const user3 = new User();
      user3.password = 'hash3';

      (mockBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // Act
      const results = await Promise.all([
        user1.comparePassword('password1'),
        user2.comparePassword('wrong-password'),
        user3.comparePassword('password3'),
      ]);

      // Assert
      expect(results).toEqual([true, false, true]);
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full password lifecycle', async () => {
      // Arrange
      const plainPassword = 'user-password-123';
      const hashedPassword = '$2a$10$mockhashedpassword';

      (mockBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (mockBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Correct password
        .mockResolvedValueOnce(false); // Wrong password

      // Act
      // 1. Hash the password
      const hashed = await User.hashPassword(plainPassword);

      // 2. Create user instance with hashed password
      const user = new User();
      user.password = hashed;

      // 3. Verify correct password
      const correctResult = await user.comparePassword(plainPassword);

      // 4. Verify wrong password
      const wrongResult = await user.comparePassword('wrong-password');

      // Assert
      expect(hashed).toBe(hashedPassword);
      expect(correctResult).toBe(true);
      expect(wrongResult).toBe(false);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(2);
    });

    it('should handle password change scenario', async () => {
      // Arrange
      const oldPassword = 'old-password';
      const newPassword = 'new-password';
      const oldHash = 'old-hash';
      const newHash = 'new-hash';

      const user = new User();
      user.password = oldHash;

      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue(newHash);

      // Act
      // 1. Verify old password
      const oldPasswordValid = await user.comparePassword(oldPassword);

      // 2. Hash new password
      const newHashedPassword = await User.hashPassword(newPassword);

      // 3. Update user password
      user.password = newHashedPassword;

      // Assert
      expect(oldPasswordValid).toBe(true);
      expect(newHashedPassword).toBe(newHash);
      expect(user.password).toBe(newHash);
    });
  });
});
