import { GoogleGenAI } from "@google/genai";
import type { ShoppingIntent } from "./schema.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function extractShoppingIntent(
  userMessage: string
): Promise<ShoppingIntent> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: `
You are a shopping intent extraction service for an Indian e-commerce
catalog.

Convert the customer's natural-language shopping request into structured JSON.

Return ONLY valid JSON.

Schema:
{
  "maxPrice": number | undefined,
  "minPrice": number | undefined,
  "category": string | undefined,
  "keywords": string[],
  "useCases": string[],
  "inStockOnly": boolean
}

Merchant catalog categories are:

- Electronics
- Accessories
- Home Appliances
- Furniture
- Fashion

IMPORTANT CATEGORY RULES:

The "category" field MUST contain only one of the exact merchant
categories above.

Examples:

"gaming laptop" → category = "Electronics"
"monitor" → category = "Electronics"
"TV" → category = "Electronics"
"tablet" → category = "Electronics"

"table" → category = "Furniture"
"desk" → category = "Furniture"
"chair" → category = "Furniture"
"shelf" → category = "Furniture"

"jeans" → category = "Fashion"
"shoes" → category = "Fashion"
"hoodie" → category = "Fashion"

"headphones" → category = "Accessories"
"keyboard" → category = "Accessories"
"mouse" → category = "Accessories"
"speaker" → category = "Accessories"

"air fryer" → category = "Home Appliances"

Do NOT put the customer's exact product type into category
when it is actually a product keyword.

For example:

"table under 7000"

must become approximately:

{
  "maxPrice": 7000,
  "category": "Furniture",
  "keywords": ["table"],
  "useCases": [],
  "inStockOnly": true
}

"gaming laptop under 75000"

must become approximately:

{
  "maxPrice": 75000,
  "category": "Electronics",
  "keywords": ["gaming", "laptop"],
  "useCases": ["gaming"],
  "inStockOnly": true
}

PRICE RULES:

- Never invent a price.
- "under", "below", "less than", "up to" → maxPrice.
- "above", "over", "more than" → minPrice.

KEYWORDS:

Extract important product types, features, technologies,
or characteristics.

Do not add unrelated words.

USE CASES:

Keep intended use separate from product type.

Examples:
"for gaming" → ["gaming"]
"for office work" → ["office"]
"for studying" → ["study"]

IMPORTANT:

- Do not choose a product.
- Do not rank products.
- Do not recommend products.
- Do not invent products.
- Do not make purchasing decisions.
- Do not enforce budget through prose.
- Return structured intent only.

Set inStockOnly to true unless the customer explicitly requests
unavailable/out-of-stock products.
`,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  return JSON.parse(text) as ShoppingIntent;
}