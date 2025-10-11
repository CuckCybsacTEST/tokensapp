// Script para probar la API de pedidos
const orderData = {
  tableId: "1",
  items: [
    {
      productId: "1",
      quantity: 2,
      notes: "Sin cebolla"
    },
    {
      productId: "2",
      quantity: 1,
      notes: "Extra queso"
    }
  ],
  notes: "Pedido de prueba completo - Socket.IO"
};

console.log('Enviando pedido de prueba...');
fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(orderData),
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Pedido creado:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});