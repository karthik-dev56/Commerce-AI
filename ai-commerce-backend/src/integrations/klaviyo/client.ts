const KLAVIYO_API_URL = "https://a.klaviyo.com/api/events";
const KLAVIYO_REVISION = "2026-07-15";

export interface KlaviyoCartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface AbandonedCartInput {
  email: string;
  cartId: string;
  items: KlaviyoCartItem[];
  total: number;
  currency: string;
  uniqueId: string;
}

export async function trackAbandonedCart(
  input: AbandonedCartInput
) {
  const apiKey = process.env.KLAVIYO_API_KEY;

  if (!apiKey) {
    throw new Error("KLAVIYO_NOT_CONFIGURED");
  }

  const metricName =
    process.env.KLAVIYO_METRIC_NAME?.trim() || "Abandoned Cart";

  const response = await fetch(KLAVIYO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/vnd.api+json",
      Revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          properties: {
            cart_id: input.cartId,
            total: input.total,
            currency: input.currency,
            items: input.items,
            unique_id: input.uniqueId,
        },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: metricName,
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: input.email,
              },
            },
          },
        },
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `KLAVIYO_API_ERROR_${response.status}: ${responseText}`
    );
  }

  return {
    accepted: true,
    status: response.status,
  };
}