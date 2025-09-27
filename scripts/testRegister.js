(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/user/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Juan Perez',
        dni: '44556677',
        area: 'Barra',
        password: 'test-pass-1',
        whatsapp: '999888777',
        birthday: '1999-05-10'
      })
    });
    console.log('status', res.status);
    const j = await res.json().catch(()=>({}));
    console.log('json', j);
  } catch (e) {
    console.error('error', e);
  }
})();
