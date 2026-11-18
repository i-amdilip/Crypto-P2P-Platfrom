import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("royalmint.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id TEXT UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    usdt_balance REAL DEFAULT 0,
    inr_balance REAL DEFAULT 0,
    rating REAL DEFAULT 5.0,
    trades_completed INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'buy' or 'sell'
    price REAL,
    min_limit REAL,
    max_limit REAL,
    payment_methods TEXT,
    terms TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'deleted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id INTEGER,
    buyer_id INTEGER,
    seller_id INTEGER,
    amount_usdt REAL,
    amount_inr REAL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'completed', 'disputed', 'cancelled'
    escrow_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ad_id) REFERENCES ads(id),
    FOREIGN KEY(buyer_id) REFERENCES users(id),
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER,
    sender_id INTEGER,
    text TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trade_id) REFERENCES trades(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'deposit', 'withdraw', 'trade_buy', 'trade_sell', 'fee'
    amount REAL,
    currency TEXT, -- 'USDT', 'INR'
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Mock Data
const seed = () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count === 0) {
    db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, last_name, usdt_balance, inr_balance, rating, trades_completed, is_verified, is_admin)
      VALUES 
      ('1', 'admin', 'Royal', 'Admin', 10000, 500000, 5.0, 100, 1, 1),
      ('2', 'trader_joe', 'Joe', 'Trader', 500, 10000, 4.9, 45, 1, 0),
      ('3', 'crypto_queen', 'Sarah', 'Queen', 1200, 25000, 5.0, 82, 1, 0);
    `).run();

    db.prepare(`
      INSERT INTO ads (user_id, type, price, min_limit, max_limit, payment_methods, terms)
      VALUES 
      (2, 'sell', 91.50, 1000, 10000, 'UPI, Bank Transfer', 'Fast release, no third party'),
      (3, 'sell', 91.45, 5000, 50000, 'IMPS, UPI', 'Verified users only'),
      (1, 'buy', 90.80, 1000, 100000, 'UPI', 'I am buying 24/7');
    `).run();
  }
};
seed();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to verify Telegram Init Data
  const verifyTelegramWebAppData = (initData: string) => {
    if (!process.env.TELEGRAM_BOT_TOKEN) return true; // For dev if no token
    
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");
    urlParams.sort();

    let dataCheckString = "";
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return calculatedHash === hash;
  };

  // Auth Middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    const initData = req.headers["x-telegram-init-data"];
    if (!initData) {
      // For development purposes, we might want to allow a mock user
      if (process.env.NODE_ENV !== 'production') {
        req.user = { id: 1, telegram_id: '12345', username: 'dev_user' };
        return next();
      }
      return res.status(401).json({ error: "Unauthorized" });
    }

    // In a real app, verify initData here
    // For this demo, we'll parse the user and find/create them
    try {
      const urlParams = new URLSearchParams(initData as string);
      const userStr = urlParams.get("user");
      if (!userStr) throw new Error("No user in initData");
      const tgUser = JSON.parse(userStr);

      let user = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(tgUser.id.toString()) as any;
      if (!user) {
        const result = db.prepare(`
          INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
          VALUES (?, ?, ?, ?, ?)
        `).run(tgUser.id.toString(), tgUser.username, tgUser.first_name, tgUser.last_name, tgUser.photo_url);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      }
      req.user = user;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid session" });
    }
  };

  // API Routes
  app.get("/api/me", authMiddleware, (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/ads", authMiddleware, (req, res) => {
    const { type } = req.query;
    const ads = db.prepare(`
      SELECT ads.*, users.username, users.rating, users.trades_completed, users.is_verified
      FROM ads
      JOIN users ON ads.user_id = users.id
      WHERE ads.type = ? AND ads.status = 'active'
      ORDER BY ads.created_at DESC
    `).all(type);
    res.json(ads);
  });

  app.post("/api/ads", authMiddleware, (req: any, res) => {
    const { type, price, min_limit, max_limit, payment_methods, terms } = req.body;
    const result = db.prepare(`
      INSERT INTO ads (user_id, type, price, min_limit, max_limit, payment_methods, terms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type, price, min_limit, max_limit, payment_methods, terms);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/trades", authMiddleware, (req: any, res) => {
    const trades = db.prepare(`
      SELECT trades.*, 
             buyer.username as buyer_username, 
             seller.username as seller_username,
             ads.type as ad_type
      FROM trades
      JOIN users buyer ON trades.buyer_id = buyer.id
      JOIN users seller ON trades.seller_id = seller.id
      JOIN ads ON trades.ad_id = ads.id
      WHERE trades.buyer_id = ? OR trades.seller_id = ?
      ORDER BY trades.created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(trades);
  });

  app.post("/api/trades", authMiddleware, (req: any, res) => {
    const { ad_id, amount_usdt } = req.body;
    const ad = db.prepare("SELECT * FROM ads WHERE id = ?").get(ad_id) as any;
    if (!ad) return res.status(404).json({ error: "Ad not found" });

    const amount_inr = amount_usdt * ad.price;
    const seller_id = ad.type === 'sell' ? ad.user_id : req.user.id;
    const buyer_id = ad.type === 'buy' ? ad.user_id : req.user.id;

    // If seller is the one opening the trade (selling to a buy ad)
    // or buyer is opening a trade (buying from a sell ad)
    
    // Check if seller has enough balance to lock in escrow
    const seller = db.prepare("SELECT usdt_balance FROM users WHERE id = ?").get(seller_id) as any;
    if (seller.usdt_balance < amount_usdt) {
      return res.status(400).json({ error: "Insufficient seller balance for escrow" });
    }

    // Lock in escrow
    db.prepare("UPDATE users SET usdt_balance = usdt_balance - ? WHERE id = ?").run(amount_usdt, seller_id);

    const result = db.prepare(`
      INSERT INTO trades (ad_id, buyer_id, seller_id, amount_usdt, amount_inr, escrow_locked)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(ad_id, buyer_id, seller_id, amount_usdt, amount_inr);

    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/trades/:id", authMiddleware, (req: any, res) => {
    const trade = db.prepare(`
      SELECT trades.*, 
             buyer.username as buyer_username, 
             seller.username as seller_username,
             ads.terms,
             ads.payment_methods
      FROM trades
      JOIN users buyer ON trades.buyer_id = buyer.id
      JOIN users seller ON trades.seller_id = seller.id
      JOIN ads ON trades.ad_id = ads.id
      WHERE trades.id = ? AND (trades.buyer_id = ? OR trades.seller_id = ?)
    `).get(req.params.id, req.user.id, req.user.id);
    
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    const messages = db.prepare(`
      SELECT messages.*, users.username as sender_username
      FROM messages
      JOIN users ON messages.sender_id = users.id
      WHERE trade_id = ?
      ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ ...trade, messages });
  });

  app.post("/api/trades/:id/pay", authMiddleware, (req: any, res) => {
    const trade = db.prepare("SELECT * FROM trades WHERE id = ? AND buyer_id = ?").get(req.params.id, req.user.id) as any;
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.status !== 'pending') return res.status(400).json({ error: "Invalid trade status" });

    db.prepare("UPDATE trades SET status = 'paid' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/trades/:id/release", authMiddleware, (req: any, res) => {
    const trade = db.prepare("SELECT * FROM trades WHERE id = ? AND seller_id = ?").get(req.params.id, req.user.id) as any;
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    if (trade.status !== 'paid') return res.status(400).json({ error: "Trade must be marked as paid" });

    // Release escrow to buyer
    db.prepare("UPDATE users SET usdt_balance = usdt_balance + ? WHERE id = ?").run(trade.amount_usdt, trade.buyer_id);
    db.prepare("UPDATE trades SET status = 'completed' WHERE id = ?").run(req.params.id);
    
    // Update stats
    db.prepare("UPDATE users SET trades_completed = trades_completed + 1 WHERE id = ?").run(trade.buyer_id);
    db.prepare("UPDATE users SET trades_completed = trades_completed + 1 WHERE id = ?").run(trade.seller_id);

    res.json({ success: true });
  });

  app.post("/api/trades/:id/chat", authMiddleware, (req: any, res) => {
    const { text } = req.body;
    const trade = db.prepare("SELECT * FROM trades WHERE id = ? AND (buyer_id = ? OR seller_id = ?)").get(req.params.id, req.user.id, req.user.id);
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    db.prepare("INSERT INTO messages (trade_id, sender_id, text) VALUES (?, ?, ?)").run(req.params.id, req.user.id, text);
    res.json({ success: true });
  });

  // Wallet Routes
  app.post("/api/wallet/deposit", authMiddleware, (req: any, res) => {
    const { amount, currency } = req.body;
    const col = currency === 'USDT' ? 'usdt_balance' : 'inr_balance';
    db.prepare(`UPDATE users SET ${col} = ${col} + ? WHERE id = ?`).run(amount, req.user.id);
    db.prepare("INSERT INTO transactions (user_id, type, amount, currency) VALUES (?, 'deposit', ?, ?)").run(req.user.id, amount, currency);
    res.json({ success: true });
  });

  // Admin Routes
  app.get("/api/admin/stats", authMiddleware, (req: any, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const totalTrades = db.prepare("SELECT COUNT(*) as count FROM trades").get() as any;
    const activeAds = db.prepare("SELECT COUNT(*) as count FROM ads WHERE status = 'active'").get() as any;
    res.json({ totalUsers: totalUsers.count, totalTrades: totalTrades.count, activeAds: activeAds.count });
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
