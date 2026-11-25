import type { ApiResponse, SystemSettings, SystemSettingsRecord } from '@shared/types';
import { apiService } from './api';

/**
 * The admin-editable commercial parameters (tax, freight, quotation validity,
 * default volume discounts) and the public read of them.
 */
export const settingsService = {
  /** Settings plus version and last editor. Administrators only. */
  async getAdminSettings(): Promise<SystemSettingsRecord> {
    const response = await apiService.get<ApiResponse<SystemSettingsRecord>>('/admin/settings', {
      handlesErrors: true,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load system settings');
    }
    return response.data;
  },

  /**
   * Saves a full settings document. `version` must be the one last read: the
   * API answers 409 when someone saved in between, and 400 with one detail per
   * invalid field.
   */
  async updateAdminSettings(
    settings: SystemSettings,
    version: number
  ): Promise<SystemSettingsRecord> {
    // The screen explains a 400 per field and a 409 as a conflict, in Portuguese.
    const response = await apiService.put<ApiResponse<SystemSettingsRecord>>(
      '/admin/settings',
      { settings, version },
      { handlesErrors: true }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save system settings');
    }
    return response.data;
  },

  /** The terms every buyer is quoted with. Public. */
  async getPricingPolicy(): Promise<SystemSettings> {
    // Optional extra on product pages: a failure must not raise a toast.
    const response = await apiService.get<ApiResponse<SystemSettings>>('/settings/pricing', {
      handlesErrors: true,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load the pricing policy');
    }
    return response.data;
  },
};
