import fs from "node:fs";
import path from "node:path";
import {
  CedarInlineAuthorizationEngine,
  type AuthorizationRequest,
  type Entity,
} from "@cedar-policy/cedar-authorization";

const policyPath = path.join(
  process.cwd(),
  "src",
  "authorization",
  "policies.cedar"
);

const schemaPath = path.join(
  process.cwd(),
  "src",
  "authorization",
  "schema.json"
);

const policies = fs.readFileSync(policyPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");

const engine = new CedarInlineAuthorizationEngine({
  staticPolicies: policies,
  schema: {
    type: "jsonString",
    schema,
  },
});

export async function authorizePaymentWithCedar(input: {
  mandateActive: boolean;
  cartMatchesMandate: boolean;
  amountWithinLimit: boolean;
}) {
  const request: AuthorizationRequest = {
    principal: {
      type: "Agent",
      id: "ai-agent",
    },
    action: {
      type: "Action",
      id: "CREATE_PAYMENT",
    },
    resource: {
      type: "Cart",
      id: "current",
    },
    context: {
      mandateActive: input.mandateActive,
      cartMatchesMandate: input.cartMatchesMandate,
      amountWithinLimit: input.amountWithinLimit,
    },
  };

  const entities: Entity[] = [
    {
      uid: {
        type: "Agent",
        id: "ai-agent",
      },
      attrs: {},
      parents: [],
    },
    {
      uid: {
        type: "Cart",
        id: "current",
      },
      attrs: {},
      parents: [],
    },
  ];

  const result = await engine.isAuthorized(request, entities);

  if (result.type === "allow") {
    return true;
  }

  return false;
}