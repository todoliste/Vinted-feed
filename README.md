Vinted Feed - Real Scraper + Discord OAuth + PayPal (prototype)
===============================================================

This project is a prototype intended to be configured and secured before production use.
It includes:
- Express backend (server.js) with Discord OAuth (passport-discord)
- PayPal Checkout server-side integration (create order / capture) using @paypal/checkout-server-sdk
- Scraping endpoints that get recent listings for configured brand names (Vinted)
- Lowdb JSON storage for users and viewed logs (data.json created at runtime)
- Frontend pages under /public (index.html, feed.html, style.css, script.js)

IMPORTANT: You MUST configure environment variables (.env) and register the Discord App + PayPal App.
Follow the README steps in server.js comments and in .env.example.

LEGAL & ETHICS:
- Scraping may violate Vinted's terms of service. Use responsibly and consider getting permission or using official APIs.
- For real payments: implement verified webhooks & server-side verification before granting VIP access.

