// ==== server.js ====
/*
Projet : Vinted Feed Timer
- Affiche un article à la fois toutes les 30 secondes
- Scrape les marques réelles
- Affiche image, titre, prix, taille, lien
*/

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Liste des marques
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
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

// Endpoint feed : renvoie tous les articles d'une marque aléatoire
app.get('/feed', async (req,res)=>{
    const brand = brands[Math.floor(Math.random()*brands.length)];
    const articles = await getArticlesByBrand(brand);
    res.json(articles);
});

// Frontend intégré avec timer 30s
app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vinted Feed Timer</title>
<style>
body{margin:0;font-family:Arial;background:#f0f0f0;display:flex;justify-content:center;align-items:center;height:100vh;}
.card{width:90%;max-width:400px;background:#fff;border-radius:12px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;flex-direction:column;align-items:center;}
.card img{width:100%;border-radius:12px;}
.brand{font-weight:bold;margin-top:8px;}
.price,.size{margin-top:4px;}
.link{margin-top:8px;text-decoration:none;color:#2f80ed;font-weight:bold;}
</style>
</head>
<body>
<div class="card" id="card">Chargement...</div>
<script>
let articles = [];
let index = 0;
async function loadArticles(){
    try{
        const res = await fetch('/feed');
        articles = await res.json();
        showArticle();
        setInterval(nextArticle, 30000); // 30 secondes
    }catch(err){ console.error(err); document.getElementById('card').innerText='Erreur'; }
}
function showArticle(){
    if(articles.length===0){ document.getElementById('card').innerText='Aucun article'; return; }
    const a = articles[index];
    document.getElementById('card').innerHTML=`
        <img src="${a.image}" alt="${a.title}">
        <div class="brand">${a.title}</div>
        <div class="price">Prix: ${a.price}</div>
        <div class="size">Taille: ${a.size}</div>
        <a class="link" href="${a.link}" target="_blank">Voir sur Vinted</a>
    `;
}
function nextArticle(){ index = (index+1)%articles.length; showArticle(); }
loadArticles();
</script>
</body>
</html>`);
});

app.listen(PORT, ()=>console.log(`Vinted Feed Timer running on port ${PORT}`));
