(() => {
  const items = [
    { title: 'Pantalon example', brand:'Marque Ex', size:'L', condition:'Très bon état', price:'45€', link:'#', image:'https://i.imgur.com/8JYxM0y.png' },
    { title: 'Veste classique', brand:'Dior', size:'M', condition:'Neuf', price:'150€', link:'#', image:'https://via.placeholder.com/600x600.png?text=Veste' },
    { title: 'Sneakers urbaines', brand:'Nike', size:'42', condition:'Bon état', price:'60€', link:'#', image:'https://via.placeholder.com/600x600.png?text=Sneakers' },
    { title: 'Pull oversize', brand:'Zara', size:'S', condition:'Très bon état', price:'20€', link:'#', image:'https://via.placeholder.com/600x600.png?text=Pull' }
  ];

  let idx = 0;
  let isVip = localStorage.getItem('vf_vip') === '1';

  const itemImg = document.getElementById('itemImg');
  const itemTitle = document.getElementById('itemTitle');
  const itemBrand = document.getElementById('itemBrand');
  const itemSize = document.getElementById('itemSize');
  const itemCondition = document.getElementById('itemCondition');
  const itemPrice = document.getElementById('itemPrice');
  const openBtn = document.getElementById('openBtn');
  const skipBtn = document.getElementById('skipBtn');
  const discordAvatar = document.getElementById('discordAvatar');
  const settings = document.getElementById('settings');
  const themeToggle = document.getElementById('themeToggle');
  const buyVip = document.getElementById('buyVip');
  const purchase = document.getElementById('purchase');
  const confirmBuy = document.getElementById('confirmBuy');
  const cancelBuy = document.getElementById('cancelBuy');
  const closeSettings = document.getElementById('closeSettings');
  const discordName = document.getElementById('discordName');

  function render() {
    const it = items[idx % items.length];
    itemImg.src = it.image;
    itemTitle.textContent = it.title;
    itemBrand.textContent = 'Marque : ' + it.brand;
    itemSize.textContent = 'Taille : ' + it.size;
    itemCondition.textContent = 'État : ' + it.condition;
    itemPrice.textContent = it.price;
    openBtn.onclick = () => window.open(it.link, '_blank');
  }

  function next() { idx = (idx+1)%items.length; render(); }

  skipBtn.addEventListener('click', ()=> next());

  discordAvatar.addEventListener('click', ()=> {
    settings.style.display = settings.style.display === 'flex' ? 'none' : 'flex';
  });
  closeSettings.addEventListener('click', ()=> settings.style.display = 'none');

  themeToggle.addEventListener('change', (e)=>{
    if(e.target.checked){ document.body.classList.add('dark'); localStorage.setItem('vf_theme','dark'); }
    else { document.body.classList.remove('dark'); localStorage.removeItem('vf_theme'); }
  });
  if(localStorage.getItem('vf_theme') === 'dark'){ document.body.classList.add('dark'); themeToggle.checked = true; }

  buyVip.addEventListener('click', ()=> purchase.style.display = 'flex');
  cancelBuy.addEventListener('click', ()=> purchase.style.display = 'none');
  confirmBuy.addEventListener('click', ()=> {
    localStorage.setItem('vf_vip','1');
    isVip = true;
    purchase.style.display = 'none';
    alert('Merci ! VIP activé (simulation)');
    startAutoAdvance();
  });

  let autoTimer = null;
  function startAutoAdvance(){
    if(autoTimer) clearInterval(autoTimer);
    if(isVip) autoTimer = setInterval(()=> next(), 30000);
  }
  if(isVip) startAutoAdvance();

  // swipe support
  const cardEl = document.querySelector('.draggable');
  let startX = 0, currentX = 0, dragging = false;
  function setTransform(x, y, rot){ cardEl.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`; }
  cardEl.addEventListener('pointerdown', (e)=>{
    dragging = true; startX = e.clientX; cardEl.setPointerCapture(e.pointerId);
  });
  cardEl.addEventListener('pointermove', (e)=>{
    if(!dragging) return; currentX = e.clientX - startX; const rot = currentX/20; setTransform(currentX,0,rot);
  });
  cardEl.addEventListener('pointerup', (e)=>{
    dragging = false; const threshold = 100;
    if(currentX > threshold){ setTransform(1000,0,20); setTimeout(()=>{ setTransform(0,0,0); next(); },200); }
    else if(currentX < -threshold){ setTransform(-1000,0,-20); setTimeout(()=>{ setTransform(0,0,0); next(); },200); }
    else { setTransform(0,0,0); }
    currentX = 0;
  });

  render();
})();