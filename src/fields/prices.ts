import type { Field } from 'payload'

/** Manual prices per supported currency — never auto-converted for product pricing. */
export const currencyPricesField = (name = 'prices', label = 'Prices'): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      name: 'usd',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        step: 0.01,
        description: 'USD price (manual)',
      },
    },
    {
      name: 'irt',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        step: 1,
        description: 'IRT (Toman) price (manual)',
      },
    },
  ],
})

export const optionalCurrencyPricesField = (
  name = 'compareAtPrices',
  label = 'Compare-at prices',
): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      name: 'usd',
      type: 'number',
      min: 0,
      admin: { step: 0.01 },
    },
    {
      name: 'irt',
      type: 'number',
      min: 0,
      admin: { step: 1 },
    },
  ],
})
