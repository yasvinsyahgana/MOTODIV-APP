# API Documentation — Quick Guide

## 1) What API is this

A Node.js (Express) REST API for an e-commerce/service app named MotoDiv. It covers authentication, products (with image uploads), carts, orders and payments, services (layanan), reviews (ulasan), and user profiles.

## 2) What its function is

- Authenticate users and maintain session-based login
- Manage product catalog with image upload/storage
- Let users manage carts and place orders, with payment step
- Manage service offerings (layanan)
- Allow customers to create/read product reviews
- Read and update user profile data

## 3) How it functions

- Base URL: http://localhost:3000
- Auth: httpOnly session cookies (frontend must send withCredentials)
- Database: MySQL via `mysql2`
- Sessions: `express-mysql-session`
- File uploads: `middleware/uploadMiddleware.js`; images are uploaded to Appwrite via `services/appwriteServices.js` and accessible through stored URLs
- Access control: public endpoints (product browsing), authenticated endpoints (cart, orders, posting reviews), admin-only for create/update/delete on protected resources

## 4) How to use it

- From a browser app, configure your HTTP client to send cookies.
- Use `application/json` for normal requests; use `multipart/form-data` for endpoints that send files (e.g., create/update product).

Axios setup example:
```
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});
```

## 5) Examples of each use

Authentication
- Login
```
await api.post('/auth/login', { email: 'user@example.com', password: 'secret' });
```
- Check Session
```
await api.get('/auth/check-session');
```
- Register
```
await api.post('/auth/register', { nama: 'Budi', email: 'budi@example.com', password: 'secret', no_hp: '08123' });
```
- Logout
```
await api.post('/auth/logout');
```

Products (React-Admin compatible)
- List products (supports sort/range/filter)
```
// Example: first page (0-24), sort by nama ASC
await api.get('/products', {
  params: {
    sort: JSON.stringify(["nama","ASC"]),
    range: JSON.stringify([0,24]),
    filter: JSON.stringify({ q: "ban" })
  }
});
// Note: server returns header `Content-Range: products start-end/total`
// CORS exposes this header via `exposedHeaders: ['Content-Range']`
```
- Product detail
```
await api.get('/products/1');
```
- Create product (admin, with image). Response returns full object with `id`.
```
const data = new FormData();
data.append('nama', 'Ban Premium');
data.append('harga', 150000);
data.append('stok', 10);
data.append('gambar', fileInput.files[0]);
await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' }});
// -> { id, nama, kategori, deskripsi, harga, stok, gambar: [url,...] }
```
- Update product (admin). Response returns updated object with `id`.
```
const data2 = new FormData();
data2.append('nama', 'Ban Premium X');
await api.patch('/products/1', data2, { headers: { 'Content-Type': 'multipart/form-data' }});
// -> { id, nama, deskripsi, harga, stok, gambar }
```
- Delete product (admin). Response returns `{ id }`.
```
await api.delete('/products/1');
// -> { id: 1 }
```

Cart (requires login)
- Get cart
```
await api.get('/cart');
```
- Add item
```
await api.post('/cart/items', { id_produk: 1, qty: 2 });
```
- Update item qty
```
await api.patch('/cart/items/10', { qty: 5 });
```
- Remove item
```
await api.delete('/cart/items/10');
```

Orders (requires login)
- Checkout
```
await api.post('/orders');
```
- Pay order
```
await api.post('/orders/123/payments', { method: 'QRIS', amount: 50000 });
```
- Order detail
```
await api.get('/orders/123');
```
- Admin: list all orders (React-Admin compatible, returns `Content-Range`)
```
await api.get('/orders', {
  params: {
    sort: JSON.stringify(["created_at","DESC"]),
    range: JSON.stringify([0,24]),
    filter: JSON.stringify({
      // Supported filters:
      // q: search by customer name/email or order id
      // status or status_pesanan: e.g. 'pending', 'diproses', 'selesai'
      // id or id_pesanan: number or array of numbers
      // created_at_gte / created_at_lte (or createdAt_gte / createdAt_lte): ISO date strings
      status: 'pending',
      createdAt_gte: '2025-01-01',
      createdAt_lte: '2025-12-31'
    })
  }
});
// Note: server returns header `Content-Range: orders start-end/total`
// and exposes it via CORS so the frontend can read it
```
- Admin: update status
```
await api.post('/orders/123/status', { status: 'diproses' });
```

Analytics (admin only)
```
// Dashboard counters
await api.get('/analytics/orders/counters', { params: { lastDays: 7 } });
// -> { last7DaysOrders, pendingOrders, windowDays }

// Monthly sales buckets
await api.get('/analytics/sales/by-month', {
  params: { from: '2025-01-01', to: '2025-12-31' }
});
// -> { buckets: [{ period: 'YYYY-MM', total }], from, to }
```

Services (Layanan)
- List
```
await api.get('/layanan');
```
- Admin: create
```
await api.post('/layanan', { nama_layanan: 'Ganti Oli', harga: 75000 });
```
- Admin: delete
```
await api.delete('/layanan/5');
```

Reviews (Ulasan)
- Get for a product
```
await api.get('/ulasan/produk/1');
```
- Create review (customer)
```
await api.post('/ulasan', { id_produk: 1, rating: 5, komentar: 'Mantap!' });
```

User Profile
- Get profile
```
await api.get('/users/1');
```
- Update own profile
```
await api.patch('/users/update/1', { nama: 'Budi Update', password: 'newpass' });
```

---

## Notes for React-Admin integration

- Data Provider: You can use `ra-data-simple-rest` pointing to the API base URL (`/`).
- Requirements satisfied by this API:
  - GET_LIST at `GET /products?sort=["field","ASC"]&range=[start,end]&filter={}` with `Content-Range` header.
  - GET_LIST at `GET /orders?sort=["field","ASC|DESC"]&range=[start,end]&filter={}` with `Content-Range` header.
    - Supported filters: `q`, `status`/`status_pesanan`, `id`/`id_pesanan` (number or array),
      `created_at_gte`/`created_at_lte` or `createdAt_gte`/`createdAt_lte` (ISO date).
  - GET_ONE at `GET /products/:id` returns object with `id`.
  - GET_ONE at `GET /orders/:id` returns order with items and optional payment.
  - CREATE returns created object with `id`.
  - UPDATE returns updated object with `id`.
  - DELETE returns `{ id }`.
- Auth: this API uses session cookies. Ensure your React app performs requests with `credentials: 'include'`.
- File upload: send `multipart/form-data` for product create/update; images are uploaded to Appwrite and URLs are stored in DB.

Additional notes
- CORS is configured to expose the `Content-Range` header so admin UIs can read totals.
- Analytics endpoints are protected by `authReq` + `adminReq` middleware; ensure the logged-in user has role `admin`.
