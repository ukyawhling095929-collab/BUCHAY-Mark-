import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("wholesale.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cost_price REAL NOT NULL,
    default_margin REAL DEFAULT 0.2
  );

  CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    region_id INTEGER,
    FOREIGN KEY (region_id) REFERENCES regions(id)
  );

  CREATE TABLE IF NOT EXISTS regional_pricing (
    product_id INTEGER,
    region_id INTEGER,
    margin_adjustment REAL DEFAULT 0,
    fixed_price REAL,
    PRIMARY KEY (product_id, region_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (region_id) REFERENCES regions(id)
  );

  CREATE TABLE IF NOT EXISTS customer_pricing (
    product_id INTEGER,
    customer_id INTEGER,
    margin_adjustment REAL DEFAULT 0,
    fixed_price REAL,
    PRIMARY KEY (product_id, customer_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  
  // Products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, cost_price, default_margin } = req.body;
    const info = db.prepare("INSERT INTO products (name, cost_price, default_margin) VALUES (?, ?, ?)").run(name, cost_price, default_margin);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, cost_price, default_margin } = req.body;
    db.prepare("UPDATE products SET name = ?, cost_price = ?, default_margin = ? WHERE id = ?").run(name, cost_price, default_margin, req.params.id);
    res.json({ success: true });
  });

  // Regions
  app.get("/api/regions", (req, res) => {
    const regions = db.prepare("SELECT * FROM regions").all();
    res.json(regions);
  });

  app.post("/api/regions", (req, res) => {
    const { name } = req.body;
    const info = db.prepare("INSERT INTO regions (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid });
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare(`
      SELECT customers.*, regions.name as region_name 
      FROM customers 
      LEFT JOIN regions ON customers.region_id = regions.id
    `).all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, region_id } = req.body;
    const info = db.prepare("INSERT INTO customers (name, region_id) VALUES (?, ?)").run(name, region_id);
    res.json({ id: info.lastInsertRowid });
  });

  // Pricing Logic
  app.get("/api/pricing/:productId", (req, res) => {
    const { productId } = req.params;
    const regional = db.prepare("SELECT * FROM regional_pricing WHERE product_id = ?").all(productId);
    const customer = db.prepare("SELECT * FROM customer_pricing WHERE product_id = ?").all(productId);
    res.json({ regional, customer });
  });

  app.post("/api/pricing/regional", (req, res) => {
    const { product_id, region_id, margin_adjustment, fixed_price } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO regional_pricing (product_id, region_id, margin_adjustment, fixed_price)
      VALUES (?, ?, ?, ?)
    `).run(product_id, region_id, margin_adjustment, fixed_price);
    res.json({ success: true });
  });

  app.post("/api/pricing/customer", (req, res) => {
    const { product_id, customer_id, margin_adjustment, fixed_price } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO customer_pricing (product_id, customer_id, margin_adjustment, fixed_price)
      VALUES (?, ?, ?, ?)
    `).run(product_id, customer_id, margin_adjustment, fixed_price);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
