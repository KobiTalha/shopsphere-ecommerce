# 🛒 ShopSphere BD

Modern full-stack e-commerce website built using HTML, CSS, JavaScript and Node.js.

## 🚀 Features
- Product listing
- Add to cart system
- Coupon system (SAVE200)
- Delivery charge (Dhaka / outside)
- Checkout form with validation

## 🛠 Tech Stack
- Frontend: HTML, CSS, JS
- Backend: Node.js (Express)

## 🔌 API Endpoints
- `GET /api/health`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/cart`
- `POST /api/cart`
- `PATCH /api/cart/:productId`
- `DELETE /api/cart/:productId`
- `DELETE /api/cart`
- `POST /api/checkout`

## 📁 Project Structure
- `frontend/` static storefront assets
- `backend/server.js` Express API and static file serving
- `backend/data/products.json` seeded product catalog
- `backend/data/cart.json` persisted cart state for the demo

## ▶️ Run Locally
```bash
cd backend
npm install
npm start
```

Open: http://localhost:3000
