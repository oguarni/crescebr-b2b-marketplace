import { useEffect, useState } from 'react';
import type { SystemSettings } from '@shared/types';
import { settingsService } from '../services/settingsService';
import { browserLogger } from '../utils/browserLogger';

/**
 * The public pricing policy (tax, freight, default volume tiers), or null while
 * it loads or if it cannot be read. Callers treat null as "nothing extra to
 * show", never as a reason to block the page.
 */
export const usePricingPolicy = (): SystemSettings | null => {
  const [policy, setPolicy] = useState<SystemSettings | null>(null);

  useEffect(() => {
    let active = true;
    settingsService
      .getPricingPolicy()
      .then(loaded => {
        if (active) setPolicy(loaded);
      })
      .catch(error => browserLogger.warn('Pricing policy unavailable', { error }));
    return () => {
      active = false;
    };
  }, []);

  return policy;
};
