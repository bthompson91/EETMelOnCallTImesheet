"use strict";
(() => {
 const version='0.5.12';document.querySelector('.version').textContent='v'+version;
 const stamp=new URL(location.href).searchParams.get('_refresh'),key=version+(stamp?'-'+stamp:'');document.querySelector('link[rel="stylesheet"]').href='styles.css?v='+encodeURIComponent(key);
 document.getElementById('refresh').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();const open=['startPage','finishPage','editPage'].some(id=>!document.getElementById(id).classList.contains('hidden'));if(open&&!confirm('Reload? Unsaved form changes will be lost. Saved entries and running calls will be kept.'))return;const url=new URL(location.href);url.searchParams.set('_refresh',Date.now().toString());location.replace(url.href);},true);
 const load=path=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path+'?v='+encodeURIComponent(key);script.onload=resolve;script.onerror=()=>reject(new Error('Could not load '+path+'. Check your connection and refresh.'));document.body.append(script);});
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
 }).then(()=>load('language-review.js')).then(()=>{document.querySelector('.version').textContent='v'+version;}).catch(error=>{const box=document.getElementById('error');box.textContent=error.message;box.classList.remove('hidden');});
})();
