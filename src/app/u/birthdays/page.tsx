"use client";
import { useEffect, useState, useRef, memo } from 'react';

type Pack = {
	id: string; name: string; qrCount: number; bottle: string | null; perks: string[];
	priceSoles?: number; isCustom?: boolean;
};

type Reservation = {
	id: string; celebrantName: string; phone: string; documento: string; date: string; timeSlot: string;
	pack: { id: string; name: string; qrCount: number; bottle: string | null } | null;
	guestsPlanned: number; status: string; tokensGeneratedAt: string | null; createdAt: string;
	// Llegadas
	hostArrivedAt?: string | null;
	guestArrivals?: number;
	cardsReady?: boolean;
};

function ReservationSkeleton() {
	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-2">
						<div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
						<div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
						<div className="flex items-center gap-2">
							<div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28 animate-pulse"></div>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-22 animate-pulse"></div>
						</div>
					</div>
				</div>
				<div className="flex gap-2">
					<div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse"></div>
					<div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
				</div>
			</div>
		</div>
	);
}


function fmtLima(iso?: string | null) {
	if (!iso) return '';
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '';
		const lima = new Date(d.getTime() - 5 * 3600 * 1000);
		const y = lima.getUTCFullYear();
		const m = String(lima.getUTCMonth() + 1).padStart(2, '0');
		const day = String(lima.getUTCDate()).padStart(2, '0');
		const hh = String(lima.getUTCHours()).padStart(2, '0');
		const mm = String(lima.getUTCMinutes()).padStart(2, '0');
		return `${y}-${m}-${day} ${hh}:${mm}`;
	} catch { return ''; }
}

// Formato legible para fecha de celebración: '6 Nov 2025'
function fmtCelebrationDate(iso?: string | null) {
	if (!iso) return '';
	let base = iso;
	// Aceptar formato corto YYYY-MM-DD agregando medianoche UTC
	if (/^\d{4}-\d{2}-\d{2}$/.test(base)) base = base + 'T00:00:00.000Z';
	try {
		const d = new Date(base);
		if (isNaN(d.getTime())) return '';
		// Ajustar a Lima restando 5h UTC (simplificación sin DST)
		const lima = new Date(d.getTime() - 5 * 3600 * 1000);
		const day = lima.getUTCDate();
		const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
		const month = monthNames[lima.getUTCMonth()];
		const year = lima.getUTCFullYear();
		return `${day} ${month} ${year}`;
	} catch { return ''; }
}

type ReservationCardProps = {
	r: Reservation;
	busyApprove: boolean;
	busyGenerate: boolean;
	onApprove: (id:string)=>void;
	onGenerateCards: (id:string)=>void;
	onViewCards: (id:string)=>void;
};

const ReservationCard = memo(function ReservationCard({ r, busyApprove, busyGenerate, onApprove, onGenerateCards, onViewCards }: ReservationCardProps){
	const [showCards, setShowCards] = useState(false);
	const [cardsLoading, setCardsLoading] = useState(false);
	const [cardsError, setCardsError] = useState<string|null>(null);
	const [tokens, setTokens] = useState<any[]>([]);
	const [cardFailed, setCardFailed] = useState<Record<string, boolean>>({});

	const isApproved = r.status==='approved' || r.status==='completed';
	const isAlert = r.status==='pending_review' || r.status==='canceled';
	const badgeCls = isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : isAlert ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200';
	const statusLabel = r.status === 'pending_review'
		? 'PENDIENTE'
		: r.status === 'approved'
			? 'APROBADO'
			: r.status === 'completed'
				? 'COMPLETADO'
				: r.status === 'canceled'
					? 'CANCELADO'
					: r.status;
	const celebrationDate = fmtCelebrationDate(r.date);

	async function loadCards() {
		if (!r.cardsReady) return;
		setCardsLoading(true);
		setCardsError(null);
		try {
			// Get client secret first
			const secRes = await fetch(`/api/birthdays/reservations/${encodeURIComponent(r.id)}/public-secret`);
			const secJson = await secRes.json();
			if (!secRes.ok || !secJson?.clientSecret) throw new Error('No se pudo obtener acceso seguro');

			// Load tokens
			const res = await fetch(`/api/birthdays/reservations/${encodeURIComponent(r.id)}/tokens?clientSecret=${encodeURIComponent(secJson.clientSecret)}`);
			const j = await res.json();
			if (!res.ok || !j?.items) throw new Error(j?.code || j?.message || 'Error al cargar tokens');
			setTokens(j.items);
		} catch(e:any) {
			setCardsError(String(e?.message||e));
		} finally {
			setCardsLoading(false);
		}
	}

	useEffect(() => {
		if (showCards && r.cardsReady && tokens.length === 0) {
			loadCards();
		}
	}, [showCards, r.cardsReady]);

	const host = tokens.find((t) => t.kind === "host") || null;
	const guest = tokens.find((t) => t.kind === "guest") || null;

		return (
			<div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<a href={`/u/birthdays/${encodeURIComponent(r.id)}`} className="font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate">{r.celebrantName}</a>
							<span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{statusLabel}</span>
						</div>
						<div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
							<div className="flex items-center gap-2">
								<span className="text-slate-400">📅</span>
								<span>Fecha: <span className="font-bold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 px-2 py-0.5 rounded">{celebrationDate}</span></span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-400">⏰</span>
								<span>Hora: {r.timeSlot}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-400">👥</span>
								<span>Invitados: {r.guestsPlanned || r.pack?.qrCount || '-'}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-400">🎁</span>
								<span>Pack: {r.pack?.name || '-'}</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-400">🚪</span>
								<span className="flex items-center gap-3">
									<span className={r.hostArrivedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-yellow-600 dark:text-yellow-400'}>
										{r.hostArrivedAt ? '✅ Host llegó' : '⏳ Esperando host'}
									</span>
									<span className="text-blue-600 dark:text-blue-400">
										{(r.guestArrivals ?? 0)}/{r.guestsPlanned || r.pack?.qrCount || 0} invitados
									</span>
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-400">🆔</span>
								<span className="font-mono text-xs">DNI: {r.documento}</span>
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
						{r.status==='pending_review' && (
							<button className="btn h-8 px-3 text-xs" disabled={busyApprove} onClick={()=>onApprove(r.id)}>
								{busyApprove? '⏳ Aprobando…':'✅ Aprobar'}
							</button>
						)}
						{!r.tokensGeneratedAt && (
							<button className="btn h-8 px-3 text-xs" disabled={busyGenerate} onClick={()=>onGenerateCards(r.id)}>
								{busyGenerate? '⏳ Generando…':'🎫 Generar QR'}
							</button>
						)}
						{r.tokensGeneratedAt && (
							<button className="btn-outline h-8 px-3 text-xs" onClick={()=>onViewCards(r.id)}>
								👀 Descargar Qr
							</button>
						)}
						{r.cardsReady && (
							<button className="btn-outline h-8 px-3 text-xs" onClick={()=>setShowCards(!showCards)}>
								{showCards ? '🔽 Ocultar tarjetas' : '🔼 Ver tarjetas'}
							</button>
						)}
						<a className="btn-outline h-8 px-3 text-xs" href={`/u/birthdays/${encodeURIComponent(r.id)}`}>
							📋 Detalle
						</a>
					</div>
				</div>

				{/* Birthday Cards Section */}
				{showCards && (
					<div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
						{cardsLoading && (
							<div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
								Cargando tarjetas…
							</div>
						)}
						{cardsError && (
							<div className="text-sm text-rose-600 dark:text-rose-400 text-center py-4">
								Error: {cardsError}
							</div>
						)}
						{!cardsLoading && !cardsError && tokens.length > 0 && (
							<div className="space-y-4">
								{/* Mobile slider */}
								<div className="md:hidden">
									<div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth gap-4 pb-4">
										{host && (
											<div className="snap-center shrink-0 w-full max-w-sm">
												<div
													className="relative overflow-hidden rounded-2xl p-4"
													style={{
														background: "linear-gradient(145deg,#121212 0%,#1a1812 55%,#262017 100%)",
														boxShadow: "0 0 0 1px rgba(212,175,55,0.55),0 0 18px -6px rgba(212,175,55,0.5)",
													}}
												>
													<div className="absolute top-2 right-2 select-none">
														<span
															className="text-[10px] tracking-[0.18em] font-extrabold px-2 py-1 rounded-full shadow"
															style={{
																background: "linear-gradient(90deg,#FFD873,#E7B647)",
																color: "#1a1205",
																border: "1px solid rgba(0,0,0,0.35)",
																boxShadow: "0 2px 4px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06)",
															}}
														>
															VIP
														</span>
													</div>
													<div className="text-sm font-semibold" style={{ color: "#D4AF37" }}>
														Cumpleañero
													</div>
													<div className="mt-1 text-xs opacity-80">
														Estado: {host.status || "activo"} · 1 uso
													</div>
													<div className="mt-3 flex items-center justify-center">
														<img
															src={`/api/birthdays/invite/${host.code}/card`}
															alt="Tarjeta cumpleañero"
															className="w-full max-w-[240px] rounded-lg shadow-lg"
															onError={() => setCardFailed((p) => ({ ...p, [host.id]: true }))}
														/>
														{cardFailed[host.id] && (
															<div className="absolute inset-0 flex items-center justify-center">
																<div className="text-xs text-slate-400">Imagen no disponible</div>
															</div>
														)}
													</div>
												</div>
											</div>
										)}
										{guest && (
											<div className="snap-center shrink-0 w-full max-w-sm">
												<div
													className="relative rounded-2xl p-4 flex flex-col"
													style={{
														background: "linear-gradient(150deg,#171717 0%,#1F1F24 60%,#23262B 100%)",
														boxShadow: "0 0 0 1px #B7BDC9",
														border: "1px solid #B7BDC9",
													}}
												>
													<div className="text-sm font-semibold opacity-90" style={{ color: "#E2E6EC" }}>
														Invitados
													</div>
													<div className="mt-1 text-xs opacity-80">Compártelo con tus invitados</div>
													<div className="mt-3 flex items-center justify-center flex-1">
														<img
															src={`/api/birthdays/invite/${guest.code}/card`}
															alt="Tarjeta invitados"
															className="w-full max-w-[240px] rounded-lg shadow-lg"
															onError={() => setCardFailed((p) => ({ ...p, [guest.id]: true }))}
														/>
														{cardFailed[guest.id] && (
															<div className="absolute inset-0 flex items-center justify-center">
																<div className="text-xs text-slate-400">Imagen no disponible</div>
															</div>
														)}
													</div>
												</div>
											</div>
										)}
									</div>
								</div>

								{/* Desktop grid */}
								<div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
									{host && (
										<div
											className="relative overflow-hidden rounded-2xl p-4"
											style={{
												background: "linear-gradient(145deg,#121212 0%,#1a1812 55%,#262017 100%)",
												boxShadow: "0 0 0 1px rgba(212,175,55,0.55),0 0 18px -6px rgba(212,175,55,0.5)",
											}}
										>
											<div className="absolute top-2 right-2 select-none">
												<span
													className="text-[10px] tracking-[0.18em] font-extrabold px-2 py-1 rounded-full shadow"
													style={{
														background: "linear-gradient(90deg,#FFD873,#E7B647)",
														color: "#1a1205",
														border: "1px solid rgba(0,0,0,0.35)",
														boxShadow: "0 2px 4px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06)",
													}}
												>
													VIP
												</span>
											</div>
											<div className="text-sm font-semibold" style={{ color: "#D4AF37" }}>
												Cumpleañero
											</div>
											<div className="mt-1 text-xs opacity-80">
												Estado: {host.status || "activo"} · 1 uso
											</div>
											<div className="mt-3 flex items-center justify-center">
												<img
													src={`/api/birthdays/invite/${host.code}/card`}
													alt="Tarjeta cumpleañero"
													className="w-full max-w-[280px] rounded-lg shadow-lg"
													onError={() => setCardFailed((p) => ({ ...p, [host.id]: true }))}
												/>
												{cardFailed[host.id] && (
													<div className="absolute inset-0 flex items-center justify-center">
														<div className="text-xs text-slate-400">Imagen no disponible</div>
													</div>
												)}
											</div>
										</div>
									)}
									{guest && (
										<div
											className="relative rounded-2xl p-4 flex flex-col"
											style={{
												background: "linear-gradient(150deg,#171717 0%,#1F1F24 60%,#23262B 100%)",
												boxShadow: "0 0 0 1px #B7BDC9",
												border: "1px solid #B7BDC9",
											}}
										>
											<div className="text-sm font-semibold opacity-90" style={{ color: "#E2E6EC" }}>
												Invitados
											</div>
											<div className="mt-1 text-xs opacity-80">Compártelo con tus invitados</div>
											<div className="mt-3 flex items-center justify-center flex-1">
												<img
													src={`/api/birthdays/invite/${guest.code}/card`}
													alt="Tarjeta invitados"
													className="w-full max-w-[280px] rounded-lg shadow-lg"
													onError={() => setCardFailed((p) => ({ ...p, [guest.id]: true }))}
												/>
												{cardFailed[guest.id] && (
													<div className="absolute inset-0 flex items-center justify-center">
														<div className="text-xs text-slate-400">Imagen no disponible</div>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		);
});

export default function StaffBirthdaysPage() {
	const [items, setItems] = useState<Reservation[]>([]);
	const [packs, setPacks] = useState<Pack[]>([]);
	const [loading, setLoading] = useState(false);
	const [err, setErr] = useState<string|null>(null);
	const [status, setStatus] = useState('');
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [busyApprove, setBusyApprove] = useState<Record<string, boolean>>({});
	const [busyGenerate, setBusyGenerate] = useState<Record<string, boolean>>({});
	// form
	const [cName, setCName] = useState('');
	const [cPhone, setCPhone] = useState('');
	const [cDoc, setCDoc] = useState('');
	const [cDate, setCDate] = useState('');
	const [cSlot, setCSlot] = useState('20:00');
	const [cPack, setCPack] = useState('');
	const [creating, setCreating] = useState(false);
	// UI
	const [activeTab, setActiveTab] = useState<'packs' | 'list' | 'create'>('packs');

	async function load() {
		setLoading(true); setErr(null);
		try {
			const q = new URLSearchParams();
			if (status) q.set('status', status);
			if (search) q.set('search', search);
			q.set('page', String(page)); q.set('pageSize','30');
	const res = await fetch(`/api/admin/birthdays?${q.toString()}`);
			const j = await res.json();
			if (!res.ok) throw new Error(j?.code || j?.message || res.status);
			setItems(j.items || []);
		} catch(e:any){ setErr(String(e?.message||e)); } finally { setLoading(false); }
	}
	useEffect(()=>{ load(); }, [page]);
	useEffect(()=>{ (async()=>{ try { const r = await fetch('/api/birthdays/packs'); const j = await r.json(); if (r.ok && j?.packs) { const uniquePacks = Array.from(new Map(j.packs.map((p: any) => [p.id, p as Pack])).values()) as Pack[]; setPacks(uniquePacks); } } catch{} })(); }, []);

	async function approve(id:string){ setBusyApprove(p=>({...p,[id]:true})); try { const r=await fetch(`/api/admin/birthdays/${id}/approve`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusyApprove(p=>({...p,[id]:false})); } }
	async function genTokens(id:string){ setBusyGenerate(p=>({...p,[id]:true})); try { const r=await fetch(`/api/admin/birthdays/${id}/tokens`,{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j?.code||j?.message||r.status); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setBusyGenerate(p=>({...p,[id]:false})); } }
	function viewCards(id:string){
		// Solicitar clientSecret y abrir la URL con cs
		(async () => {
			try {
				const res = await fetch(`/api/birthdays/reservations/${encodeURIComponent(id)}/public-secret`);
				const j = await res.json();
				if (res.ok && j?.clientSecret) {
					window.open(`/marketing/birthdays/${encodeURIComponent(id)}/qrs?mode=staff&cs=${encodeURIComponent(j.clientSecret)}`, '_blank', 'noopener');
				} else {
					setErr('No pudimos obtener el parámetro de seguridad para ver tus QRs.');
				}
			} catch (e:any) {
				setErr('No pudimos obtener el parámetro de seguridad para ver tus QRs.');
			}
		})();
	}

	async function submitCreate(){ setCreating(true); setErr(null); try { const payload={ celebrantName:cName, phone:cPhone, documento:cDoc, date:cDate, timeSlot:cSlot, packId:cPack, guestsPlanned: packs.find(p=>p.id===cPack)?.qrCount || 5 }; 	const r=await fetch('/api/admin/birthdays',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(!r.ok||!j?.ok) throw new Error(j?.code||j?.message||r.status); setCName(''); setCPhone(''); setCDoc(''); setCDate(''); setCSlot('20:00'); setCPack(''); load(); } catch(e:any){ setErr(String(e?.message||e)); } finally { setCreating(false); } }

	const empty = !loading && items.length===0;

	return (
		<div className="min-h-screen bg-[var(--color-bg)]">
			<div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
				{err && <div className="rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200 p-3 text-sm">{err}</div>}

				{/* Tabs */}
				<div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
					<div className="flex border-b border-slate-200 dark:border-slate-700">
						<button
							onClick={() => setActiveTab('packs')}
							className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
								activeTab === 'packs'
									? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
							}`}
						>
							Packs Disponibles
						</button>
						<button
							onClick={() => setActiveTab('create')}
							className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
								activeTab === 'create'
									? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
							}`}
						>
							Crear Reserva
						</button>
						<button
							onClick={() => setActiveTab('list')}
							className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
								activeTab === 'list'
									? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
									: 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
							}`}
						>
							Ver Reservas
						</button>
					</div>

					{/* Tab Content */}
					<div className="p-6">
						{activeTab === 'packs' && (
							<div className="space-y-6">
								{packs.length === 0 && (
									<div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
										Cargando packs disponibles…
									</div>
								)}
								{packs.length > 0 && (
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{packs.map(p => {
											const perks = (p.perks || []).filter(Boolean);
											const hasBottlePerk = perks.some(perk => perk.toLowerCase().startsWith('botella'));
											return (
												<div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
													<div className="space-y-3">
														<div className="flex items-center justify-between">
															<h3 className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</h3>
															<div className="text-sm font-bold text-blue-600 dark:text-blue-400">S/ {p.priceSoles ?? 0}</div>
														</div>
														<div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
															<div className="flex items-center gap-2">
																<span className="text-slate-400">👥</span>
																<span>{p.qrCount} códigos QR para invitados</span>
															</div>
														</div>
														{p.bottle && (
															<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
																<span>🍾</span>
																<span>Botella: {p.bottle}</span>
															</div>
														)}
														{perks.length > 0 && (
															<ul className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
																{perks.map((perk: string, index: number) => (
																	<li key={index} className={`flex items-start gap-2 ${perk.toLowerCase().startsWith('botella') ? 'font-semibold' : ''}`}>
																		<span className="mt-0.5 text-[10px] text-slate-400">●</span>
																		<span>{perk}</span>
																	</li>
																))}
															</ul>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}

						{activeTab === 'list' && (
							<div className="space-y-6">
								<div className="flex flex-col sm:flex-row sm:items-end gap-4">
									<div className="grid gap-1">
										<label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</label>
										<select className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
											<option value="">Todos</option><option value="pending_review">Pendientes</option><option value="approved">Aprobadas</option><option value="completed">Completadas</option><option value="canceled">Canceladas</option>
										</select>
									</div>
									<div className="grid gap-1 flex-1 min-w-[220px] max-w-xs">
										<label className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Buscar</label>
										<input className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="nombre, WhatsApp, doc" />
									</div>
									<button className="btn h-10 px-4" onClick={()=>{ setPage(1); load(); }}>Buscar</button>
								</div>
								{/* Listado */}
								{loading && (
									<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
										{Array.from({ length: 6 }).map((_, i) => (
											<ReservationSkeleton key={i} />
										))}
									</div>
								)}
								{!loading && empty && <div className="text-sm text-slate-500 dark:text-slate-400">No hay reservas que coincidan con los filtros</div>}
								{!loading && !empty && (
									<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
										{items.map(r=> (
											<ReservationCard
												key={r.id}
												r={r}
												busyApprove={!!busyApprove[r.id]}
												busyGenerate={!!busyGenerate[r.id]}
												onApprove={approve}
												onGenerateCards={genTokens}
												onViewCards={viewCards}
											/>
										))}
									</div>
								)}
								{/* Pagination */}
								<div className="flex items-center justify-center gap-3 pt-4">
									{(page>1) && <button className="btn h-9 px-4" onClick={()=>setPage(p=>Math.max(1,p-1))}>← Anterior</button>}
									<span className="text-sm text-slate-600 dark:text-slate-400">Página {page}</span>
									{(!empty && items.length===30) && <button className="btn h-9 px-4" onClick={()=>setPage(p=>p+1)}>Siguiente →</button>}
								</div>
							</div>
						)}

						{activeTab === 'create' && (
							<div className="space-y-5">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									<input className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" placeholder="Nombre completo" value={cName} onChange={e=>setCName(e.target.value)} />
									<input className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" placeholder="WhatsApp" value={cPhone} onChange={e=>setCPhone(e.target.value)} />
									<input className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" placeholder="Documento (DNI)" value={cDoc} onChange={e=>setCDoc(e.target.value)} />
									<input type="date" className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" value={cDate} onChange={e=>setCDate(e.target.value)} />
									<select className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" value={cSlot} onChange={e=>setCSlot(e.target.value)}>
										<option value="20:00">20:00</option><option value="21:00">21:00</option><option value="22:00">22:00</option><option value="23:00">23:00</option><option value="00:00">00:00</option>
									</select>
									<select className="h-10 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm" value={cPack} onChange={e=>setCPack(e.target.value)}>
										<option value="">Seleccionar pack…</option>
										{packs.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
									</select>
								</div>
								{cPack && (()=>{ const sel=packs.find(p=>p.id===cPack); if(!sel) return null; const perks=(sel.perks||[]).filter(Boolean); return (
									<div className="mt-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
										<div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Pack seleccionado: {sel.name}</div>
										{sel.bottle && <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><span>🍾</span><span>Botella: {sel.bottle}</span></div>}
										{perks.length>0 && <ul className="mt-2 space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">{perks.map((pk: string)=> <li key={pk} className="flex items-start gap-2"><span className="mt-0.5 text-[10px] text-slate-400">●</span><span>{pk}</span></li>)}</ul>}
									</div> ); })()}
								<div className="flex justify-end">
									<button disabled={creating} onClick={submitCreate} className="btn h-10 px-6">{creating? 'Guardando…':'Guardar Reserva'}</button>
								</div>
							</div>
						)}

					</div>
				</div>
			</div>
		</div>
	);
}
