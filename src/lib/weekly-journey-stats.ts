import { prisma } from '@/lib/prisma';

type WeekRange = {
  weekStart: string;
  weekEnd: string;
  label: string;
  startDate: Date;
  endDate: Date;
  businessDays: string[];
};

type WeeklyOperationalStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  completeRecords: number;
  incompleteShifts: number;
  missingExitCount: number;
  totalRecords: number;
  incidentCount: number;
  incidentDays: Array<{ businessDay: string; comment: string }>;
};

type WeeklyQrStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  reusableScans: number;
  totalQrSales: number;
  braceletsRedeemed: number;
  braceletsIssued: number;
};

type WeeklyBirthdayStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  reservations: number;
  arrived: number;
  noShow: number;
};

type WeeklyRatingStat = {
  weekStart: string;
  weekEnd: string;
  label: string;
  maloCnt: number;
  regularCnt: number;
  buenoCnt: number;
  muyBuenoCnt: number;
  daysRated: number;
};

type WeeklyProductSeries = {
  weekStart: string;
  weekEnd: string;
  label: string;
  total: number;
  products: Record<string, number>;
};

type ProductSeriesResponse = {
  weeks: WeeklyProductSeries[];
  productKeys: string[];
  /** Suma de usedCount de todos los tokens del grupo — incluye escaneos pre-tracking sin fecha. */
  historicalTotal?: number;
};

type IncidentMention = {
  businessDay: string;
  personId: string;
  collaborator: string;
  area: string | null;
  reason: string;
};

type CollaboratorIncidentRankingItem = {
  personId: string;
  collaborator: string;
  area: string | null;
  incidents: number;
  previousIncidents: number;
  trend: number;
  reasons: string[];
};

type AlertItem = {
  type: 'incident' | 'product-growth' | 'roll-banner' | 'birthday' | 'bracelets';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
};

type WeeklyDashboardData = {
  anchorWeekStart: string;
  kpiWeek: { weekStart: string; weekEnd: string; label: string };
  weeks: Array<{ weekStart: string; weekEnd: string; label: string }>;
  kpis: {
    completeRecords: number;
    incompleteShifts: number;
    missingExitCount: number;
    reusableScans: number;
    braceletsRedeemed: number;
    birthdaysArrived: number;
    braceletsIssued: number;
  };
  operationalStats: WeeklyOperationalStat[];
  qrStats: WeeklyQrStat[];
  barProducts: ProductSeriesResponse;
  rollBannerProducts: ProductSeriesResponse;
  domingoProducts: ProductSeriesResponse;
  pulserasCanjeadas: ProductSeriesResponse;
  birthdayStats: WeeklyBirthdayStat[];
  ratingStats: WeeklyRatingStat[];
  collaboratorIncidentRanking: CollaboratorIncidentRankingItem[];
  alerts: AlertItem[];
  notes: {
    pulserasCanjeadas: string;
  };
};

const DEFAULT_WEEK_COUNT = 8;
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const SPANISH_DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
});

const SPANISH_SHORT_DAY_FORMATTER = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
});

function isWeekActive(input: {
  operational?: WeeklyOperationalStat;
  qr?: WeeklyQrStat;
  birthdays?: WeeklyBirthdayStat;
  bar?: WeeklyProductSeries;
  roll?: WeeklyProductSeries;
  pulseras?: WeeklyProductSeries;
}) {
  return Boolean(
    (input.operational?.totalRecords || 0) > 0 ||
      (input.operational?.incidentCount || 0) > 0 ||
      (input.qr?.reusableScans || 0) > 0 ||
      (input.qr?.totalQrSales || 0) > 0 ||
      (input.qr?.braceletsRedeemed || 0) > 0 ||
      (input.qr?.braceletsIssued || 0) > 0 ||
      (input.birthdays?.reservations || 0) > 0 ||
      (input.bar?.total || 0) > 0 ||
      (input.roll?.total || 0) > 0 ||
      (input.pulseras?.total || 0) > 0
  );
}

/**
 * Índice de la semana de referencia para KPIs.
 * Usa criterios estrictos: solo cuenta actividad real (registros, escaneos, cumpleaños llegados).
 * No incluye bar/roll/pulseras (pueden tener datos en la semana actual antes de que haya
 * escaneos de personal) ni reservas de cumpleaños futuras (no son actividad real todavía).
 */
function findKpiWeekIndex(input: {
  operationalStats: WeeklyOperationalStat[];
  qrStats: WeeklyQrStat[];
  birthdayStats: WeeklyBirthdayStat[];
}) {
  const maxLength = Math.max(input.operationalStats.length, input.qrStats.length, input.birthdayStats.length);
  for (let i = maxLength - 1; i >= 0; i -= 1) {
    const hasOp =
      (input.operationalStats[i]?.totalRecords || 0) > 0 ||
      (input.operationalStats[i]?.incidentCount || 0) > 0;
    const hasQr =
      (input.qrStats[i]?.reusableScans || 0) > 0 ||
      (input.qrStats[i]?.totalQrSales || 0) > 0 ||
      (input.qrStats[i]?.braceletsRedeemed || 0) > 0 ||
      (input.qrStats[i]?.braceletsIssued || 0) > 0;
    const hasBirthday = (input.birthdayStats[i]?.arrived || 0) > 0;
    if (hasOp || hasQr || hasBirthday) return i;
  }
  return Math.max(0, maxLength - 1);
}

function findLatestActiveWeekIndex(input: {
  operationalStats: WeeklyOperationalStat[];
  qrStats: WeeklyQrStat[];
  birthdayStats: WeeklyBirthdayStat[];
  barProducts?: ProductSeriesResponse;
  rollBannerProducts?: ProductSeriesResponse;
  pulserasCanjeadas?: ProductSeriesResponse;
}) {
  const maxLength = Math.max(
    input.operationalStats.length,
    input.qrStats.length,
    input.birthdayStats.length,
    input.barProducts?.weeks.length ?? 0,
    input.rollBannerProducts?.weeks.length ?? 0,
    input.pulserasCanjeadas?.weeks.length ?? 0
  );

  for (let index = maxLength - 1; index >= 0; index -= 1) {
    if (
      isWeekActive({
        operational: input.operationalStats[index],
        qr: input.qrStats[index],
        birthdays: input.birthdayStats[index],
        bar: input.barProducts?.weeks[index],
        roll: input.rollBannerProducts?.weeks[index],
        pulseras: input.pulserasCanjeadas?.weeks[index],
      })
    ) {
      return index;
    }
  }

  return Math.max(0, maxLength - 1);
}

function toUtcMidday(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

function toDayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatLongSpanishDayMonth(date: Date) {
  return SPANISH_DAY_MONTH_FORMATTER.format(date);
}

function getMonday(day: string) {
  const date = toUtcMidday(day);
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDayString(date);
}

function buildWeekRange(weekStart: string): WeekRange {
  const startDate = toUtcMidday(weekStart);
  const businessDays: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const current = new Date(startDate);
    current.setUTCDate(current.getUTCDate() + index);
    businessDays.push(toDayString(current));
  }
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return {
    weekStart,
    weekEnd: toDayString(endDate),
    label: `${formatLongSpanishDayMonth(startDate)} al ${formatLongSpanishDayMonth(endDate)}`,
    startDate,
    endDate,
    businessDays,
  };
}

function buildWeekRanges(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const anchorWeekStart = getMonday(anchorDay);
  const ranges: WeekRange[] = [];
  const anchorDate = toUtcMidday(anchorWeekStart);
  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const weekDate = new Date(anchorDate);
    weekDate.setUTCDate(weekDate.getUTCDate() - offset * 7);
    ranges.push(buildWeekRange(toDayString(weekDate)));
  }
  return { anchorWeekStart, ranges };
}

function businessDayToAttendanceWindow(day: string) {
  // Attendance window: 10:00 Lima (UTC-5) = 15:00 UTC on the business day,
  // through 10:00 Lima next calendar day = 15:00 UTC next day (exclusive).
  // Uses Date.UTC to be timezone-agnostic regardless of server locale.
  const [year, month, date] = day.split('-').map(Number);
  return {
    startUtc: new Date(Date.UTC(year, month - 1, date, 15, 0, 0, 0)),
    endUtc: new Date(Date.UTC(year, month - 1, date + 1, 15, 0, 0, 0)),
  };
}

function businessDayToFunctionalWindow(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return {
    startUtc: new Date(Date.UTC(year, month - 1, date, 5, 0, 0, 0)),
    endUtc: new Date(Date.UTC(year, month - 1, date + 1, 4, 59, 59, 999)),
  };
}

function normalizeText(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeProductLabel(label: string) {
  return label
    .replace(/[–—]/g, '-')
    .replace(/\s+s\/\.?\s*\d+[\d.,]*/gi, '')
    .replace(/\s+-\s*\d+[\d.,]*/g, '')
    .replace(/\s*-+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCanonicalLabel(label: string, knownLabels: string[]) {
  const normalized = normalizeText(label);
  const matched = knownLabels.find((item) => normalizeText(item) === normalized);
  return matched ?? label;
}

function classifyReusableProduct(groupName: string | null | undefined, label: string) {
  const normalizedGroup = normalizeText(groupName);
  const normalizedLabel = normalizeText(label);

  if (normalizedGroup.includes('barra')) return 'bar';
  if (normalizedGroup.includes('roll') || normalizedGroup.includes('banner')) return 'roll-banner';
  if (normalizedGroup.includes('domingo')) return 'domingo';

  if (normalizedLabel.includes('ktboom')) return 'roll-banner';
  if (normalizedLabel.includes('tampico')) return 'roll-banner';
  if (normalizedLabel.includes('old times') || normalizedLabel.includes('passport') || normalizedLabel.includes('coca cola')) return 'bar';

  return null;
}

function splitCommentIntoChunks(comment: string) {
  return comment
    .split(/\n|\.|;|\u2022|\*|\-/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function buildIncidentReason(chunk: string) {
  const normalized = normalizeText(chunk);
  if (normalized.includes('no marco') && normalized.includes('ingreso') && normalized.includes('salida')) {
    return 'No marco ingreso ni salida';
  }
  if (normalized.includes('no marco') && normalized.includes('salida')) {
    return 'No marco salida';
  }
  if (normalized.includes('no marco') && normalized.includes('ingreso')) {
    return 'No marco ingreso';
  }
  if (normalized.includes('sin salida')) {
    return 'Sin salida registrada';
  }
  return chunk.trim();
}

function buildWeekIndex<T extends { weekStart: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.weekStart, row]));
}

async function getPersonDirectory() {
  const people = await prisma.person.findMany({
    select: { id: true, name: true, area: true, active: true },
    where: { active: true },
  });

  return people.map((person) => ({
    ...person,
    normalizedName: normalizeText(person.name),
  }));
}

async function getIncidentMentionsForRange(ranges: WeekRange[]) {
  const comments = await prisma.dailyEvaluation.findMany({
    where: {
      businessDay: {
        gte: ranges[0]?.weekStart,
        lte: ranges[ranges.length - 1]?.weekEnd,
      },
      comment: { not: null },
    },
    select: {
      businessDay: true,
      comment: true,
    },
    orderBy: { businessDay: 'asc' },
  });

  const people = await getPersonDirectory();
  const mentions: IncidentMention[] = [];

  for (const row of comments) {
    const comment = row.comment?.trim();
    if (!comment) continue;

    for (const chunk of splitCommentIntoChunks(comment)) {
      const normalizedChunk = normalizeText(chunk);
      if (!normalizedChunk || !/(no marco|sin salida|ingreso|salida|trabajo)/.test(normalizedChunk)) {
        continue;
      }

      const matchedPeople = people.filter((person) => {
        if (!person.normalizedName) return false;
        return normalizedChunk.includes(person.normalizedName);
      });

      for (const person of matchedPeople) {
        mentions.push({
          businessDay: row.businessDay,
          personId: person.id,
          collaborator: person.name,
          area: person.area,
          reason: buildIncidentReason(chunk),
        });
      }
    }
  }

  return mentions;
}

export async function getWeeklyOperationalStats(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const businessDays = ranges.flatMap((range) => range.businessDays);

  const scans = await prisma.scan.findMany({
    where: { businessDay: { in: businessDays } },
    select: {
      businessDay: true,
      personId: true,
      type: true,
      scannedAt: true,
    },
    orderBy: [{ businessDay: 'asc' }, { scannedAt: 'asc' }],
  });

  const evaluationsWithComment = await prisma.dailyEvaluation.findMany({
    where: { businessDay: { in: businessDays }, comment: { not: null } },
    select: { businessDay: true, comment: true },
  });
  const commentsByWeek = new Map<string, Array<{ businessDay: string; comment: string }>>();
  for (const ev of evaluationsWithComment) {
    if (!ev.comment?.trim()) continue;
    const weekStart = getMonday(ev.businessDay);
    if (!commentsByWeek.has(weekStart)) commentsByWeek.set(weekStart, []);
    commentsByWeek.get(weekStart)!.push({ businessDay: ev.businessDay, comment: ev.comment.trim() });
  }

  const groupedByDay = new Map<string, Map<string, { hasIn: boolean; hasOut: boolean }>>();
  for (const scan of scans) {
    if (!groupedByDay.has(scan.businessDay)) {
      groupedByDay.set(scan.businessDay, new Map());
    }
    const dayMap = groupedByDay.get(scan.businessDay)!;
    if (!dayMap.has(scan.personId)) {
      dayMap.set(scan.personId, { hasIn: false, hasOut: false });
    }
    const person = dayMap.get(scan.personId)!;
    if (scan.type === 'IN') person.hasIn = true;
    if (scan.type === 'OUT') person.hasOut = true;
  }

  return ranges.map((range) => {
    let completeRecords = 0;
    let incompleteShifts = 0;
    let missingExitCount = 0;
    let totalRecords = 0;

    for (const day of range.businessDays) {
      const dayMap = groupedByDay.get(day);
      if (!dayMap) continue;
      for (const entry of dayMap.values()) {
        totalRecords += 1;
        if (entry.hasIn && entry.hasOut) {
          completeRecords += 1;
        } else {
          incompleteShifts += 1;
          if (!entry.hasOut) missingExitCount += 1;
        }
      }
    }

    return {
      weekStart: range.weekStart,
      weekEnd: range.weekEnd,
      label: range.label,
      completeRecords,
      incompleteShifts,
      missingExitCount,
      totalRecords,
      incidentCount: (commentsByWeek.get(range.weekStart) || []).length,
      incidentDays: commentsByWeek.get(range.weekStart) || [],
    } satisfies WeeklyOperationalStat;
  });
}

export async function getWeeklyQrStats(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const firstDay = ranges[0]?.weekStart;
  const lastDay = ranges[ranges.length - 1]?.weekEnd;
  if (!firstDay || !lastDay) return [];

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;
  const firstFunctionalWindow = businessDayToFunctionalWindow(firstDay).startUtc;
  const lastFunctionalWindow = businessDayToFunctionalWindow(lastDay).endUtc;

  const [reusableDeliveries, tokenDeliveries, issuedTokens] = await Promise.all([
    prisma.reusableTokenRedemption.findMany({
      where: {
        type: 'deliver',
        createdAt: { gte: firstWindow, lt: lastWindow },
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.token.findMany({
      where: {
        deliveredAt: { gte: firstWindow, lt: lastWindow },
        batch: { isReusable: false, staticTargetUrl: null },
      },
      select: {
        deliveredAt: true,
      },
    }),
    prisma.token.findMany({
      where: {
        batch: {
          isReusable: false,
          staticTargetUrl: null,
          functionalDate: { gte: firstFunctionalWindow, lte: lastFunctionalWindow },
        },
      },
      select: {
        batch: { select: { functionalDate: true } },
      },
    }),
  ]);

  const rows = ranges.map((range) => ({
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    label: range.label,
    reusableScans: 0,
    totalQrSales: 0,
    braceletsRedeemed: 0,
    braceletsIssued: 0,
  } satisfies WeeklyQrStat));

  const byWeek = buildWeekIndex(rows);

  for (const delivery of reusableDeliveries) {
    const businessDay = toDayString(new Date(delivery.createdAt.getTime() - LIMA_OFFSET_MS));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;
    week.reusableScans += 1;
    week.totalQrSales += 1;
  }

  for (const token of tokenDeliveries) {
    if (!token.deliveredAt) continue;
    const businessDay = toDayString(new Date(token.deliveredAt.getTime() - LIMA_OFFSET_MS));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;
    week.braceletsRedeemed += 1;
  }

  for (const token of issuedTokens) {
    const functionalDate = token.batch.functionalDate;
    if (!functionalDate) continue;
    const businessDay = toDayString(new Date(functionalDate.getTime()));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;
    week.braceletsIssued += 1;
  }

  return rows;
}

async function getWeeklyReusableProducts(anchorDay: string, groupType: 'bar' | 'roll-banner' | 'domingo', weekCount = DEFAULT_WEEK_COUNT) {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const firstDay = ranges[0]?.weekStart;
  const lastDay = ranges[ranges.length - 1]?.weekEnd;
  if (!firstDay || !lastDay) return { weeks: [], productKeys: [] } satisfies ProductSeriesResponse;

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;

  const deliveries = await prisma.reusableTokenRedemption.findMany({
    where: {
      type: 'deliver',
      createdAt: { gte: firstWindow, lt: lastWindow },
    },
    select: {
      createdAt: true,
      token: {
        select: {
          prize: { select: { label: true } },
          group: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows: WeeklyProductSeries[] = ranges.map((range) => ({
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    label: range.label,
    total: 0,
    products: {},
  }));
  const byWeek = buildWeekIndex(rows);
  const totals = new Map<string, number>();

  for (const delivery of deliveries) {
    const label = normalizeProductLabel(delivery.token.prize.label);
    const classification = classifyReusableProduct(delivery.token.group?.name, label);
    if (classification !== groupType) continue;

    const businessDay = toDayString(new Date(delivery.createdAt.getTime() - LIMA_OFFSET_MS));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;
    const canonical = findCanonicalLabel(label, Array.from(totals.keys()));
    week.total += 1;
    week.products[canonical] = (week.products[canonical] || 0) + 1;
    totals.set(canonical, (totals.get(canonical) || 0) + 1);
  }

  const productKeys = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);

  for (const week of rows) {
    for (const key of productKeys) {
      week.products[key] = week.products[key] || 0;
    }
  }

  return { weeks: rows, productKeys } satisfies ProductSeriesResponse;
}

export async function getWeeklyBarProducts(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const [base, aggregate] = await Promise.all([
    getWeeklyReusableProducts(anchorDay, 'bar', weekCount),
    prisma.reusableToken.aggregate({
      where: { group: { name: { contains: 'barra', mode: 'insensitive' } } },
      _sum: { usedCount: true },
    }),
  ]);
  return { ...base, historicalTotal: aggregate._sum.usedCount ?? 0 };
}

export async function getWeeklyRollBannerProducts(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  return getWeeklyReusableProducts(anchorDay, 'roll-banner', weekCount);
}

export async function getWeeklyDomingoProducts(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const [base, aggregate] = await Promise.all([
    getWeeklyReusableProducts(anchorDay, 'domingo', weekCount),
    prisma.reusableToken.aggregate({
      where: { group: { name: { contains: 'domingo', mode: 'insensitive' } } },
      _sum: { usedCount: true },
    }),
  ]);
  return { ...base, historicalTotal: aggregate._sum.usedCount ?? 0 };
}

export async function getWeeklyPulserasCanjeadas(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const firstDay = ranges[0]?.weekStart;
  const lastDay = ranges[ranges.length - 1]?.weekEnd;
  if (!firstDay || !lastDay) return { weeks: [], productKeys: [] } satisfies ProductSeriesResponse;

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;

  const deliveries = await prisma.token.findMany({
    where: {
      deliveredAt: { gte: firstWindow, lt: lastWindow },
      batch: { isReusable: false, staticTargetUrl: null },
    },
    select: {
      deliveredAt: true,
      prize: { select: { label: true } },
    },
    orderBy: { deliveredAt: 'asc' },
  });

  const rows: WeeklyProductSeries[] = ranges.map((range) => ({
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    label: range.label,
    total: 0,
    products: {},
  }));
  const byWeek = buildWeekIndex(rows);
  const totals = new Map<string, number>();

  for (const token of deliveries) {
    if (!token.deliveredAt) continue;
    const businessDay = toDayString(new Date(token.deliveredAt.getTime() - LIMA_OFFSET_MS));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;

    week.total += 1;
    const label = normalizeProductLabel(token.prize.label);
    const canonical = findCanonicalLabel(label, Array.from(totals.keys()));
    week.products[canonical] = (week.products[canonical] || 0) + 1;
    totals.set(canonical, (totals.get(canonical) || 0) + 1);
  }

  const productKeys = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);

  for (const week of rows) {
    for (const key of productKeys) {
      week.products[key] = week.products[key] || 0;
    }
  }

  return {
    weeks: rows,
    productKeys,
  } satisfies ProductSeriesResponse;
}

export async function getWeeklyBirthdayStats(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT) {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const firstDay = ranges[0]?.weekStart;
  const lastDay = ranges[ranges.length - 1]?.weekEnd;
  if (!firstDay || !lastDay) return [];

  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      date: {
        gte: new Date(`${firstDay}T00:00:00`),
        lte: new Date(`${lastDay}T23:59:59.999`),
      },
      status: { not: 'canceled' },
    },
    select: {
      date: true,
      hostArrivedAt: true,
    },
    orderBy: { date: 'asc' },
  });

  const rows = ranges.map((range) => ({
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    label: range.label,
    reservations: 0,
    arrived: 0,
    noShow: 0,
  } satisfies WeeklyBirthdayStat));
  const byWeek = buildWeekIndex(rows);

  for (const reservation of reservations) {
    const businessDay = toDayString(new Date(reservation.date.getTime()));
    const week = byWeek.get(getMonday(businessDay));
    if (!week) continue;
    week.reservations += 1;
    if (reservation.hostArrivedAt) week.arrived += 1;
    else week.noShow += 1;
  }

  return rows;
}

async function getWeeklyRatingStats(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT): Promise<WeeklyRatingStat[]> {
  const { ranges } = buildWeekRanges(anchorDay, weekCount);
  const firstDay = ranges[0]?.weekStart;
  const lastDay = ranges[ranges.length - 1]?.weekEnd;
  if (!firstDay || !lastDay) return [];

  const evaluations = await prisma.dailyEvaluation.findMany({
    where: { businessDay: { gte: firstDay, lte: lastDay } },
    select: { businessDay: true, rating: true },
  });

  return ranges.map((range) => {
    const weekEvals = evaluations.filter(
      (e) => e.businessDay >= range.weekStart && e.businessDay <= range.weekEnd,
    );
    const maloCnt = weekEvals.filter((e) => e.rating === 'MALO').length;
    const regularCnt = weekEvals.filter((e) => e.rating === 'REGULAR').length;
    const buenoCnt = weekEvals.filter((e) => e.rating === 'BUENO').length;
    const muyBuenoCnt = weekEvals.filter((e) => e.rating === 'MUY_BUENO').length;
    const daysRated = maloCnt + regularCnt + buenoCnt + muyBuenoCnt;
    return {
      weekStart: range.weekStart,
      weekEnd: range.weekEnd,
      label: range.label,
      maloCnt,
      regularCnt,
      buenoCnt,
      muyBuenoCnt,
      daysRated,
    } satisfies WeeklyRatingStat;
  });
}

export async function getCollaboratorIncidentRanking(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT, referenceWeekStart?: string) {
  const { anchorWeekStart, ranges } = buildWeekRanges(anchorDay, weekCount);
  const mentions = await getIncidentMentionsForRange(ranges);
  const currentWeekStart = referenceWeekStart || anchorWeekStart;
  const currentWeek = new Set(buildWeekRange(currentWeekStart).businessDays);
  const previousWeekStartDate = toUtcMidday(currentWeekStart);
  previousWeekStartDate.setUTCDate(previousWeekStartDate.getUTCDate() - 7);
  const previousWeek = new Set(buildWeekRange(toDayString(previousWeekStartDate)).businessDays);

  const ranking = new Map<string, CollaboratorIncidentRankingItem>();

  for (const mention of mentions) {
    const isCurrent = currentWeek.has(mention.businessDay);
    const isPrevious = previousWeek.has(mention.businessDay);
    if (!isCurrent && !isPrevious) continue;

    if (!ranking.has(mention.personId)) {
      ranking.set(mention.personId, {
        personId: mention.personId,
        collaborator: mention.collaborator,
        area: mention.area,
        incidents: 0,
        previousIncidents: 0,
        trend: 0,
        reasons: [],
      });
    }

    const item = ranking.get(mention.personId)!;
    if (isCurrent) {
      item.incidents += 1;
      if (!item.reasons.includes(mention.reason)) item.reasons.push(mention.reason);
    }
    if (isPrevious) item.previousIncidents += 1;
  }

  return Array.from(ranking.values())
    .map((item) => ({
      ...item,
      trend: item.incidents - item.previousIncidents,
      reasons: item.reasons.slice(0, 3),
    }))
    .filter((item) => item.incidents > 0 || item.previousIncidents > 0)
    .sort((left, right) => right.incidents - left.incidents || right.trend - left.trend || left.collaborator.localeCompare(right.collaborator));
}

function buildAlerts(input: {
  qrStats: WeeklyQrStat[];
  barProducts: ProductSeriesResponse;
  rollBannerProducts: ProductSeriesResponse;
  birthdayStats: WeeklyBirthdayStat[];
  collaboratorIncidentRanking: CollaboratorIncidentRankingItem[];
  referenceWeekIndex: number;
}) {
  const alerts: AlertItem[] = [];
  const currentQr = input.qrStats[input.referenceWeekIndex];
  const previousQr = input.qrStats[input.referenceWeekIndex - 1];
  const currentBirthdays = input.birthdayStats[input.referenceWeekIndex];
  const currentBar = input.barProducts.weeks[input.referenceWeekIndex];
  const previousBar = input.barProducts.weeks[input.referenceWeekIndex - 1];
  const currentRoll = input.rollBannerProducts.weeks[input.referenceWeekIndex];

  for (const item of input.collaboratorIncidentRanking) {
    if (item.incidents > 2) {
      alerts.push({
        type: 'incident',
        severity: 'critical',
        title: `${item.collaborator} supera el umbral de incidencias`,
        message: `${item.incidents} incidencias en 7 dias${item.area ? ` en ${item.area}` : ''}.`,
      });
    }
  }

  if (currentBar && previousBar) {
    for (const product of input.barProducts.productKeys) {
      const currentValue = currentBar.products[product] || 0;
      const previousValue = previousBar.products[product] || 0;
      if (currentValue >= previousValue + 3 && currentValue >= 4) {
        alerts.push({
          type: 'product-growth',
          severity: 'info',
          title: `${product} acelera en barra`,
          message: `Sube de ${previousValue} a ${currentValue} ventas semanales.`,
        });
        break;
      }
    }
  }

  if (currentRoll && currentRoll.total >= 5) {
    const bestRoll = input.rollBannerProducts.productKeys
      .map((product) => ({ product, total: currentRoll.products[product] || 0 }))
      .sort((left, right) => right.total - left.total)[0];
    if (bestRoll?.total > 0) {
      alerts.push({
        type: 'roll-banner',
        severity: 'info',
        title: `${bestRoll.product} destaca en roll banner`,
        message: `${bestRoll.total} activaciones en la semana actual.`,
      });
    }
  }

  if (currentBirthdays && currentBirthdays.noShow >= 3) {
    alerts.push({
      type: 'birthday',
      severity: 'warning',
      title: 'Cumpleanos con inasistencia alta',
      message: `${currentBirthdays.noShow} reservas no llegaron esta semana.`,
    });
  }

  if (currentQr && currentQr.braceletsIssued > 0) {
    const gap = currentQr.braceletsIssued - currentQr.braceletsRedeemed;
    if (gap >= 5 && currentQr.braceletsRedeemed <= currentQr.braceletsIssued * 0.5) {
      alerts.push({
        type: 'bracelets',
        severity: 'warning',
        title: 'Pulseras canjeadas por debajo del ritmo esperado',
        message: `${currentQr.braceletsRedeemed} canjeadas frente a ${currentQr.braceletsIssued} pulseras del lote semanal.`,
      });
    }
  }

  if (currentQr && previousQr && currentQr.reusableScans >= previousQr.reusableScans + 5) {
    alerts.push({
      type: 'product-growth',
      severity: 'info',
      title: 'QR reutilizables aceleran su uso',
      message: `Escaneos suben de ${previousQr.reusableScans} a ${currentQr.reusableScans}.`,
    });
  }

  return alerts.slice(0, 5);
}

export async function getWeeklyJourneyDashboard(anchorDay: string, weekCount = DEFAULT_WEEK_COUNT): Promise<WeeklyDashboardData> {
  const { anchorWeekStart, ranges } = buildWeekRanges(anchorDay, weekCount);
  const [
    operationalStats,
    qrStats,
    barProducts,
    rollBannerProducts,
    domingoProducts,
    pulserasCanjeadas,
    birthdayStats,
    ratingStats,
  ] = await Promise.all([
    getWeeklyOperationalStats(anchorDay, weekCount),
    getWeeklyQrStats(anchorDay, weekCount),
    getWeeklyBarProducts(anchorDay, weekCount),
    getWeeklyRollBannerProducts(anchorDay, weekCount),
    getWeeklyDomingoProducts(anchorDay, weekCount),
    getWeeklyPulserasCanjeadas(anchorDay, weekCount),
    getWeeklyBirthdayStats(anchorDay, weekCount),
    getWeeklyRatingStats(anchorDay, weekCount),
  ]);

  // kpiWeekIndex: criterio estricto — actividad real (no reservas futuras, no bar/roll).
  const kpiWeekIndex = findKpiWeekIndex({ operationalStats, qrStats, birthdayStats });
  // referenceWeekIndex: incluye todos los datos, usado para ranking de incidencias y alertas.
  const referenceWeekIndex = findLatestActiveWeekIndex({
    operationalStats,
    qrStats,
    birthdayStats,
    barProducts,
    rollBannerProducts,
    pulserasCanjeadas,
  });
  const kpiWeek = ranges[kpiWeekIndex] || ranges[referenceWeekIndex] || ranges[ranges.length - 1] || buildWeekRange(anchorWeekStart);
  const referenceWeek = ranges[referenceWeekIndex] || ranges[ranges.length - 1] || buildWeekRange(anchorWeekStart);
  const collaboratorIncidentRanking = await getCollaboratorIncidentRanking(anchorDay, weekCount, referenceWeek.weekStart);

  const currentOperational = operationalStats[kpiWeekIndex];
  const currentQr = qrStats[kpiWeekIndex];
  const currentBirthdays = birthdayStats[kpiWeekIndex];

  return {
    anchorWeekStart,
    kpiWeek: { weekStart: kpiWeek.weekStart, weekEnd: kpiWeek.weekEnd, label: kpiWeek.label },
    weeks: ranges.map((range) => ({ weekStart: range.weekStart, weekEnd: range.weekEnd, label: range.label })),
    kpis: {
      completeRecords: currentOperational?.completeRecords || 0,
      incompleteShifts: currentOperational?.incompleteShifts || 0,
      missingExitCount: currentOperational?.missingExitCount || 0,
      reusableScans: currentQr?.reusableScans || 0,
      braceletsRedeemed: currentQr?.braceletsRedeemed || 0,
      birthdaysArrived: currentBirthdays?.arrived || 0,
      braceletsIssued: currentQr?.braceletsIssued || 0,
    },
    operationalStats,
    qrStats,
    barProducts,
    rollBannerProducts,
    domingoProducts,
    pulserasCanjeadas,
    birthdayStats,
    ratingStats,
    collaboratorIncidentRanking,
    alerts: buildAlerts({ qrStats, barProducts, rollBannerProducts, birthdayStats, collaboratorIncidentRanking, referenceWeekIndex }),
    notes: {
      pulserasCanjeadas: '',
    },
  };
}

// ─────────────────────────────────────────────
// Daily dashboard (granularity = 'day')
// ─────────────────────────────────────────────

type DayEntry = { businessDay: string; label: string };

function buildDayLabel(day: string): string {
  return SPANISH_SHORT_DAY_FORMATTER.format(toUtcMidday(day));
}

function buildDayEntries(anchorDay: string, dayCount: number): DayEntry[] {
  const anchor = toUtcMidday(anchorDay);
  const entries: DayEntry[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - offset);
    const dayStr = toDayString(d);
    entries.push({ businessDay: dayStr, label: buildDayLabel(dayStr) });
  }
  return entries;
}

async function getDailyOperationalStats(days: DayEntry[]): Promise<WeeklyOperationalStat[]> {
  const businessDays = days.map((d) => d.businessDay);
  const [scans, evaluations] = await Promise.all([
    prisma.scan.findMany({
      where: { businessDay: { in: businessDays } },
      select: { businessDay: true, personId: true, type: true },
    }),
    prisma.dailyEvaluation.findMany({
      where: { businessDay: { in: businessDays }, comment: { not: null } },
      select: { businessDay: true, comment: true },
    }),
  ]);

  const commentsByDay = new Map<string, string>();
  for (const ev of evaluations) {
    if (ev.comment?.trim()) commentsByDay.set(ev.businessDay, ev.comment.trim());
  }

  const groupedByDay = new Map<string, Map<string, { hasIn: boolean; hasOut: boolean }>>();
  for (const scan of scans) {
    if (!groupedByDay.has(scan.businessDay)) groupedByDay.set(scan.businessDay, new Map());
    const dayMap = groupedByDay.get(scan.businessDay)!;
    if (!dayMap.has(scan.personId)) dayMap.set(scan.personId, { hasIn: false, hasOut: false });
    const person = dayMap.get(scan.personId)!;
    if (scan.type === 'IN') person.hasIn = true;
    if (scan.type === 'OUT') person.hasOut = true;
  }

  return days.map(({ businessDay, label }) => {
    let completeRecords = 0, incompleteShifts = 0, missingExitCount = 0, totalRecords = 0;
    const dayMap = groupedByDay.get(businessDay);
    if (dayMap) {
      for (const entry of dayMap.values()) {
        totalRecords += 1;
        if (entry.hasIn && entry.hasOut) {
          completeRecords += 1;
        } else {
          incompleteShifts += 1;
          if (!entry.hasOut) missingExitCount += 1;
        }
      }
    }
    const comment = commentsByDay.get(businessDay);
    const incidentDays = comment ? [{ businessDay, comment }] : [];
    return {
      weekStart: businessDay, weekEnd: businessDay, label,
      completeRecords, incompleteShifts, missingExitCount, totalRecords,
      incidentCount: incidentDays.length,
      incidentDays,
    } satisfies WeeklyOperationalStat;
  });
}

async function getDailyQrStats(days: DayEntry[]): Promise<WeeklyQrStat[]> {
  const firstDay = days[0]?.businessDay;
  const lastDay = days[days.length - 1]?.businessDay;
  if (!firstDay || !lastDay) return [];

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;
  const firstFunctionalWindow = businessDayToFunctionalWindow(firstDay).startUtc;
  const lastFunctionalWindow = businessDayToFunctionalWindow(lastDay).endUtc;

  const [reusableDeliveries, tokenDeliveries, issuedTokens] = await Promise.all([
    prisma.reusableTokenRedemption.findMany({
      where: { type: 'deliver', createdAt: { gte: firstWindow, lt: lastWindow } },
      select: { createdAt: true },
    }),
    prisma.token.findMany({
      where: { deliveredAt: { gte: firstWindow, lt: lastWindow }, batch: { isReusable: false, staticTargetUrl: null } },
      select: { deliveredAt: true },
    }),
    prisma.token.findMany({
      where: { batch: { isReusable: false, staticTargetUrl: null, functionalDate: { gte: firstFunctionalWindow, lte: lastFunctionalWindow } } },
      select: { batch: { select: { functionalDate: true } } },
    }),
  ]);

  const rows: WeeklyQrStat[] = days.map(({ businessDay, label }) => ({
    weekStart: businessDay, weekEnd: businessDay, label,
    reusableScans: 0, totalQrSales: 0, braceletsRedeemed: 0, braceletsIssued: 0,
  }));
  const byDay = new Map(rows.map((r) => [r.weekStart, r]));

  for (const delivery of reusableDeliveries) {
    const day = toDayString(new Date(delivery.createdAt.getTime() - LIMA_OFFSET_MS));
    const row = byDay.get(day);
    if (!row) continue;
    row.reusableScans += 1;
    row.totalQrSales += 1;
  }
  for (const token of tokenDeliveries) {
    if (!token.deliveredAt) continue;
    const day = toDayString(new Date(token.deliveredAt.getTime() - LIMA_OFFSET_MS));
    const row = byDay.get(day);
    if (row) row.braceletsRedeemed += 1;
  }
  for (const token of issuedTokens) {
    const fd = token.batch.functionalDate;
    if (!fd) continue;
    const day = toDayString(new Date(fd.getTime()));
    const row = byDay.get(day);
    if (row) row.braceletsIssued += 1;
  }
  return rows;
}

async function getDailyReusableProducts(days: DayEntry[], groupType: 'bar' | 'roll-banner' | 'domingo'): Promise<ProductSeriesResponse> {
  const firstDay = days[0]?.businessDay;
  const lastDay = days[days.length - 1]?.businessDay;
  if (!firstDay || !lastDay) return { weeks: [], productKeys: [] };

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;

  const deliveries = await prisma.reusableTokenRedemption.findMany({
    where: { type: 'deliver', createdAt: { gte: firstWindow, lt: lastWindow } },
    select: {
      createdAt: true,
      token: { select: { prize: { select: { label: true } }, group: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows: WeeklyProductSeries[] = days.map(({ businessDay, label }) => ({
    weekStart: businessDay, weekEnd: businessDay, label, total: 0, products: {},
  }));
  const byDay = new Map(rows.map((r) => [r.weekStart, r]));
  const totals = new Map<string, number>();

  for (const delivery of deliveries) {
    const label = normalizeProductLabel(delivery.token.prize.label);
    const classification = classifyReusableProduct(delivery.token.group?.name, label);
    if (classification !== groupType) continue;
    const day = toDayString(new Date(delivery.createdAt.getTime() - LIMA_OFFSET_MS));
    const row = byDay.get(day);
    if (!row) continue;
    const canonical = findCanonicalLabel(label, Array.from(totals.keys()));
    row.total += 1;
    row.products[canonical] = (row.products[canonical] || 0) + 1;
    totals.set(canonical, (totals.get(canonical) || 0) + 1);
  }

  const productKeys = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  for (const row of rows) {
    for (const key of productKeys) row.products[key] = row.products[key] || 0;
  }
  return { weeks: rows, productKeys };
}

async function getDailyPulserasCanjeadas(days: DayEntry[]): Promise<ProductSeriesResponse> {
  const firstDay = days[0]?.businessDay;
  const lastDay = days[days.length - 1]?.businessDay;
  if (!firstDay || !lastDay) return { weeks: [], productKeys: [] };

  const firstWindow = businessDayToAttendanceWindow(firstDay).startUtc;
  const lastWindow = businessDayToAttendanceWindow(lastDay).endUtc;

  const deliveries = await prisma.token.findMany({
    where: { deliveredAt: { gte: firstWindow, lt: lastWindow }, batch: { isReusable: false, staticTargetUrl: null } },
    select: { deliveredAt: true, prize: { select: { label: true } } },
    orderBy: { deliveredAt: 'asc' },
  });

  const rows: WeeklyProductSeries[] = days.map(({ businessDay, label }) => ({
    weekStart: businessDay, weekEnd: businessDay, label, total: 0, products: {},
  }));
  const byDay = new Map(rows.map((r) => [r.weekStart, r]));
  const totals = new Map<string, number>();

  for (const token of deliveries) {
    if (!token.deliveredAt) continue;
    const day = toDayString(new Date(token.deliveredAt.getTime() - LIMA_OFFSET_MS));
    const row = byDay.get(day);
    if (!row) continue;
    const label = normalizeProductLabel(token.prize.label);
    const canonical = findCanonicalLabel(label, Array.from(totals.keys()));
    row.total += 1;
    row.products[canonical] = (row.products[canonical] || 0) + 1;
    totals.set(canonical, (totals.get(canonical) || 0) + 1);
  }

  const productKeys = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  for (const row of rows) {
    for (const key of productKeys) row.products[key] = row.products[key] || 0;
  }
  return { weeks: rows, productKeys };
}

async function getDailyBirthdayStats(days: DayEntry[]): Promise<WeeklyBirthdayStat[]> {
  const firstDay = days[0]?.businessDay;
  const lastDay = days[days.length - 1]?.businessDay;
  if (!firstDay || !lastDay) return [];

  const reservations = await prisma.birthdayReservation.findMany({
    where: {
      date: { gte: new Date(`${firstDay}T00:00:00`), lte: new Date(`${lastDay}T23:59:59.999`) },
      status: { not: 'canceled' },
    },
    select: { date: true, hostArrivedAt: true },
  });

  const rows: WeeklyBirthdayStat[] = days.map(({ businessDay, label }) => ({
    weekStart: businessDay, weekEnd: businessDay, label,
    reservations: 0, arrived: 0, noShow: 0,
  }));
  const byDay = new Map(rows.map((r) => [r.weekStart, r]));

  for (const res of reservations) {
    const day = toDayString(res.date);
    const row = byDay.get(day);
    if (!row) continue;
    row.reservations += 1;
    if (res.hostArrivedAt) row.arrived += 1;
    else row.noShow += 1;
  }
  return rows;
}

async function getDailyRatingStats(days: DayEntry[]): Promise<WeeklyRatingStat[]> {
  const firstDay = days[0]?.businessDay;
  const lastDay = days[days.length - 1]?.businessDay;
  if (!firstDay || !lastDay) return [];

  const evaluations = await prisma.dailyEvaluation.findMany({
    where: { businessDay: { gte: firstDay, lte: lastDay } },
    select: { businessDay: true, rating: true },
  });

  return days.map(({ businessDay, label }) => {
    const e = evaluations.find((ev) => ev.businessDay === businessDay);
    const maloCnt = e?.rating === 'MALO' ? 1 : 0;
    const regularCnt = e?.rating === 'REGULAR' ? 1 : 0;
    const buenoCnt = e?.rating === 'BUENO' ? 1 : 0;
    const muyBuenoCnt = e?.rating === 'MUY_BUENO' ? 1 : 0;
    const daysRated = maloCnt + regularCnt + buenoCnt + muyBuenoCnt;
    return {
      weekStart: businessDay,
      weekEnd: businessDay,
      label,
      maloCnt,
      regularCnt,
      buenoCnt,
      muyBuenoCnt,
      daysRated,
    } satisfies WeeklyRatingStat;
  });
}

export async function getDailyJourneyDashboard(anchorDay: string, dayCount: number): Promise<WeeklyDashboardData> {
  const days = buildDayEntries(anchorDay, dayCount);
  const firstDay = days[0]?.businessDay ?? anchorDay;
  const lastDay = days[days.length - 1]?.businessDay ?? anchorDay;

  const [operationalStats, qrStats, barBase, rollBannerProducts, domingoBase, pulserasCanjeadas, birthdayStats, ratingStats, barAggregate, domingoAggregate] =
    await Promise.all([
      getDailyOperationalStats(days),
      getDailyQrStats(days),
      getDailyReusableProducts(days, 'bar'),
      getDailyReusableProducts(days, 'roll-banner'),
      getDailyReusableProducts(days, 'domingo'),
      getDailyPulserasCanjeadas(days),
      getDailyBirthdayStats(days),
      getDailyRatingStats(days),
      prisma.reusableToken.aggregate({
        where: { group: { name: { contains: 'barra', mode: 'insensitive' } } },
        _sum: { usedCount: true },
      }),
      prisma.reusableToken.aggregate({
        where: { group: { name: { contains: 'domingo', mode: 'insensitive' } } },
        _sum: { usedCount: true },
      }),
    ]);

  const barProducts: ProductSeriesResponse = { ...barBase, historicalTotal: barAggregate._sum.usedCount ?? 0 };
  const domingoProducts: ProductSeriesResponse = { ...domingoBase, historicalTotal: domingoAggregate._sum.usedCount ?? 0 };

  return {
    anchorWeekStart: firstDay,
    kpiWeek: {
      weekStart: firstDay,
      weekEnd: lastDay,
      label: `${days[0]?.label ?? ''} al ${days[days.length - 1]?.label ?? ''}`,
    },
    weeks: days.map((d) => ({ weekStart: d.businessDay, weekEnd: d.businessDay, label: d.label })),
    kpis: { completeRecords: 0, incompleteShifts: 0, missingExitCount: 0, reusableScans: 0, braceletsRedeemed: 0, birthdaysArrived: 0, braceletsIssued: 0 },
    operationalStats,
    qrStats,
    barProducts,
    rollBannerProducts,
    domingoProducts,
    pulserasCanjeadas,
    birthdayStats,
    ratingStats,
    collaboratorIncidentRanking: [],
    alerts: [],
    notes: { pulserasCanjeadas: '' },
  };
}