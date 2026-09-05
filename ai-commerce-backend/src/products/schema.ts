export const canonicalProductSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "description",
    "brand",
    "category",
    "productType",
    "tags",
    "identifiers",
    "attributes",
    "price",
    "availability",
    "inventory",
    "images",
    "variants"
  ],
  properties: {
    id: {
      type: "string"
    },

    name: {
      type: "string"
    },

    description: {
      type: ["string", "null"]
    },

    brand: {
      type: ["string", "null"]
    },

    category: {
      type: ["string", "null"]
    },

    productType: {
      type: ["string", "null"]
    },

    tags: {
      type: "array",
      items: {
        type: "string"
      }
    },

    identifiers: {
      type: "object",
      required: ["sku", "gtin", "mpn"],
      properties: {
        sku: {
          type: ["string", "null"]
        },
        gtin: {
          type: ["string", "null"]
        },
        mpn: {
          type: ["string", "null"]
        }
      },
      additionalProperties: false
    },

    attributes: {
      type: "object",
      additionalProperties: {
        type: ["string", "number", "boolean", "null"]
      }
    },

    price: {
      type: "object",
      required: ["amount", "currency"],
      properties: {
        amount: {
          type: "number",
          minimum: 0
        },
        currency: {
          type: "string",
          minLength: 3
        }
      },
      additionalProperties: false
    },

    availability: {
      type: "string",
      enum: ["InStock", "OutOfStock", "Unknown"]
    },

    inventory: {
      type: ["number", "null"],
      minimum: 0
    },

    images: {
      type: "array",
      items: {
        type: "string"
      }
    },

    variants: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "sku", "title", "options"],
        properties: {
          id: {
            type: "string"
          },
          sku: {
            type: ["string", "null"]
          },
          title: {
            type: "string"
          },
          options: {
            type: "object",
            additionalProperties: {
              type: "string"
            }
          }
        },
        additionalProperties: false
      }
    }
  },

  additionalProperties: false
} as const;