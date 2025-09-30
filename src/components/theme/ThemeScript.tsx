import React from 'react';

/** Inline critical script to set the theme class before hydration to avoid flash on mobile */
export function ThemeScript() {
  return (
    <script
      id="theme-init"
      // Logic order: cookie > localStorage > system. Adds class + color-scheme + inline bg early. Removes anti-FOUC style.
      dangerouslySetInnerHTML={{
        __html: `(()=>{try{const d=document;const h=d.documentElement;const foucId='anti-fouc-style';
if(!d.getElementById(foucId)){const st=d.createElement('style');st.id=foucId;st.textContent='html{opacity:0}';d.head.appendChild(st);} 
const CK=d.cookie.match(/(?:^|; )theme_pref=([^;]+)/);const cookiePref=CK?decodeURIComponent(CK[1]):null;const LS=(()=>{try{return localStorage.getItem('app-theme')}catch{return null}})();
let pref=cookiePref||LS||'system'; if(!['light','dark','system'].includes(pref)) pref='system';
const sys= window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
const mode = pref==='system'?sys:pref; h.classList.remove('light','dark'); h.classList.add(mode); h.style.colorScheme=mode; h.setAttribute('data-initial-theme',mode);
// Minimal inline background to avoid white/black flash mismatch
if(!h.style.backgroundColor){ h.style.backgroundColor = mode==='dark'?'#0b0d10':'#ffffff'; }
const foucEl=d.getElementById(foucId); if(foucEl) foucEl.parentNode?.removeChild(foucEl);
}catch(e){/* ignore */}})();`
      }}
    />
  );
}
