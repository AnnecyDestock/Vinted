# Card Vault Market

A mobile-friendly card catalogue, reservation cart, Vinted message generator, and administrator dashboard. It is designed for a free one-month Render trial using a free web service and free PostgreSQL database.

## Features

- Username-based customer sessions
- Searchable live inventory grouped by country
- Standard, shiny, and special card pricing
- Automatic quantity discounts and minimum-order rule
- Persistent customer carts
- Transaction-safe stock reservation
- Copyable Vinted order messages
- Customer order history banner
- Password-protected admin dashboard
- Inventory editing and bulk additions
- Paid/cancelled order workflow with stock restoration
- Responsive original Card Vault design

## Deploy to Render

1. Create a new GitHub repository and upload this project.
2. Sign in to [Render](https://dashboard.render.com/).
3. Choose **New → Blueprint** and connect the repository.
4. Render reads `render.yaml` and proposes a free web service and free PostgreSQL database.
5. Enter secret values when prompted:
   - `ADMIN_PASSWORD`: a strong, unique password.
   - `SELLER_USERNAME`: your Vinted username.
6. Apply the Blueprint and wait for both resources to become available.
7. Open the generated `card-vault-market.onrender.com` address.

Customer login accepts any simple username. To open the administrator dashboard, enter `admin` as the username; the password field appears automatically.

> The free Render PostgreSQL database expires after 30 days. Upgrade or export the data before that date if you want to keep using the application.

## Customize

Render environment variables control the shop name, seller username, and administrator login:

- `SHOP_NAME`
- `SELLER_USERNAME`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Initial countries and quantities are defined in `server.js`. Prices and discount thresholds appear in both `server.js` and `public/app.js`; the server calculation is authoritative.

## Local development

Create a PostgreSQL database, copy `.env.example` to `.env`, update `DATABASE_URL`, then run:

```text
npm install
npm run dev
```

Open `http://localhost:4000`.
