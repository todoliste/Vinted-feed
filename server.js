'use strict';
/*
server.js - Real-intent implementation (requires configuration):
 - Discord OAuth via passport-discord
 - PayPal Checkout Server SDK integration for creating orders and capturing them (placeholders)
 - Scraper using axios+cheerio with caching
 - Lowdb for lightweight persistence of users, VIP status and viewed logs
 IMPORTANT: Configure environment variables and register a Discord app and PayPal app.
*/
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { Low, JSONFile } = require('lowdb');
const paypal = require('@paypal/checkout-server-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lowdb setup
const dbFile = path.join(__dirname, 'data.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
(async ()=>{ await db.read(); db.data = db.data || { users: {}, viewed: {} }; await db.write(); })();

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Passport / Discord OAuth
passport.serializeUser((u, done)=> done(null, u));
passport.deserializeUser((obj, done)=> done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
  scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
  await db.read();
  const id = profile.id;
  db.data.users[id] = db.data.users[id] || {
    id,
    username: profile.username + '#' + profile.discriminator,
    avatar: profile.avatar || null,
    vip: false,
    favorites: []
  };
  await db.write();
  return done(null, { id });
}));

app.use(passport.initialize());
app.use(passport.session());

// PayPal SDK environment
function paypalClient(){
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  if(!clientId || !clientSecret) return null;
  const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
}

// Serve static
app.use('/', express.static(path.join(__dirname, 'public')));

// Auth endpoints
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req,res)=>{
  res.redirect('/feed.html?uid=' + req.user.id);
});
app.get('/auth/logout', (req,res)=>{ req.logout(()=>{}); res.redirect('/'); });

// helper
async function attachUser(req,res,next){
  await db.read();
  const uid = req.query.uid || (req.user && req.user.id);
  if(uid && db.data.users[uid]) req.appUser = db.data.users[uid];
  next();
}

// PayPal create order (server-side)
// In production: use real capture flow and verify webhooks.
app.post('/api/paypal/create-order', attachUser, async (req,res)=>{
  if(!req.appUser) return res.status(401).json({ error: 'not authenticated' });
  const client = paypalClient();
  if(!client) return res.status(500).json({ error: 'paypal_not_configured' });
  const orderRequest = {
    intent: 'CAPTURE',
    purchase_units: [
      { amount: { currency_code: 'EUR', value: '4.99' } }
    ]
  };
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody(orderRequest);
  try{
    const response = await client.execute(request);
    return res.json({ id: response.result.id });
  }catch(e){
    console.error('paypal create error', e);
    return res.status(500).json({ error: 'paypal_create_failed' });
  }
});

// Capture order
app.post('/api/paypal/capture', attachUser, async (req,res) => {
  if(!req.appUser) return res.status(401).json({ error: 'not authenticated' });
  const { orderID } = req.body;
  if(!orderID) return res.status(400).json({ error: 'orderID required' });
  const client = paypalClient();
  if(!client) return res.status(500).json({ error: 'paypal_not_configured' });
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});
  try{
    const capture = await client.execute(request);
    // mark user as VIP
    await db.read();
    db.data.users[req.appUser.id].vip = true;
    db.data.users[req.appUser.id].vip_tx = capture.result.id || orderID;
    await db.write();
    return res.json({ ok: true, vip: true });
  }catch(e){
    console.error('paypal capture error', e);
    return res.status(500).json({ error: 'paypal_capture_failed' });
  }
});

// Scraper (cached)
const BRANDS = ["Dior","Gucci","Chanel","Louis Vuitton","Balenciaga","Prada","Yves Saint Laurent","Nike","Adidas","Supreme","Off-White","Hermes","Givenchy","Fendi","Burberry","Rolex","Cartier","Moncler","Valentino","Versace"];
const cache = {}; const CACHE_TTL = 2*60*1000;
function now(){ return Date.now(); }

app.get('/api/scrape', async (req,res)=>{
  const brand = (req.query.brand||'').trim();
  if(!brand || !BRANDS.includes(brand)) return res.status(400).json({ error: 'invalid brand' });
  const key = brand.toLowerCase();
  if(cache[key] && (now()-cache[key].ts < CACHE_TTL)) return res.json({ brand, items: cache[key].items, cached: true });
  try{
    const url = `https://www.vinted.fr/vetements?search_text=${encodeURIComponent(brand)}&order=newest`;
    const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    const $ = cheerio.load(r.data);
    const items = [];
    $('.feed-grid__item, .catalog-item, .item-box').each((i, el)=>{
      try{
        const a = $(el).find('a').first();
        const link = a.attr('href');
        const title = $(el).find('h3, .item-box__title, .title').first().text().trim() || brand;
        const price = $(el).find('.item-box__price, .price').first().text().trim() || '';
        const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const size = $(el).find('.item-box__size, .size').first().text().trim() || '';
        if(link && img){
          items.push({ title, price, size, image: img.startsWith('http')?img:'https://www.vinted.fr'+img, link: link.startsWith('http')?link:'https://www.vinted.fr'+link, ts: now() });
        }
      }catch(e){}
    });
    cache[key] = { ts: now(), items };
    return res.json({ brand, items });
  }catch(e){ console.error('scrape err', e.message); return res.status(500).json({ error: 'scrape_failed' }); }
});

// Personalized feed endpoint
app.get('/api/feed', attachUser, async (req,res)=>{
  const limit = parseInt(req.query.limit||'10',10);
  await db.read();
  const user = req.appUser;
  const brandsToQuery = user && user.vip && user.favorites && user.favorites.length>0 ? user.favorites.concat(BRANDS) : BRANDS;
  const results = [];
  for(const b of brandsToQuery){
    const key = b.toLowerCase();
    if(cache[key] && cache[key].items){
      for(const it of cache[key].items){
        const viewed = (db.data.viewed && db.data.viewed[user?user.id:'guest']) || [];
        if(viewed.includes(it.link)) continue;
        results.push(it);
        if(results.length >= limit) break;
      }
    }
    if(results.length >= limit) break;
  }
  res.json({ items: results.slice(0,limit) });
});

// log viewed
app.post('/api/log/viewed', attachUser, async (req,res)=>{
  if(!req.appUser) return res.status(401).json({ error: 'not_authenticated' });
  const link = req.body.link;
  if(!link) return res.status(400).json({ error: 'link required' });
  await db.read();
  db.data.viewed[req.appUser.id] = db.data.viewed[req.appUser.id] || [];
  db.data.viewed[req.appUser.id].push(link);
  await db.write();
  res.json({ ok:true });
});

app.get('/ping', (req,res)=> res.json({ ok:true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
