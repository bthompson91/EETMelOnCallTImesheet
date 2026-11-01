"use strict";
(() => {
 const version='0.5.13';document.querySelector('.version').textContent='v'+version;
 const token=window.__oncallAssetToken||new URL(location.href).searchParams.get('_refresh')||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const css=new URL('styles.css',location.href);css.searchParams.set('_asset',token);document.querySelector('link[rel="stylesheet"]').href=css.href;
 document.getElementById('refresh').addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  const open=['startPage','finishPage','editPage'].some(id=>!document.getElementById(id).classList.contains('hidden'));
  if(open&&!confirm('Reload? Unsaved form changes will be lost. Saved entries and running calls will be kept.'))return;
  const url=new URL(location.href);url.searchParams.set('_refresh',Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));location.replace(url.href);
 },true);
 const load=async path=>{
  const url=new URL(path,location.href);url.searchParams.set('_asset',token);
  const response=await fetch(url.href,{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw new Error('Could not fetch '+path+' ('+response.status+'). Check your connection and refresh.');
  const text=await response.text(),blob=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
  return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=blob;script.onload=()=>{URL.revokeObjectURL(blob);resolve();};script.onerror=()=>{URL.revokeObjectURL(blob);reject(new Error('Could not run '+path+'. Check your connection and refresh.'));};document.body.append(script);});
 };
 localStorage.setItem('oncall.aiConsent.v1','yes');
 load('app.js').then(()=>load('drive-fix.js')).then(()=>load('ai-summaries.js')).then(()=>{
  const input=document.getElementById('aiConsent');input.checked=true;input.closest('label').style.display='none';
  document.getElementById('aiWeekly').closest('.card').querySelector('h3').textContent='✨ AI weekly summary';
  const disclosure='When enabled, problem/resolution notes and generated summaries, including names within them, are sent to Google when updating. Original entries stay unchanged.';
  document.querySelectorAll('#statsPage p').forEach(p=>{if(p.textContent.trim()===disclosure)p.remove();});
  const status=document.getElementById('aiStatus'),completed='Updated. AI summaries can be wrong; verify important details against original notes.';
  const formatStatus=()=>{status.style.fontStyle=status.textContent.trim()===completed?'italic':'normal';};
  new MutationObserver(formatStatus).observe(status,{childList:true,characterData:true,subtree:true});formatStatus();
  return load('call-reasons.js');
 }).then(()=>load('language-review.js')).then(()=>{document.querySelector('.version').textContent='v'+version;}).catch(error=>{const box=document.getElementById('error');box.textContent=error.message+' Saved entries have not been cleared.';box.classList.remove('hidden');});
})();
