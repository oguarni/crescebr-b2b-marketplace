/**
 * The short order number shown to people: the first eight characters of the
 * order's UUID, upper-cased, e.g. `#B7E3C2A9`. Enough to tell orders apart on a
 * screen and to read one out over the phone; the full ID stays in the URL.
 *
 * @example formatOrderNumber('b7e3c2a9-4f1d-4c8e-9a2b-1d5e6f7a8b9c'); // '#B7E3C2A9'
 */
export const formatOrderNumber = (id: string): string => `#${id.slice(0, 8).toUpperCase()}`;
