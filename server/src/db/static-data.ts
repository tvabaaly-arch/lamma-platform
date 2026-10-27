/*
 * Pristine copy of the web app's demo catalogue, taken at import time (before the API replaces
 * the shared arrays with database rows). Used only for seeding.
 */
import { CATALOG, MERCHANTS, CATEGORIES } from '../../../src/data/catalog'

export const STATIC_PRODUCTS = structuredClone(CATALOG)
export const STATIC_MERCHANTS = structuredClone(MERCHANTS)
export const STATIC_CATEGORIES = structuredClone(CATEGORIES)
