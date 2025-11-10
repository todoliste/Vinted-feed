from flask import Flask, jsonify
import random

app = Flask(__name__)

# Liste de 20 marques connues
brands = [
    "Nike", "Adidas", "Ralph Lauren", "CP Company", "Puma",
    "Reebok", "Under Armour", "New Balance", "Converse", "Vans",
    "The North Face", "Columbia", "Patagonia", "Fila", "Champion",
    "Tommy Hilfiger", "Lacoste", "Jordan", "Asics", "Carhartt"
]

@app.route("/articles")
def articles():
    articles_list = []
    for i in range(30):
        brand = random.choice(brands)
        price_vinted = random.randint(10, 100)
        price_ebay = price_vinted + random.randint(20, 200)
        gain = price_ebay - price_vinted
        if gain >= 20:
            articles_list.append({
                "name": f"{brand} Article {i+1}",
                "brand": brand,
                "price_vinted": price_vinted,
                "price_ebay": price_ebay,
                "gain": gain,
                "image": f"https://via.placeholder.com/150?text={brand}+{i+1}"
            })
    return jsonify(articles_list)

if __name__ == "__main__":
    app.run(debug=True)
