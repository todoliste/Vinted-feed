// ==== server.js ====
/*
Projet : TikTok-style Vinted Feed
- Backend + Frontend intégré
- Scrape les articles Vinted récents pour 20 marques réelles
- Affiche image, titre, prix, taille, lien
- Tri par prix croissant
*/

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Marques à scraper
const brands = [
  "Dior","Gucci","Chanel","Louis Vuitton","Balenciaga",
  "Prada","Yves Saint Laurent","Nike","Adidas","Supreme",
  "Off-White","Hermes","Givenchy","Fendi","Burberry",
  "Rolex","Cartier","Moncler","Valentino","Versace"
];

// Scraper Vinted pour une marque
async function getArticlesByBrand(brand){
    const url = `https://www.vinted.fr/vetements?search_text=${encodeURIComponent(brand)}&order=price_asc`;
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VintedFeedBot/1.0)' } });
        const $ = cheerio.load(data);
        const articles = [];
        $('.feed-grid__item').each((i, el)=>{
            const link = $(el).find('a').attr('href');
            const title = $(el).find('.item-box__title').text().trim() || brand;
            const price = $(el).find('.item-box__price').text().trim();
            const image = $(el).find('img').attr('src');
            const size = $(el).find('.item-box__size').text().trim();
            if(link && image){
                articles.push({ link:'https://www.vinted.fr'+link, title, price, size, image });
            }
        });
        return articles;
    } catch(err){ console.error('Erreur Vinted:', err.message); return []; }
}

// Endpoint feed
app.get('/feed', async (req,res)=>{
    const brand = brands[Math.floor(Math.random()*brands.length)];
    const articles = await getArticlesByBrand(brand);
    if(!articles.length) return res.json({error:'Pas d\'articles'});
    const randomArticle = articles[Math.floor(Math.random()*articles.length)];
    res.json(randomArticle);
});

// Frontend intégré
app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Vinted Feed TikTok</title><style>body{margin:0;font-family:Arial;background:#f0f0f0;overflow-x:hidden;}.feed{display:flex;flex-direction:column;align-items:center;}.card{width:90%;max-width:400px;background:#fff;border-radius:12px;margin:20px 0;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;flex-direction:column;align-items:center;}.card img{width:100%;border-radius:12px;}.brand{font-weight:bold;margin-top:8px;}.price,.size{margin-top:4px;}.description{margin-top:4px;text-align:center;}.link{margin-top:8px;text-decoration:none;color:#2f80ed;font-weight:bold;}</style></head><body><div class="feed" id="feed"></div><script>const feedEl=document.getElementById('feed');let loading=false;async function loadArticle(){if(loading)return;loading=true;try{const res=await fetch('/feed');const data=await res.json();if(data.error)return;const card=document.createElement('div');card.className='card';card.innerHTML=\`<img src="\${data.image}" alt="\${data.title}"><div class="brand">\${data.title}</div><div class="price">Prix: \${data.price}</div><div class="size">Taille: \${data.size}</div><a class="link" href="\${data.link}" target="_blank">Voir sur Vinted</a>\`;feedEl.appendChild(card);}catch(err){console.error('Erreur fetch feed:',err);}finally{loading=false;}}for(let i=0;i<3;i++) loadArticle();window.addEventListener('scroll',()=>{if(window.innerHeight+window.scrollY>=document.body.offsetHeight-100){loadArticle();}});</script></body></html>`);
});

app.listen(PORT, ()=>console.log(`Vinted TikTok Feed running on port ${PORT}`));