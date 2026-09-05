# CommerceAI — Agentic Commerce & Merchant Growth Platform

> **Razorpay AI Builder Internship 2026 — AI Growth & Agentic Commerce**

CommerceAI is an AI-native commerce platform connecting **AI-assisted product discovery, real commerce infrastructure, validated recommendations, merchant-controlled growth actions, bounded payment authorization, Razorpay Test Mode checkout, auditability, and lifecycle recovery**.

> **Core principle:** AI understands intent and proposes actions; deterministic commerce systems, merchant policy, authorization, customer consent, and payment verification remain the control layers.

## Architecture

```text
CUSTOMER / AI BUYER
        ↓
      GEMINI
 Intent + Dialogue
        ↓
AGENTCORE-ORIENTED RUNTIME
        ↓
       MCP
   ┌────┴─────────┐
   ↓              ↓
COMMERCE        RAZORPAY
  MCP             TOOLS
   ↓              ↓
COMMERCE        RAZORPAY
 ADAPTER        TEST MODE
   ↓
 MEDUSA
   ├─ Products
   ├─ Inventory
   ├─ Pricing
   ├─ Carts
   └─ Orders
   ↓
 ALGOLIA
Search + Relevance + Recommendations
   ↓
 HARD CONSTRAINTS
Budget / Stock / Category / Compatibility
   ↓
 GROWTH ORCHESTRATOR
Upsell / Cross-sell / Bundle / Do Nothing
   ↓
 MERCHANT POLICY
   ↓
 CUSTOMER CONSENT
   ↓
 AP2-STYLE MANDATE
   ↓
 CEDAR
Authorization
   ↓
 RAZORPAY
Payment Execution
   ↓
SERVER-SIDE VERIFICATION
   ↓
WORKFLOW + AUDIT
   ↓
KLAVIYO
Lifecycle Recovery
```

## Problem

Traditional e-commerce expects the customer to manually search, compare, add to cart, and checkout.

Agentic commerce changes this interaction:

```text
"I need a gaming laptop under ₹1 lakh."
```

The difficult problem is not generating a recommendation. The difficult problem is connecting AI reasoning to **real inventory, pricing, carts, merchant rules, authorization, and payment execution without allowing the AI layer to become an uncontrolled financial authority**.

CommerceAI solves this through explicit separation of responsibilities.

| Responsibility | Technology |
|---|---|
| Intent and dialogue | Gemini |
| Agent/tool boundary | MCP |
| Commerce abstraction | UCP-style contract |
| Product vocabulary | Schema.org-aligned |
| Product interoperability | GS1-aligned |
| Commerce source of truth | Medusa |
| Search/relevance | Algolia |
| Growth decisions | Growth Orchestrator |
| Merchant boundaries | Merchant Growth Policy |
| Customer approval | Consent layer |
| Bounded payment authority | AP2-style mandate |
| Authorization | Cedar |
| Payment execution | Razorpay Test Mode |
| Durable state | PostgreSQL |
| Fast transient state | Redis |
| Lifecycle recovery | Klaviyo |

## What It Solves

### AI Product Discovery

Natural-language shopping requests are converted into structured intent.

```text
Customer
  ↓
Gemini
  ↓
Category + use case + budget + constraints
  ↓
Commerce/Search
```

### Validated Recommendations

Algolia finds relevant candidates, but candidates are validated against authoritative commerce data.

```text
Algolia candidate
      ↓
Medusa lookup
      ↓
Stock validation
      ↓
Budget validation
      ↓
Category validation
      ↓
Variant validation
      ↓
Validated recommendation
```

### Merchant-Controlled Growth

The system can identify:

- Upsell
- Cross-sell
- Bundle
- Do Nothing

The AI cannot silently modify the customer's purchase.

### Bounded Payment

Payment authority is limited by a short-lived mandate containing:

```text
Session
Cart
Maximum amount
Currency
Purpose
Expiration
Status
```

### Abandoned Cart Recovery

```text
Cart activity
    ↓
PostgreSQL
    ↓
Background worker
    ↓
Abandonment detection
    ↓
Klaviyo event
    ↓
Klaviyo flow
    ↓
Recovery message
```

## Core Design Separation

```text
Gemini
→ Understands intent

Algolia
→ Finds relevant candidates

Medusa
→ Provides authoritative commerce truth

Constraints
→ Determine what is valid

Growth Orchestrator
→ Determines what action to propose

Merchant Policy
→ Controls commercial boundaries

Customer Consent
→ Approves the action

AP2-style Mandate
→ Bounds payment authority

Cedar
→ Authorizes the action

Razorpay
→ Executes payment

Backend
→ Verifies payment

PostgreSQL
→ Persists durable state and audit data

Redis
→ Handles fast transient state

Klaviyo
→ Activates lifecycle recovery
```

## End-to-End Customer Flow

### 1. Intent

Customer:

> "I want a gaming laptop under ₹1 lakh."

Gemini extracts:

```text
Category: Laptop
Use case: Gaming
Budget: ₹100000
```

### 2. Discovery

```text
Gemini
 ↓
Commerce tools
 ↓
Medusa + Algolia
```

### 3. Validation

Every candidate is checked against deterministic constraints.

```text
Exists in Medusa?
In stock?
Correct category?
Within budget?
Valid purchasable variant?
```

### 4. Growth Decision

```text
Validated candidates
       ↓
Growth Orchestrator
       ↓
UPSELL / CROSS-SELL / BUNDLE / DO_NOTHING
```

### 5. Merchant Policy

Example:

```text
Upsell enabled
Cross-sell enabled
Bundle enabled
Maximum upsell increase = ₹10000
Maximum bundle discount = 10%
Customer consent required
```

### 6. Customer Consent

```text
Offer
 ↓
Customer accepts
 ↓
Cart mutation
```

### 7. Payment Mandate

A short-lived AP2-inspired mandate binds the financial action to the intended purchase.

### 8. Cedar

Authorization checks:

```text
mandateActive
cartMatchesMandate
amountWithinLimit
```

### 9. Razorpay

The backend obtains the authoritative Medusa cart total and creates the Razorpay order.

### 10. Verification

The backend verifies:

```text
razorpay_order_id
razorpay_payment_id
razorpay_signature
```

using the expected Razorpay HMAC-SHA256 verification mechanism.

### 11. Audit

Relevant events are persisted for merchant visibility and debugging.

## Technology Details

### Gemini

Gemini is responsible for:

- Natural-language intent
- Constraint extraction
- Conversational interaction
- Explaining recommendations

Gemini is **not** authoritative for:

- Inventory
- Final price
- Cart total
- Payment verification
- Authorization
- Merchant policy

### MCP

MCP provides a controlled boundary between the agent layer and external capabilities.

CommerceAI exposes capabilities such as:

```text
search_products
get_cart
create_cart
add_to_cart
create_payment_mandate
authorize_payment
```

The current implementation uses a local MCP-style boundary. It is not presented as a fully deployed managed MCP service.

### UCP-Style Commerce Contract

CommerceAI includes a UCP-style contract abstraction:

```text
discover
getCart
checkout
```

This separates the commerce interaction contract from the underlying commerce implementation.

### Schema.org

Product representations follow Schema.org-aligned product concepts.

### GS1

The architecture follows a GS1-aligned direction for standardized product identity and interoperability.

### Medusa

Medusa is the commerce source of truth for:

- Products
- Variants
- Categories
- Tags
- Pricing
- Inventory
- Customers
- Carts
- Orders

Important rule:

> **Algolia is not the commerce database.**

### Algolia

Algolia handles:

```text
Search
Relevance
Recommendation candidates
```

The recommendation pipeline is:

```text
Algolia
 ↓
Candidates
 ↓
Medusa authoritative lookup
 ↓
Hard constraints
 ↓
Validated recommendations
```

### Growth Orchestrator

The orchestrator combines:

```text
Base product
+
Relevant candidates
+
Hard constraints
+
Merchant policy
+
Growth strategy
```

Possible outcomes:

```text
UPSELL
CROSS_SELL
BUNDLE
DO_NOTHING
```

The `DO_NOTHING` path is intentional. The system does not attempt to maximize every cart.

### Merchant Growth Policy

Merchant-controlled configuration includes:

```ts
{
  upsellEnabled: true,
  crossSellEnabled: true,
  bundleEnabled: true,
  maxUpsellAmount: 10000,
  maxBundleDiscountPercent: 10,
  requireCustomerConsent: true
}
```

### AP2-Style Mandate

CommerceAI implements an **AP2-inspired local bounded-mandate layer**, not a claim of full AP2 protocol compliance.

Mandate fields include:

```text
mandateId
sessionId
cartId
maxAmount
currency
purpose
status
createdAt
expiresAt
```

Lifecycle:

```text
ACTIVE
 ├─ Payment succeeds → USED
 ├─ Timeout → EXPIRED
 └─ Invalidation → REVOKED
```

### Cedar

Cedar provides explicit authorization policy evaluation.

Conceptually:

```cedar
permit (
    principal == Agent::"ai-agent",
    action = Action::"CREATE_PAYMENT",
    resource == Cart::"current"
)
when {
    context.mandateActive == true &&
    context.cartMatchesMandate == true &&
    context.amountWithinLimit == true
};
```

### Razorpay

Razorpay is used for actual payment execution in Test Mode.

The backend creates the order using the authoritative Medusa cart amount.

The frontend is not trusted to determine the final amount or payment success.

### Payment Verification

```text
order_id|payment_id
        ↓
HMAC-SHA256
        ↓
Expected signature
        ↓
Compare with Razorpay signature
```

Only verified payments proceed to the completion workflow.

### Workflow

The current implementation provides a local workflow abstraction:

```text
STARTED
   ↓
PAYMENT_VERIFIED
   ↓
ORDER_COMPLETED
```

Failures are represented explicitly:

```text
STARTED
   ↓
FAILED
```

This is a local abstraction, not a claim of deployed AWS Step Functions.

## Abandoned Cart Recovery

The system records cart activity in PostgreSQL.

The worker checks:

```text
last_activity_at
+
checkout_completed
```

Eligible abandoned carts are converted into lifecycle events.

```text
PostgreSQL
 ↓
Background Worker
 ↓
Abandoned Cart Service
 ↓
Klaviyo Events API
 ↓
Klaviyo Flow
```

The implementation deduplicates abandoned-cart processing by cart ID.

A Klaviyo event being accepted by the API does not by itself prove:

```text
Email delivered
or
Revenue recovered
```

## Merchant Analytics

The merchant dashboard exposes growth metrics such as:

- Total offers
- Accepted offers
- Declined offers
- Failures
- Upsells
- Cross-sells
- Bundles
- Acceptance rate
- Revenue Influenced
- Klaviyo recovery events

### Revenue Influenced

The dashboard uses **Revenue Influenced**, not guaranteed incremental revenue.

```text
Offer accepted
      ≠
Proven incremental revenue
```

Reliable incremental attribution requires connecting the growth action to a completed order and measuring the actual incremental value.

## Security Model

CommerceAI uses defense in depth.

```text
AI Input
   ↓
Intent Parsing
   ↓
Commerce Validation
   ↓
Merchant Policy
   ↓
Customer Consent
   ↓
Payment Mandate
   ↓
Cedar Authorization
   ↓
Razorpay
   ↓
Server Verification
```

No single AI component is trusted to control the complete payment lifecycle.

### Examples

```text
AI recommendation
    ≠
Authoritative inventory

Algolia recommendation
    ≠
Final price

Frontend payment success
    ≠
Verified payment

Growth proposal
    ≠
Allowed growth action

Mandate
    ≠
Unlimited payment authority
```

## Failure Handling

### Invalid Recommendation

```text
Candidate
 ↓
Constraint validation fails
 ↓
Rejected
```

### Policy Rejection

```text
Growth proposal
 ↓
Merchant policy
 ↓
Blocked
 ↓
DO_NOTHING
```

### Customer Rejection

```text
Offer
 ↓
Cancel
 ↓
No purchase action
```

### Expired Mandate

```text
Mandate
 ↓
Expired
 ↓
Authorization fails
 ↓
Payment blocked
```

### Cart Mismatch

```text
Mandate for Cart A
+
Request for Cart B
 ↓
Cedar context mismatch
 ↓
Denied
```

### Payment Verification Failure

```text
Razorpay response
 ↓
Signature verification
 ↓
FAIL
 ↓
Payment not treated as verified
```

### Klaviyo Failure

```text
Abandoned cart
 ↓
Klaviyo API
 ↓
Failure
 ↓
Audit event
```

## Real-World Growth Scenarios

### Laptop Upsell

```text
Customer wants laptop under ₹1 lakh
 ↓
Gemini understands intent
 ↓
Algolia finds relevant candidates
 ↓
Medusa validates commerce truth
 ↓
Growth Orchestrator identifies upsell
 ↓
Merchant policy checks boundary
 ↓
Customer consents
 ↓
Purchase continues
```

### Laptop Cross-Sell

```text
Laptop
 ↓
Relevant accessory
 ↓
Validation
 ↓
Cross-sell policy
 ↓
Customer accepts
 ↓
Cart mutation
```

### Bundle

```text
Laptop
 +
Mouse
 +
Keyboard
 ↓
Bundle candidate
 ↓
Merchant-approved bundle constraints
```

A real production bundle discount should be connected to the commerce engine's actual promotion/discount mechanism before representing the discounted amount as the authoritative cart price.

### Do Nothing

```text
No meaningful growth opportunity
 ↓
DO_NOTHING
```

This prevents unnecessary recommendations.

## Repository Structure

```text
CommerceAI/
│
├── ai-commerce-backend/
│   ├── src/
│   │   ├── authorization/
│   │   ├── commerce/
│   │   ├── growth/
│   │   ├── integrations/
│   │   │   └── klaviyo/
│   │   ├── protocols/
│   │   ├── mcp/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/
│   ├── package.json
│   └── tsconfig.json
│
├── merchant-commerce/
│   └── apps/
│       └── backend/
│
└── simply-shop-ai/
    └── customer storefront
```

## API Capabilities

Representative routes:

```text
GET  /me

POST /interactions

POST /cart
GET  /cart/:cartId
POST /cart/:cartId/items
PATCH /cart/:cartId/items/:itemId
DELETE /cart/:cartId/items/:itemId

POST /products/:productId/validated-recommendations

POST /growth/recommend
POST /growth/offers
POST /growth/offers/:offerId/apply
POST /growth/offers/:offerId/accept
POST /growth/offers/:offerId/decline

GET  /growth/audit
GET  /growth/analytics

POST /authorization/mandate

POST /checkout/create-order
POST /checkout/verify

POST /klaviyo/abandoned-cart
```

## Local Development

### Requirements

```text
Windows 10 / 11
Node.js 24.x
PostgreSQL 18.x
Git
VS Code
```

### Start Medusa

```powershell
cd C:\Users\HOME\Desktop\projects\merchant-commerce
npm.cmd run dev
```

Medusa Admin:

```text
http://localhost:9000/app
```

### Start AI Backend

```powershell
cd C:\Users\HOME\Desktop\projects\ai-commerce-backend
npm.cmd run dev
```

Backend:

```text
http://localhost:8000
```

### Start Frontend

```powershell
cd C:\Users\HOME\Desktop\simply-shop-ai
npm.cmd run dev
```

Frontend API base:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Environment Variables

Use a local `.env` file.

```env
PORT=8000
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=...

GEMINI_API_KEY=...

MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_PUBLISHABLE_KEY=...

ALGOLIA_APP_ID=...
ALGOLIA_SEARCH_KEY=...
ALGOLIA_WRITE_KEY=...

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

KLAVIYO_API_KEY=...
KLAVIYO_METRIC_NAME=Abandoned Cart

MERCHANT_EMAIL=...
```

Never commit real credentials.

## Demo Flow

```text
1. Open storefront
        ↓
2. Sign in
        ↓
3. Search naturally
        ↓
4. Open product
        ↓
5. Generate growth recommendation
        ↓
6. Validate stock/budget/category
        ↓
7. Show merchant policy boundary
        ↓
8. Customer accepts offer
        ↓
9. Create bounded mandate
        ↓
10. Cedar authorization
        ↓
11. Create Razorpay Test Mode order
        ↓
12. Complete payment
        ↓
13. Server verifies signature
        ↓
14. Complete workflow
        ↓
15. Show merchant audit/analytics
        ↓
16. Leave another cart inactive
        ↓
17. Worker creates abandoned-cart event
        ↓
18. Klaviyo recovery flow
```

## Protocol Positioning

### MCP

The Model Context Protocol standardizes connections between AI applications and external tools/data.

https://modelcontextprotocol.io/

### UCP

Universal Commerce Protocol is an open protocol direction for agentic commerce.

CommerceAI uses a UCP-style contract abstraction.

https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/

### AP2

Agent Payments Protocol introduces concepts such as mandates and proof of intent for agent-mediated payments.

CommerceAI uses an AP2-inspired local bounded-mandate implementation.

https://developers.googleblog.com/developers-guide-to-ai-agent-protocols/

### AgentCore

AWS AgentCore provides managed infrastructure for agent and MCP workloads.

CommerceAI is **AgentCore-oriented**, but the current hackathon implementation does not claim a deployed AWS AgentCore environment.

https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html

### Schema.org

https://schema.org/Product

### GS1

https://www.gs1.org/standards

https://www.gs1.org/standards/gs1-digital-link

## Production Evolution

Current implementation:

```text
Local MCP boundary
Local authorization evaluation
Local workflow abstraction
Medusa
Algolia
PostgreSQL
Redis
Klaviyo
Razorpay Test Mode
```

Production evolution:

```text
Managed Agent Runtime
        ↓
Managed MCP infrastructure
        ↓
Commerce Services
        ↓
Managed Authorization
        ↓
Production Payment Environment
        ↓
Managed Workflow Engine
        ↓
Observability
        ↓
Fraud / Risk / Compliance
```

Potential production improvements:

- Managed agent runtime
- Production MCP deployment
- Managed workflow orchestration
- Production authorization infrastructure
- Production payment environment
- Strong idempotency
- Distributed locks
- Observability and tracing
- Fraud/risk controls
- Promotion engine integration
- Incremental revenue attribution
- Secrets management
- Rate limiting
- API gateway/WAF
- Background job infrastructure
- Retry and dead-letter handling

## Why This Architecture

The architecture deliberately separates:

```text
Reasoning
    ↓
Retrieval
    ↓
Commerce Truth
    ↓
Constraint Enforcement
    ↓
Growth Decision
    ↓
Merchant Control
    ↓
Customer Consent
    ↓
Payment Authority
    ↓
Authorization
    ↓
Payment Execution
    ↓
Verification
    ↓
Audit
    ↓
Lifecycle Recovery
```

This makes the system easier to:

- Test
- Audit
- Secure
- Extend
- Replace individual components
- Move toward production infrastructure

## References

### Protocols

- MCP — https://modelcontextprotocol.io/
- UCP — https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/
- AP2 / Agent Protocols — https://developers.googleblog.com/developers-guide-to-ai-agent-protocols/
- AgentCore MCP Runtime — https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html

### Commerce

- Medusa — https://docs.medusajs.com/
- Schema.org Product — https://schema.org/Product
- GS1 — https://www.gs1.org/standards
- GS1 Digital Link — https://www.gs1.org/standards/gs1-digital-link

### Search

- Algolia Recommend — https://www.algolia.com/doc/guides/algolia-recommend/overview

### Authorization

- Cedar — https://docs.cedarpolicy.com/

### Payments

- Razorpay Standard Checkout — https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

### Lifecycle

- Klaviyo Events API — https://developers.klaviyo.com/en/reference/events_api_overview
- Klaviyo Create Event — https://developers.klaviyo.com/en/reference/create_event

---

# Final Architecture Philosophy

> **AI should make commerce more intelligent without becoming the uncontrolled authority over commerce or money.**

```text
AI
→ understands

Search
→ discovers

Commerce backend
→ knows truth

Constraints
→ enforce validity

Growth Orchestrator
→ chooses an action

Merchant Policy
→ controls boundaries

Customer Consent
→ approves

Mandate
→ bounds payment authority

Cedar
→ authorizes

Razorpay
→ executes

Backend
→ verifies

PostgreSQL
→ records

Klaviyo
→ recovers

Analytics
→ measures
```
