"use strict";
(() => {
  const version="0.5.6";
  document.querySelector('.version').textContent='v'+version;
  const stamp=new URL(location.href).searchParams.get('_refresh');
  const key=version+(stamp?'-'+stamp:'');
  document.querySelector('link[rel="stylesheet"]').href='styles.css?v='+encodeURIComponent(key);
  document.getElementById('refresh').addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const open=['startPage','finishPage','editPage'].some(id=>!document.getElementById(id).classList.contains('hidden'));
    if(open&&!confirm('Reload? Unsaved form changes will be lost. Saved entries and running calls will be kept.'))return;
    const url=new URL(location.href);url.searchParams.set('_refresh',Date.now().toString());location.replace(url.href);
  },true);
  const load=path=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=path+'?v='+encodeURIComponent(key);
    script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+path+'. Check your connection and refresh.'));document.body.append(script);
  });
  load('app.js').then(()=>load('drive-fix.js')).then(()=>load('ai-summaries.js')).catch(error=>{
    const box=document.getElementById('error');box.textContent=error.message;box.classList.remove('hidden');
  });
})();
