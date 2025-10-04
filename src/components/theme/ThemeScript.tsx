import React from 'react';

/** Inline critical script to set the theme class before hydration to avoid flash on mobile */
export function ThemeScript() {
  return (
    <script
      id="theme-init"
      // Logic order: cookie > localStorage > system. Adds class + color-scheme + inline bg early. Removes anti-FOUC style.
      dangerouslySetInnerHTML={{
        __html: `(()=>{try{const d=document;const h=d.documentElement;const foucId='anti-fouc-style';
// Centralized theme tokens (subset critical for first paint) to avoid recomputation & flicker
const THEME_VARS={
  light:{"--color-bg":"#ffffff","--color-text":"#0f172a","--color-bg-soft":"#f8fafc","--color-border":"#e2e8f0","--color-accent":"#0ea5e9"},
  dark:{"--color-bg":"#0f172a","--color-text":"#f1f5f9","--color-bg-soft":"#1e293b","--color-border":"#334155","--color-accent":"#38bdf8"}
};
if(!d.getElementById(foucId)){const st=d.createElement('style');st.id=foucId;st.textContent='html{opacity:0}html:not(.theme-hydrated) body,html:not(.theme-hydrated) .card,html:not(.theme-hydrated) .btn,html:not(.theme-hydrated) .input{background:var(--color-bg,transparent)!important;color:var(--color-text,#0f172a)!important;transition:none!important;}';d.head.appendChild(st);} 
const CK=d.cookie.match(/(?:^|; )theme_pref=([^;]+)/);const cookiePref=CK?decodeURIComponent(CK[1]):null;const LS=(()=>{try{return localStorage.getItem('app-theme')}catch{return null}})();
let pref=cookiePref||LS||'system'; if(!['light','dark','system'].includes(pref)) pref='system';
const sys= window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
const mode = pref==='system'?sys:pref; h.classList.remove('light','dark'); h.classList.add(mode); h.style.colorScheme=mode; h.setAttribute('data-initial-theme',mode);
// Inline critical CSS vars immediately (prevents flash on tab restore when UA repaints before React effects)
const vars=THEME_VARS[mode]; for(const k in vars){ if(h.style.getPropertyValue(k)!==vars[k]) h.style.setProperty(k,vars[k]); }
if(!h.style.backgroundColor){ h.style.backgroundColor = mode==='dark'?'#0b0d10':'#ffffff'; }
// Suppress transitions briefly when returning from bfcache / tab visibility change to avoid micro flicker
var SUPPRESS_CLASS='transition-hold';
var _suppressTimer; function suppress(){ h.classList.add(SUPPRESS_CLASS); clearTimeout(_suppressTimer); _suppressTimer=setTimeout(function(){ h.classList.remove(SUPPRESS_CLASS); },140); }
// Some browsers fire pageshow (persisted) after bfcache restore
window.addEventListener('pageshow',function(ev){ if(ev && ev.persisted) suppress(); });
document.addEventListener('visibilitychange',function(){ if(!document.hidden) suppress(); });
// Mark hydrated on next frame so transitions can start *after* first paint with correct colors
requestAnimationFrame(()=>{h.classList.add('theme-hydrated');const f=d.getElementById(foucId); if(f) f.remove();});
}catch(e){/* ignore */}})();`
      }}
    />
  );
}
