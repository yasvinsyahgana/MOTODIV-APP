# **Dokumentasi API & Panduan Integrasi Frontend (MotoDiv)**

Dokumentasi ini mencakup daftar endpoint API yang tersedia serta panduan cara mengintegrasikannya ke dalam aplikasi Frontend (React/Vue/dll) menggunakan Axios.

## **📋 Informasi Dasar**

* **Base URL:** http://localhost:3000
* **Content-Type:** application/json (Kecuali upload file menggunakan multipart/form-data)
* **Authentication:** Session Cookies (httpOnly).
* **Syarat Frontend:** Wajib menyertakan withCredentials: true pada setiap request.
* **Akses Gambar:** http://localhost:3000/uploads/<nama\_file\>

## **🔌 Daftar API Endpoints**

### **1\. Authentication (/auth)**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| POST | /auth/login | { "email": "...", "password": "..." } | Login user & set session cookie |
| POST | /auth/register | { "nama": "...", "email": "...", "password": "...", "no\_hp": "..." } | Registrasi user baru |
| GET | /auth/check-session | \- | Cek status login (dipanggil saat load app) |
| POST | /auth/logout | \- | Hapus session & logout |

### **2\. Produk (/products)**

| Method | Endpoint | Deskripsi | Catatan |
| :---- | :---- | :---- | :---- |
| GET | /products/search | Ambil semua produk | Public |
| GET | /products/search/:id | Detail produk | Public |
| POST | /products | Tambah produk | **Admin Only**. Gunakan **FormData** (bukan JSON) untuk upload gambar. |
| PATCH | /products/:id | Update produk | **Admin Only**. Gunakan **FormData**. |
| DELETE | /products/:id | Hapus produk | **Admin Only**. |

### **3\. Keranjang (/cart) \- Wajib Login**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| GET | /cart | \- | Lihat isi keranjang user |
| POST | /cart/items | { "id\_produk": 1, "qty": 2 } | Tambah item (qty diakumulasi jika ada) |
| PATCH | /cart/items/:id | { "qty": 5 } | Ubah jumlah item tertentu |
| DELETE | /cart/items/:id | \- | Hapus item dari keranjang |

### **4\. Pesanan (/orders) \- Wajib Login**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| POST | /orders | \- | Checkout (Ubah keranjang jadi pesanan) |
| POST | /orders/:id/payments | { "method": "QRIS", "amount": 50000 } | Bayar pesanan. Method: QRIS, VA, DANA |
| GET | /orders/get/:id | \- | Detail pesanan |
| GET | /orders | \- | **Admin Only**. Semua history pesanan |
| POST | /orders/:id/status | { "status": "diproses" } | **Admin Only**. Update status (pending, diproses, selesai) |

### **5\. Layanan (/layanan)**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| GET | /layanan | \- | List semua layanan |
| POST | /layanan | { "nama\_layanan": "...", ... } | **Admin Only**. Tambah layanan |
| DELETE | /layanan/:id | \- | **Admin Only**. Hapus layanan |

### **6\. Ulasan (/ulasan)**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| GET | /ulasan/produk/:id | \- | Lihat ulasan per produk |
| POST | /ulasan | { "id\_produk": 1, "rating": 5, "komentar": "..." } | **Customer**. Tambah ulasan |

### **7\. User Profile (/users)**

| Method | Endpoint | Body (JSON) | Deskripsi |
| :---- | :---- | :---- | :---- |
| GET | /users/:id | \- | Lihat profil |
| PATCH | /users/update/:id | { "nama": "...", "password": "..." } | Edit profil sendiri |

## **💻 Panduan Integrasi Frontend**

Gunakan kode berikut sebagai referensi service API menggunakan library **Axios**.

### **1\. Setup Axios (Wajib)**

Setting withCredentials: true sangat krusial agar cookie session tersimpan di browser.  
````
import axios from 'axios';

const api \= axios.create({  
baseURL: 'http://localhost:3000', // Sesuaikan dengan port backend  
withCredentials: true, // PENTING: Agar session cookie terbaca  
headers: {  
'Content-Type': 'application/json'  
}  
});
````
### **2\. Authentication Service**

Gunakan service ini untuk Login, Register, dan pengecekan sesi saat aplikasi dimuat.  
````
export const AuthService \= {  
login: async (email, password) \=\> {  
const res \= await api.post('/auth/login', { email, password });  
return res.data;  
},  
register: async (userData) \=\> {  
// userData: { nama, email, password, no\_hp }  
const res \= await api.post('/auth/register', userData);  
return res.data;  
},  
checkSession: async () \=\> {  
try {  
// Panggil ini di useEffect App.js  
const res \= await api.get('/auth/check-session');  
return res.data; // { loggedIn: true, user: ... }  
} catch (error) {  
return { loggedIn: false };  
}  
},  
logout: async () \=\> {  
await api.post('/auth/logout');  
window.location.href \= '/login';  
}  
};
````
### **3\. Product Service (Upload Gambar)**

Khusus untuk upload produk, gunakan FormData agar file gambar terkirim dengan benar.  
````
export const ProductService \= {  
getAll: async () \=\> {  
const res \= await api.get('/products/search');  
return res.data;  
},

    // CREATE PRODUCT (ADMIN)  
    create: async (formData) \=\> {  
        // Contoh penggunaan di component:  
        // const data \= new FormData();  
        // data.append('nama', 'Ban');  
        // data.append('gambar', fileInput.files\[0\]);  
          
        // Header 'Content-Type' akan otomatis diatur oleh axios  
        const res \= await api.post('/products', formData, {  
            headers: { 'Content-Type': 'multipart/form-data' }  
        });  
        return res.data;  
    },

    delete: async (id) \=\> {  
        return await api.delete(\`/products/${id}\`);  
    }  
};
````
### **4\. Helper URL Gambar**

Gunakan fungsi helper sederhana ini untuk menampilkan gambar di \<img\>.  
````
export const getImageUrl \= (filename) \=\> {  
if (\!filename) return '/placeholder.jpg'; // Gambar cadangan  
return \`http://localhost:3000/uploads/${filename}\`;  
};

// Contoh di JSX:  
// \<img src={getImageUrl(item.gambar\[0\])} alt="Produk" /\>  
````
