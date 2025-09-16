export default function NotFound() {
	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			background: '#1a1a1a',
			color: '#fff',
		}}>
			<h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
			<p style={{ fontSize: '1.5rem' }}>Página no encontrada</p>
			<a href="/" style={{ color: '#4fa6ff', marginTop: '2rem', textDecoration: 'underline' }}>Volver al inicio</a>
		</div>
	);
}
