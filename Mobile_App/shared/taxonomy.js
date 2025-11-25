// Centralized taxonomy definitions shared between the API and client apps.
// Keep this module dependency-free so it can be imported from any Node or RN environment.

export const TAXONOMY_VERSION = '2025-11-25';

export const PRODUCT_CATEGORIES = [
  { value: 'marble', label: 'Marble', description: 'Calcite-based slabs for premium interior and exterior work.' },
  { value: 'granite', label: 'Granite', description: 'Hard, durable stone suited for countertops and high-traffic floors.' },
  { value: 'limestone', label: 'Limestone', description: 'Sedimentary stone with muted tones for architectural facades.' },
  { value: 'travertine', label: 'Travertine', description: 'Porous stone ideal for outdoor and rustic aesthetics.' },
  { value: 'onyx', label: 'Onyx', description: 'Translucent luxury stone for feature walls and lighting.' },
  { value: 'quartz', label: 'Quartz / Engineered', description: 'Engineered slabs with predictable colors and textures.' },
  { value: 'other', label: 'Other Natural Stone', description: 'Slate, sandstone, and any specialty materials not listed above.' }
];

export const PRODUCT_UNITS = [
  { value: 'pieces', label: 'Pieces', shortLabel: 'pcs' },
  { value: 'tons', label: 'Tons', shortLabel: 't' },
  { value: 'cubic_meters', label: 'Cubic Meters', shortLabel: 'm3' },
  { value: 'square_meters', label: 'Square Meters', shortLabel: 'm2' },
  { value: 'kg', label: 'Kilograms', shortLabel: 'kg' },
  { value: 'lbs', label: 'Pounds', shortLabel: 'lbs' }
];

export const PRODUCT_FINISHES = [
  { value: 'polished', label: 'Polished' },
  { value: 'honed', label: 'Honed' },
  { value: 'brushed', label: 'Brushed' },
  { value: 'leathered', label: 'Leathered' },
  { value: 'natural', label: 'Natural / Split-face' }
];

export const PRODUCT_GRADE_LEVELS = [
  { value: 'premium', label: 'Premium Export' },
  { value: 'standard', label: 'Standard Commercial' },
  { value: 'commercial', label: 'Economy / Utility' }
];

export const REQUIREMENT_UNITS = [
  { value: 'tons', label: 'Tons' },
  { value: 'sqft', label: 'Square Feet' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'bags', label: 'Bags' },
  { value: 'units', label: 'Units' }
];

export const REQUIREMENT_TAG_SUGGESTIONS = [
  'flooring',
  'countertop',
  'facade',
  'bookmatched',
  'export quality',
  'custom cut',
  'outdoor',
  'interior'
];

export const DEFAULT_PRODUCT_CATEGORY = PRODUCT_CATEGORIES[0].value;
export const DEFAULT_PRODUCT_UNIT = PRODUCT_UNITS[0].value;
export const DEFAULT_REQUIREMENT_UNIT = REQUIREMENT_UNITS[0].value;

export const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map((category) => category.value);
export const PRODUCT_UNIT_VALUES = PRODUCT_UNITS.map((unit) => unit.value);
export const PRODUCT_FINISH_VALUES = PRODUCT_FINISHES.map((finish) => finish.value);
export const PRODUCT_GRADE_VALUES = PRODUCT_GRADE_LEVELS.map((grade) => grade.value);
export const REQUIREMENT_UNIT_VALUES = REQUIREMENT_UNITS.map((unit) => unit.value);

export default {
  version: TAXONOMY_VERSION,
  categories: PRODUCT_CATEGORIES,
  units: PRODUCT_UNITS,
  finishes: PRODUCT_FINISHES,
  grades: PRODUCT_GRADE_LEVELS,
  requirementUnits: REQUIREMENT_UNITS,
  requirementTags: REQUIREMENT_TAG_SUGGESTIONS,
  defaults: {
    category: DEFAULT_PRODUCT_CATEGORY,
    unit: DEFAULT_PRODUCT_UNIT,
    requirementUnit: DEFAULT_REQUIREMENT_UNIT
  }
};
