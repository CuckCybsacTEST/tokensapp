const code = 'QxawykIhr7'; // Código del token de Jhona
const url = `http://localhost:3000/api/birthdays/invite/${encodeURIComponent(code)}`;

console.log('Consultando API:', url);

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then(data => {
    console.log('Respuesta de la API:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\nAnálisis:');
    console.log('data.public:', data.public);
    console.log('data.hostArrivedAt:', data.hostArrivedAt);
    console.log('data.reservation?.hostArrivedAt:', data.reservation?.hostArrivedAt);

    const isPublic = data.public;
    const hostArrivedAt = isPublic ? data.hostArrivedAt : data.reservation?.hostArrivedAt;
    console.log('hostArrivedAt calculado:', hostArrivedAt);
    console.log('!!hostArrivedAt:', !!hostArrivedAt);
  })
  .catch(err => console.error('Error:', err));