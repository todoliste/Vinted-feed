const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Liste des marques
const brands = [
  "Dior","Gucci","Chanel","Louis Vuitton","Balenciaga",
  "Prada","Yves Saint Laurent","Nike","Adidas","Supreme",
  "Off-White","Hermes","Givenchy","Fendi","Burberry",
  "Rolex","Cartier","Moncler","Valentino","Versace"
];

// Endpoint feed : renvoie tous les articles d'une marque aléatoire
app.get('/feed', async (req,res)=>{
    const brand = brands[Math.floor(Math.random()*brands.length)];
    try {
        const url = `https://www.vinted.fr/vetements?search_text=${encodeURIComponent(brand)}&order=price_asc`;
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
        res.json(articles);
    } catch(err){
        console.error(err);
        res.json([]);
    }
});

// Servir le frontend statique
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, ()=>console.log(`Vinted Feed Timer running on port ${PORT}`));
