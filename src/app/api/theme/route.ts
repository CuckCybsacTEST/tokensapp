import { NextRequest } from 'next/server';

// Simple cookie persist (1 year) for theme preference.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}));
    const theme = body.theme;
    if(!['light','dark','system'].includes(theme)) {
      return new Response(JSON.stringify({ ok:false, error:'INVALID_THEME' }), { status:400 });
    }
    const oneYear = 60*60*24*365;
    return new Response(JSON.stringify({ ok:true }), {
      status:200,
      headers: {
        'Set-Cookie': `theme_pref=${theme}; Path=/; Max-Age=${oneYear}; SameSite=Lax`
      }
    });
  } catch(e:any) {
    return new Response(JSON.stringify({ ok:false, error:'INTERNAL', message:String(e?.message||e) }), { status:500 });
  }
}
