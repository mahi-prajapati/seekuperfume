document.getElementById('login-form').addEventListener('submit', async event => {
  event.preventDefault(); const form=event.currentTarget,status=form.querySelector('.form-status'),button=form.querySelector('button');
  status.textContent=''; button.disabled=true; button.textContent='Signing in…';
  try { const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))}); const body=await response.json(); if(!response.ok)throw new Error(body.error?.message||'Could not sign in.'); location.href='/admin/dashboard'; }
  catch(error){status.textContent=error.message;button.disabled=false;button.textContent='Enter the studio';}
});

