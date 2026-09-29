(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const csrf = () => document.cookie.split('; ').find(x => x.startsWith('csrftoken='))?.split('=')[1] || document.body.dataset.csrf;
  const post = (url, body, json = true) => fetch(url, {
    method: 'POST', headers: {'X-CSRFToken': csrf(), ...(json ? {'Content-Type':'application/json'} : {})},
    body: json ? JSON.stringify(body) : body
  }).then(async r => { const data = await r.json(); if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), data); return data; });
  const toast = message => {
    let box = $('.messages'); if (!box) { box = document.createElement('div'); box.className = 'messages'; document.body.append(box); }
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; box.append(el); setTimeout(() => el.remove(), 4200);
  };

  const drawer = $('#menu-drawer'), scrim = $('.scrim'), menuButton = $('.menu-trigger');
  const closeLayers = () => { drawer?.classList.remove('open'); drawer?.setAttribute('aria-hidden','true'); menuButton?.setAttribute('aria-expanded','false'); scrim?.classList.remove('open'); document.body.classList.remove('locked'); };
  menuButton?.addEventListener('click', () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); menuButton.setAttribute('aria-expanded','true'); scrim.classList.add('open'); document.body.classList.add('locked'); $('.drawer-close')?.focus(); });
  $('.drawer-close')?.addEventListener('click', closeLayers); scrim?.addEventListener('click', closeLayers);

  const dialog = $('.search-dialog'), searchInput = $('.search-form input'), results = $('.instant-results');
  $('.search-trigger')?.addEventListener('click', () => { dialog.showModal(); document.body.classList.add('locked'); setTimeout(() => searchInput.focus(), 50); });
  $('.dialog-close')?.addEventListener('click', () => { dialog.close(); document.body.classList.remove('locked'); });
  dialog?.addEventListener('cancel', () => document.body.classList.remove('locked'));
  let searchTimer;
  searchInput?.addEventListener('input', () => { clearTimeout(searchTimer); const q = searchInput.value.trim(); if (q.length < 2) { results.innerHTML=''; return; } results.innerHTML='<p>Seeking…</p>'; searchTimer=setTimeout(async()=>{ try { const data=await fetch(`/api/search/?q=${encodeURIComponent(q)}`).then(r=>r.json()); results.innerHTML=data.results.length ? data.results.map(x=>`<a class="search-result" href="/products/${x.slug}/"><small>${x.gender} · ${x.notes}</small><br><b>${x.name}</b><br>₹${Math.round(x.price)}</a>`).join('') : '<p>No matches yet. Try a note or mood.</p>'; } catch { results.innerHTML='<p>Search is resting. Please try again.</p>'; } },260); });

  $$('[data-add-cart]').forEach(button => button.addEventListener('click', async () => {
    const original=button.textContent; button.disabled=true; button.textContent='Adding…';
    try { const data=await post('/api/cart/add/', {product_id:button.dataset.addCart}); $('.cart-count').textContent=data.count; button.textContent='Added ✓'; toast(data.message); setTimeout(()=>{button.textContent=original;button.disabled=false},1300); }
    catch(e){button.textContent=original;button.disabled=false;toast(e.message);}
  }));
  $$('[data-cart-item]').forEach(button => button.addEventListener('click', async () => {
    button.disabled=true; try { const data=await post('/api/cart/update/', {item_id:button.dataset.cartItem,quantity:button.dataset.quantity}); $('.cart-count').textContent=data.count; location.reload(); } catch(e){button.disabled=false;toast(e.message);} 
  }));
  $$('[data-wishlist]').forEach(button => button.addEventListener('click', async () => {
    const data=new FormData(); data.append('product_id',button.dataset.wishlist);
    try { const result=await post('/api/wishlist/toggle/',data,false); button.classList.toggle('saved',result.saved); button.setAttribute('aria-pressed',String(result.saved)); toast(result.saved?'Saved to your wishlist.':'Removed from your wishlist.'); }
    catch(e){toast(e.message); if(e.login)setTimeout(()=>location.href=e.login,800);}
  }));
  $('.newsletter-form')?.addEventListener('submit', async e => {
    e.preventDefault(); const form=e.currentTarget,status=$('.form-status',form),data=new FormData(form); status.textContent='Joining…';
    try { const result=await post('/api/newsletter/',data,false); status.textContent=result.message; form.reset(); } catch(err){status.textContent=err.message;}
  });
  $$('.moment-tabs button').forEach(button=>button.addEventListener('click',()=>{$$('.moment-tabs button').forEach(b=>b.classList.remove('active'));button.classList.add('active');}));
  document.addEventListener('keydown', e => { if(e.key==='Escape')closeLayers(); });
})();
