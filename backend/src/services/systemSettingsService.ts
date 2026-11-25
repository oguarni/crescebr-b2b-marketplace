import { UniqueConstraintError } from 'sequelize';
import SystemSettings, { SYSTEM_SETTINGS_ROW_ID } from '../models/SystemSettings';
import User from '../models/User';
import sequelize from '../config/database';
import { logger } from '../utils/structuredLogger';
import type { SystemSettingsRecord, SystemSettings as SettingsValues } from '../types';
import {
  DEFAULT_SYSTEM_SETTINGS,
  describeSettingsIssue,
  validateSystemSettings,
  type SettingsIssue,
} from './systemSettingsRules';

/** Raised when an update was based on a version someone else has since replaced. */
export const SETTINGS_VERSION_CONFLICT = 'SETTINGS_VERSION_CONFLICT';

const httpError = (message: string, statusCode: number, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const versionConflict = () =>
  httpError('System settings were changed by someone else', 409, {
    code: SETTINGS_VERSION_CONFLICT,
  });

const toValues = (row: SystemSettings): SettingsValues => ({
  taxRate: Number(row.taxRate),
  quotationValidityDays: row.quotationValidityDays,
  shippingMethods: row.shippingMethods,
  pricingTiers: row.pricingTiers,
});

/**
 * A stored row is re-checked before anything is priced with it. A value that
 * reached the table some other way (a manual SQL edit, a bad restore) stops
 * quoting with a logged error instead of silently mispricing every quote.
 */
const readStoredValues = (row: SystemSettings): SettingsValues => {
  const result = validateSystemSettings(toValues(row));
  if (!result.valid) {
    logger.error('Stored system settings are invalid', {
      issues: result.issues.map(issue => `${issue.path}: ${describeSettingsIssue(issue)}`),
    });
    throw httpError('System settings are invalid', 500);
  }
  return result.settings;
};

const changedFields = (before: SettingsValues, after: SettingsValues): string[] =>
  (Object.keys(after) as Array<keyof SettingsValues>).filter(
    key => JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );

const toRecord = async (row: SystemSettings | null): Promise<SystemSettingsRecord> => {
  if (!row) {
    return {
      settings: DEFAULT_SYSTEM_SETTINGS,
      defaults: DEFAULT_SYSTEM_SETTINGS,
      version: 0,
      updatedAt: null,
      updatedBy: null,
    };
  }

  const editor = row.updatedBy
    ? await User.findByPk(row.updatedBy, { attributes: ['id', 'email', 'companyName'] })
    : null;

  return {
    settings: readStoredValues(row),
    defaults: DEFAULT_SYSTEM_SETTINGS,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: editor
      ? { id: editor.id, email: editor.email, companyName: editor.companyName }
      : null,
  };
};

export const systemSettingsService = {
  /**
   * The values quotes and delivery estimates are computed with.
   *
   * A database without the settings row (one migrated before the row existed,
   * or a test database built by `sync`) prices with the defaults, which are the
   * constants this feature replaced.
   */
  async getSettings(): Promise<SettingsValues> {
    const row = await SystemSettings.findByPk(SYSTEM_SETTINGS_ROW_ID);
    return row ? readStoredValues(row) : DEFAULT_SYSTEM_SETTINGS;
  },

  /** The settings plus who last changed them, for the admin screen. */
  async getRecord(): Promise<SystemSettingsRecord> {
    return toRecord(await SystemSettings.findByPk(SYSTEM_SETTINGS_ROW_ID));
  },

  /**
   * Replaces the settings, provided nobody saved since `expectedVersion` was read.
   *
   * The version check and the write are one conditional UPDATE, so two admins
   * saving at once cannot both win: the second gets a 409 and has to reload,
   * instead of silently overwriting the first.
   *
   * @throws 400 with `issues` when the document is invalid
   * @throws 409 with code SETTINGS_VERSION_CONFLICT when the row moved on
   */
  async update(
    input: unknown,
    expectedVersion: number,
    adminId: number
  ): Promise<SystemSettingsRecord> {
    const result = validateSystemSettings(input);
    if (!result.valid) {
      throw httpError('Invalid system settings', 400, { issues: result.issues });
    }
    const next = result.settings;

    const saved = await sequelize.transaction(async transaction => {
      const current = await SystemSettings.findByPk(SYSTEM_SETTINGS_ROW_ID, { transaction });
      const currentVersion = current ? current.version : 0;

      if (currentVersion !== expectedVersion) {
        throw versionConflict();
      }

      if (!current) {
        try {
          const created = await SystemSettings.create(
            { id: SYSTEM_SETTINGS_ROW_ID, ...next, version: 1, updatedBy: adminId },
            { transaction }
          );
          logger.info('System settings updated', {
            adminId,
            version: 1,
            changed: Object.keys(next),
          });
          return created;
        } catch (error) {
          // Two first saves raced and the other one inserted the row.
          if (error instanceof UniqueConstraintError) throw versionConflict();
          throw error;
        }
      }

      const [affected] = await SystemSettings.update(
        { ...next, version: expectedVersion + 1, updatedBy: adminId },
        { where: { id: SYSTEM_SETTINGS_ROW_ID, version: expectedVersion }, transaction }
      );
      if (affected !== 1) {
        throw versionConflict();
      }

      logger.info('System settings updated', {
        adminId,
        version: expectedVersion + 1,
        changed: changedFields(toValues(current), next),
      });

      return SystemSettings.findByPk(SYSTEM_SETTINGS_ROW_ID, { transaction });
    });

    return toRecord(saved);
  },
};

export type { SettingsIssue };
