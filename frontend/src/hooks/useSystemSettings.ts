import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { SystemSettingsRecord } from '@shared/types';
import { settingsService } from '../services/settingsService';
import { useT } from '../contexts/LanguageContext';
import { getErrorMessage } from '../utils/errorHandler';
import type { SettingsIssue } from '../utils/systemSettingsRules';
import {
  isSettingsFormDirty,
  toFieldErrors,
  toSettingsForm,
  validateSettingsForm,
  type SettingsFieldErrors,
  type SystemSettingsForm,
} from '../utils/systemSettingsForm';

interface UseSystemSettingsResult {
  record: SystemSettingsRecord | null;
  form: SystemSettingsForm | null;
  setForm: (next: SystemSettingsForm) => void;
  /** Problems with the current form, client-side rules first, then the server's. */
  fieldErrors: SettingsFieldErrors;
  dirty: boolean;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  /** Someone saved since this form was loaded; the admin must reload. */
  conflict: boolean;
  reload: () => Promise<void>;
  save: () => Promise<boolean>;
  discardChanges: () => void;
  restoreDefaults: () => void;
}

interface ServerDetail {
  path?: string;
  code?: SettingsIssue['code'];
  params?: Record<string, number>;
}

/** Turns the 400 body of PUT /admin/settings back into issues the form can place. */
const serverIssues = (error: unknown): SettingsIssue[] => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return [];
  const details = (error.response.data as { details?: ServerDetail[] } | undefined)?.details;
  return (details ?? [])
    .filter((detail): detail is Required<Pick<ServerDetail, 'path' | 'code'>> & ServerDetail =>
      Boolean(detail.path && detail.code)
    )
    .map(({ path, code, params }) => ({ path, code, params }));
};

/**
 * State for the admin settings screen: the saved record, an editable copy of
 * it, and the save cycle with its optimistic-concurrency check.
 *
 * The form is validated on every change with the same rules the API applies,
 * so the save button can stay disabled instead of round-tripping a 400.
 *
 * @example
 * const { form, setForm, fieldErrors, save } = useSystemSettings();
 */
export const useSystemSettings = (): UseSystemSettingsResult => {
  const t = useT();
  const [record, setRecord] = useState<SystemSettingsRecord | null>(null);
  const [form, setFormState] = useState<SystemSettingsForm | null>(null);
  const [serverErrors, setServerErrors] = useState<SettingsFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await settingsService.getAdminSettings();
      setRecord(loaded);
      setFormState(toSettingsForm(loaded.settings));
      setServerErrors({});
      setConflict(false);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setForm = useCallback((next: SystemSettingsForm) => {
    setFormState(next);
    // A server complaint is about the values that were sent; editing moves on.
    setServerErrors({});
  }, []);

  const validation = useMemo(() => (form ? validateSettingsForm(form) : null), [form]);

  const fieldErrors = useMemo<SettingsFieldErrors>(
    () => ({ ...serverErrors, ...(validation && !validation.valid ? validation.errors : {}) }),
    [serverErrors, validation]
  );

  const dirty = Boolean(form && record && isSettingsFormDirty(form, record.settings));

  const save = useCallback(async (): Promise<boolean> => {
    if (!record || !validation?.valid) return false;
    setSaving(true);
    try {
      const saved = await settingsService.updateAdminSettings(validation.settings, record.version);
      setRecord(saved);
      setFormState(toSettingsForm(saved.settings));
      setServerErrors({});
      toast.success(t('adminSettings.saved'));
      return true;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        setConflict(true);
      } else {
        const issues = serverIssues(error);
        if (issues.length > 0) setServerErrors(toFieldErrors(issues));
        toast.error(
          issues.length > 0 ? t('adminSettings.invalidSummary') : t('adminSettings.saveError')
        );
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [record, validation, t]);

  const discardChanges = useCallback(() => {
    if (record) setForm(toSettingsForm(record.settings));
  }, [record, setForm]);

  const restoreDefaults = useCallback(() => {
    if (record) setForm(toSettingsForm(record.defaults));
  }, [record, setForm]);

  return {
    record,
    form,
    setForm,
    fieldErrors,
    dirty,
    loading,
    loadError,
    saving,
    conflict,
    reload,
    save,
    discardChanges,
    restoreDefaults,
  };
};
