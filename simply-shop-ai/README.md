# Smart Shop

Build the CUSTOMER-FACING frontend for my AI-native commerce platform.

IMPORTANT:

This is NOT an AI-themed dashboard.

Do NOT make it look like ChatGPT, an AI chatbot, developer tool, futuristic AI platform, or SaaS analytics dashboard.

The UI must look like a clean, modern, production-ready e-commerce website similar in quality and simplicity to premium Indian/global shopping websites.

TECH STACK:

- React + TypeScript

- Tailwind CSS

- shadcn/ui where useful

- Responsive desktop + mobile

- Clean component architecture

- Production-friendly code

- API-ready architecture

BACKEND CONTEXT:

The commerce backend is already built with Medusa.

The frontend will later communicate with my backend API, which will connect to:

- Medusa for products, inventory, carts and orders

- Gemini for natural-language shopping intent

- Amazon Personalize for product ranking

- Razorpay for payments

Do NOT build a fake backend.

Do NOT create a second commerce backend.

Do NOT hardcode business logic into the frontend.

For now, create realistic API service abstractions/mock API adapters so the frontend can easily be connected to my real backend later.

==================================================

1. OVERALL DESIGN

==================================================

Design language:

- Minimal

- Clean

- Premium

- Professional

- Commerce-first

- Plenty of whitespace

- Strong typography

- Subtle borders

- Subtle shadows

- Neutral background

- One restrained accent color

- Consistent spacing

- High-quality product cards

- No excessive gradients

- No neon colors

- No glowing effects

- No glassmorphism

- No animated AI particles

- No robot icons

- No futuristic illustrations

- No “AI-powered” badges everywhere

The customer should feel like they are shopping on a serious production e-commerce platform.

Use a simple visual hierarchy.

==================================================

2. MAIN NAVIGATION

==================================================

Create a clean top navigation:

Logo:

"CommerceAI"

Navigation:

- Home

- Products

- Categories

Right side:

- Search

- Orders

- Account

- Cart

Keep the header compact and professional.

Desktop:

- Sticky header

- Clean navigation

- Search field/button

- Cart item count

Mobile:

- Compact header

- Menu

- Search

- Cart

==================================================

3. HOMEPAGE

==================================================

Create a professional e-commerce homepage.

Sections:

Hero:

"Find the right product for you."

Supporting text:

"Shop smarter with personalized recommendations based on what you need."

Primary CTA:

"Shop Products"

Secondary CTA:

"Explore Categories"

Do NOT make the hero look like an AI landing page.

Below hero:

Popular Categories

Cards:

- Electronics

- Accessories

- Home Appliances

- Furniture

- Fashion

Then:

"Recommended for you"

Display clean product cards.

Then:

"Popular Products"

Then:

"Complete your setup"

Show related products/cross-sell style cards.

==================================================

4. PRODUCT LISTING

==================================================

Create a production-quality product listing page.

Features:

- Search

- Category filter

- Price range

- Availability filter

- Sort by:

  - Relevance

  - Price low to high

  - Price high to low

  - Popular

- Product grid

Product card should contain:

- Product image

- Brand

- Product name

- Short description

- Rating

- Price

- Availability

- Add to Cart button

- Wishlist icon

Keep cards clean and compact.

No unnecessary AI labels.

==================================================

5. PRODUCT DETAIL PAGE

==================================================

Create a high-quality product detail page.

Layout:

Left:

- Large product image

- Thumbnail images

Right:

- Brand

- Product name

- Rating

- Price

- Availability

- Variant selection

- Quantity

- Add to Cart

- Buy Now

Below:

Product description

Specifications

Shipping information

Availability

Related products

"Frequently bought together"

The recommendation sections should look like normal commerce recommendations.

Do NOT label them with things like:

"AI Recommendation"

"Powered by AI"

"AI Generated"

==================================================

6. NATURAL-LANGUAGE SHOPPING

==================================================

The platform needs a shopping assistant, but it must NOT dominate the UI.

Add a simple shopping search/input experience.

Example placeholder:

"What are you looking for?"

Users can type:

"Gaming laptop under ₹80,000"

"Headphones for office calls"

"Monitor under ₹20,000"

"Complete my gaming setup"

When submitted, show normal product results.

The interaction should feel like an advanced shopping search experience rather than a chatbot.

IMPORTANT:

Do NOT create a large ChatGPT-style chat interface.

Instead:

User query

      ↓

Product results

      ↓

Relevant recommendations

Optionally provide a small contextual conversation panel only when necessary.

==================================================

7. SMART PRODUCT RESULTS

==================================================

When a user searches naturally, show:

"Results for: Gaming laptop under ₹80,000"

Then product cards.

Above results, optionally show a very small explanation:

"Showing products that match your budget and gaming requirements."

Keep explanations concise.

Do not expose internal AI reasoning.

Never show chain-of-thought.

==================================================

8. PRODUCT COMPARISON

==================================================

Allow users to compare products.

Create a clean comparison view:

Product

Price

Display

Processor

Graphics

Memory

Storage

Rating

Availability

Highlight differences clearly.

CTA:

"Add to Cart"

==================================================

9. CART

==================================================

Create a clean shopping cart.

Show:

- Product

- Variant

- Quantity

- Price

- Remove

- Subtotal

- Delivery estimate

- Total

Primary CTA:

"Proceed to Checkout"

Also show relevant complementary products below:

"You may also need"

This is where contextual cross-selling can appear naturally.

==================================================

10. CHECKOUT

==================================================

Create a simple production-style checkout.

Steps:

1. Delivery

2. Order Review

3. Payment

Delivery:

- Name

- Phone

- Address

- City

- State

- Pincode

Order review:

- Products

- Quantity

- Price

- Shipping

- Total

Payment:

Prepare the UI for Razorpay integration.

Do NOT implement fake payment processing.

Create a clean payment integration abstraction that can later connect to the backend/Razorpay.

==================================================

11. CUSTOMER CONSENT

==================================================

For agent-assisted purchases, include a clear confirmation before any money action.

Example:

"You're about to place this order"

Product:

Acer Nitro V Gaming Laptop

Total:

₹69,990

Button:

"Confirm and Pay"

Secondary:

"Cancel"

The user must explicitly approve the purchase.

Do NOT allow the frontend to silently trigger payment.

==================================================

12. PAYMENT SUCCESS

==================================================

Create a clean order success page.

Show:

"Order confirmed"

Order ID

Items

Total paid

Estimated delivery

Buttons:

"View Order"

"Continue Shopping"

==================================================

13. PAYMENT FAILURE

==================================================

Create a professional failure state.

Example:

"Payment couldn't be completed"

"Your order has not been confirmed."

Buttons:

"Try Payment Again"

"Return to Cart"

Do not expose technical errors.

==================================================

14. ORDERS

==================================================

Create an Orders page.

Show:

Order ID

Date

Items

Total

Status

Statuses:

- Processing

- Confirmed

- Shipped

- Delivered

- Payment Failed

- Cancelled

Create an Order Detail page.

==================================================

15. ACCOUNT

==================================================

Create a simple customer account page.

Sections:

Profile

Addresses

Orders

Preferences

Keep it minimal.

==================================================

16. RESPONSIVE DESIGN

==================================================

The website must work extremely well on:

- Desktop

- Laptop

- Tablet

- Mobile

Mobile commerce experience is important.

Product grids should automatically adapt.

Checkout should be especially clean on mobile.

==================================================

17. API ARCHITECTURE

==================================================

Create a clean frontend API layer.

Example structure:

src/

  components/

  pages/

  layouts/

  hooks/

  services/

    api/

      products.ts

      cart.ts

      orders.ts

      recommendations.ts

      checkout.ts

      customer.ts

  types/

  utils/

Create interfaces/types for:

Product

ProductVariant

Inventory

Cart

CartItem

Order

Customer

Recommendation

Checkout

Do not tightly couple UI components to API implementation.

The backend API base URL must come from environment configuration.

Example:

VITE_API_BASE_URL

Do not put secret keys in the frontend.

==================================================

18. DATA FLOW

==================================================

The intended architecture is:

Customer

   ↓

Lovable Frontend

   ↓

Our Backend API

   ↓

Commerce Adapter

   ↓

Medusa

For intelligent shopping:

Customer Query

   ↓

Backend

   ↓

Gemini

   ↓

Product Retrieval

   ↓

Recommendation Engine

   ↓

Frontend

For payment:

Frontend

   ↓

Backend

   ↓

Razorpay

   ↓

Payment Result

   ↓

Frontend

The frontend must NOT directly contain:

- Razorpay secret keys

- Medusa secret keys

- AWS credentials

- Gemini API keys

- Personalize credentials

==================================================

19. MOCK DATA

==================================================

Until the backend API is connected, use realistic demo data matching the Medusa catalog.

Products include:

Acer Nitro V Gaming Laptop

Lenovo LOQ 15 Gaming Laptop

ASUS TUF Gaming F15 Laptop

Logitech G304 Wireless Gaming Mouse

Samsung 27-inch 4K UHD Monitor

HP 24-inch Full HD Monitor

Logitech K380 Wireless Keyboard

Philips 4.1L Digital Air Fryer

Sony WH-CH720N Wireless Headphones

Samsung Galaxy Tab S9 FE

Apple AirPods 4

IKEA Markus Office Chair

IKEA LACK Study Desk

IKEA KALLAX Storage Shelf

Nike Air Max Running Shoes

Levi's 511 Slim Fit Jeans

Adidas Essentials Hoodie

boAt Stone 350 Bluetooth Speaker

Xiaomi 43-inch 4K Smart TV

Philips 55-inch 4K Smart TV

Use INR pricing.

Do not create fake AI recommendations.

Keep recommendation data behind an API/service abstraction.

==================================================

20. IMPORTANT UX PRINCIPLE

==================================================

This product should look like:

A REAL E-COMMERCE WEBSITE

with intelligent shopping capabilities.

NOT:

An AI chatbot

An AI dashboard

A developer platform

A futuristic AI demo

A SaaS analytics dashboard

The intelligence should be mostly invisible.

The user should simply feel:

"I told it what I need, and it found the right products."

==================================================

21. CODE QUALITY

==================================================

Use:

- Reusable components

- Strong TypeScript types

- Clean folder structure

- Accessible buttons/forms

- Loading states

- Empty states

- Error states

- Skeleton loaders

- Responsive layouts

- Form validation

- Proper API error handling

Avoid:

- duplicated components

- huge monolithic files

- hardcoded business logic

- hardcoded payment logic

- secrets in frontend

- unnecessary dependencies

- unnecessary animations

Make the result easy for another developer to connect to the real backend APIs.

==================================================

FINAL REQUIREMENT

==================================================

Build the complete frontend experience first.

Prioritize:

1. Clean production UI

2. Excellent shopping UX

3. Product discovery

4. Natural-language product search

5. Recommendations

6. Cart

7. Checkout

8. Consent

9. Payment states

10. Orders

Keep the visual design SIMPLE.

The AI should be an invisible intelligence layer behind the shopping experience, not the visual identity of the product.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://simply-shop-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5ef37d18-419c-4e74-a73c-51826c70f47b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
