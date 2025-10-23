import { DateTime } from 'luxon';

export class OfferTimeUtils {
  static readonly TIMEZONE = 'America/Lima';

  static isOfferAvailable(offer: {
    isActive: boolean;
    validFrom?: Date;
    validUntil?: Date;
    availableDays?: number[];
    startTime?: string;
    endTime?: string;
  }): boolean {
    if (!offer.isActive) return false;

    const now = DateTime.now().setZone(this.TIMEZONE);

    // Verificar rango de fechas
    if (offer.validFrom && now < DateTime.fromJSDate(offer.validFrom).setZone(this.TIMEZONE)) {
      return false;
    }
    if (offer.validUntil && now > DateTime.fromJSDate(offer.validUntil).setZone(this.TIMEZONE)) {
      return false;
    }

    // Verificar días de la semana
    if (offer.availableDays && offer.availableDays.length > 0) {
      // @ts-ignore - weekday property exists in Luxon DateTime
      const currentDay = (now.weekday % 7); // Luxon: 1=lunes, 7=domingo -> convertir a 0=domingo
      if (!offer.availableDays.includes(currentDay)) {
        return false;
      }
    }

    // Verificar horario del día
    if (offer.startTime && offer.endTime) {
      const [startHour, startMinute] = offer.startTime.split(':').map(Number);
      const [endHour, endMinute] = offer.endTime.split(':').map(Number);

      const startOfDay = now.startOf('day').plus({ hours: startHour, minutes: startMinute });
      const endOfDay = now.startOf('day').plus({ hours: endHour, minutes: endMinute });

      if (now < startOfDay || now > endOfDay) {
        return false;
      }
    }

    return true;
  }

  static getNextAvailableTime(offer: {
    validFrom?: Date;
    validUntil?: Date;
    availableDays?: number[];
    startTime?: string;
    endTime?: string;
  }): DateTime | null {
    const now = DateTime.now().setZone(this.TIMEZONE);

    // Si no hay restricciones temporales, está disponible ahora
    if (!offer.validFrom && !offer.validUntil && !offer.availableDays && !offer.startTime && !offer.endTime) {
      return now;
    }

    // Verificar si está disponible ahora
    if (this.isOfferAvailable({ ...offer, isActive: true })) {
      return now;
    }

    // Calcular próxima disponibilidad
    let nextTime = now;

    // Si hay fecha de inicio futura
    if (offer.validFrom && now < DateTime.fromJSDate(offer.validFrom).setZone(this.TIMEZONE)) {
      nextTime = DateTime.fromJSDate(offer.validFrom).setZone(this.TIMEZONE);
    }

    // Si hay restricciones de días/horas, encontrar el próximo horario disponible
    if (offer.availableDays && offer.availableDays.length > 0 && offer.startTime) {
      const [startHour, startMinute] = offer.startTime.split(':').map(Number);
      let candidateTime = nextTime.startOf('day').plus({ hours: startHour, minutes: startMinute });

      // Si ya pasó hoy, buscar mañana
      if (candidateTime <= now) {
        candidateTime = candidateTime.plus({ days: 1 });
      }

      // Encontrar el próximo día disponible
      for (let i = 0; i < 7; i++) {
        // @ts-ignore - weekday property exists in Luxon DateTime
        const dayOfWeek = candidateTime.weekday % 7;
        if (offer.availableDays.includes(dayOfWeek)) {
          // Verificar si está dentro del rango de fechas
          if (offer.validUntil && candidateTime > DateTime.fromJSDate(offer.validUntil).setZone(this.TIMEZONE)) {
            return null; // No hay más disponibilidad
          }
          return candidateTime;
        }
        candidateTime = candidateTime.plus({ days: 1 });
      }
    }

    return nextTime.isValid ? nextTime : null;
  }

  static formatAvailability(offer: {
    validFrom?: Date;
    validUntil?: Date;
    availableDays?: number[];
    startTime?: string;
    endTime?: string;
  }): string {
    const now = DateTime.now().setZone(this.TIMEZONE);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    if (!this.isOfferAvailable({ ...offer, isActive: true })) {
      const nextTime = this.getNextAvailableTime(offer);
      if (nextTime) {
        // @ts-ignore - toFormat method exists in Luxon DateTime
        return `Disponible desde ${nextTime.toFormat('dd/MM/yyyy HH:mm')}`;
      }
      return 'No disponible';
    }

    let availability = 'Disponible ahora';

    if (offer.availableDays && offer.availableDays.length > 0) {
      const days = offer.availableDays.map(d => dayNames[d]).join(', ');
      availability += ` (${days})`;
    }

    if (offer.startTime && offer.endTime) {
      availability += ` de ${offer.startTime} a ${offer.endTime}`;
    }

    if (offer.validUntil) {
      const until = DateTime.fromJSDate(offer.validUntil).setZone(this.TIMEZONE);
      // @ts-ignore - toFormat method exists in Luxon DateTime
      availability += ` hasta ${until.toFormat('dd/MM/yyyy')}`;
    }

    return availability;
  }

  static validateOfferTimes(data: {
    validFrom?: Date;
    validUntil?: Date;
    startTime?: string;
    endTime?: string;
  }): string[] {
    const errors = [];

    if (data.validFrom && data.validUntil && data.validFrom >= data.validUntil) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    if (data.startTime && data.endTime) {
      // @ts-ignore - fromFormat method exists in Luxon DateTime
      const start = DateTime.fromFormat(data.startTime, 'HH:mm');
      // @ts-ignore - fromFormat method exists in Luxon DateTime
      const end = DateTime.fromFormat(data.endTime, 'HH:mm');

      if (!start.isValid || !end.isValid) {
        errors.push('Formato de hora inválido (use HH:mm)');
      } else if (start >= end) {
        errors.push('La hora de inicio debe ser anterior a la hora de fin');
      }
    }

    return errors;
  }
}