const moment = require('moment');

class CalendarManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Pobiera kalendarz na miesiąc
   */
  getMonthCalendar(year, month, placowkaId = 1) {
    const start = moment(`${year}-${String(month).padStart(2, '0')}-01`);
    const end = start.clone().endOf('month');

    // Pobierz dni wolne w miesiącu
    const dniWolne = this.db.getDniWolne(placowkaId, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
    const dniWolneMap = new Map();

    dniWolne.forEach(d => {
      const from = moment(d.data_start);
      const to = moment(d.data_end);

      while (from.isSameOrBefore(to)) {
        const key = from.format('YYYY-MM-DD');
        dniWolneMap.set(key, {
          typ: d.typ,
          nazwa: d.nazwa,
          opis: d.opis
        });
        from.add(1, 'day');
      }
    });

    // Zbuduj kalendarz
    const calendar = [];
    const current = moment(`${year}-${String(month).padStart(2, '0')}-01`);

    while (current.month() === month - 1 && current.year() === year) {
      const dateStr = current.format('YYYY-MM-DD');
      const dayOfWeek = current.weekday(); // 0 = poniedziałek
      const dayNumber = current.date();

      const dzienWolny = dniWolneMap.get(dateStr);

      calendar.push({
        data: dateStr,
        dzien_tygodnia: current.format('dddd'),
        dzien_miesiaca: dayNumber,
        darmowe: dayOfWeek === 5 || dayOfWeek === 6, // sobota i niedziela
        dzien_wolny: dzienWolny || null
      });

      current.add(1, 'day');
    }

    return calendar;
  }

  /**
   * Pobiera wszystkie święta i dni wolne na rok
   */
  getHolidaysForYear(year, placowkaId = 1) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    return this.db.getDniWolne(placowkaId, start, end);
  }

  /**
   * Dodaje standardowe polskie święta
   */
  addPolishHolidays(year, placowkaId = 1) {
    const holidays = [
      { data: `${year}-01-01`, nazwa: 'Nowy Rok' },
      { data: `${year}-01-06`, nazwa: 'Epifania' },
      { data: `${year}-02-14`, nazwa: 'Dzień Zakochanych' },
      { data: `${year}-05-01`, nazwa: 'Dzień Pracy' },
      { data: `${year}-05-19`, nazwa: 'Dzień Chłopaka' },
      { data: `${year}-05-26`, nazwa: 'Dzień Matki' },
      { data: `${year}-06-23`, nazwa: 'Dzień Ojca' },
      { data: `${year}-11-01`, nazwa: 'Wszystkich Świętych' },
      { data: `${year}-11-11`, nazwa: 'Dzień Niepodległości' },
      { data: `${year}-12-25`, nazwa: 'Boże Narodzenie' },
      { data: `${year}-12-26`, nazwa: 'Drugi dzień Bożego Narodzenia' }
    ];

    const results = [];
    holidays.forEach(holiday => {
      try {
        const result = this.db.addDzienWolny({
          placowka_id: placowkaId,
          nazwa: holiday.nazwa,
          data_start: holiday.data,
          data_end: holiday.data,
          typ: 'swięto',
          opis: `Święto: ${holiday.nazwa}`
        });
        results.push({ success: true, nazwa: holiday.nazwa });
      } catch (error) {
        results.push({ success: false, nazwa: holiday.nazwa, error: error.message });
      }
    });

    return results;
  }

  /**
   * Usuwa wszystkie święta dla roku
   */
  removeAllHolidaysForYear(year, placowkaId = 1) {
    const holidays = this.getHolidaysForYear(year, placowkaId);
    holidays.forEach(h => {
      this.db.deleteDzienWolny(h.id);
    });

    return { success: true, deleted: holidays.length };
  }

  /**
   * Sprawdza czy data jest dniem pracy
   */
  isWorkingDay(data, placowkaId = 1) {
    const m = moment(data);
    
    // Sprawdź czy to weekend
    if (m.weekday() === 5 || m.weekday() === 6) {
      return false;
    }

    // Sprawdź czy to dzień wolny
    const dniWolne = this.db.getDniWolne(placowkaId, data, data);
    return dniWolne.length === 0;
  }

  /**
   * Oblicza liczbę dni pracy w okresie
   */
  countWorkingDays(dataOd, dataDo, placowkaId = 1) {
    const start = moment(dataOd);
    const end = moment(dataDo);
    let count = 0;

    while (start.isSameOrBefore(end)) {
      if (this.isWorkingDay(start.format('YYYY-MM-DD'), placowkaId)) {
        count++;
      }
      start.add(1, 'day');
    }

    return count;
  }

  /**
   * Pobiera następny dzień pracy
   */
  getNextWorkingDay(data, placowkaId = 1) {
    const start = moment(data).add(1, 'day');

    while (true) {
      if (this.isWorkingDay(start.format('YYYY-MM-DD'), placowkaId)) {
        return start.format('YYYY-MM-DD');
      }
      start.add(1, 'day');
    }
  }

  /**
   * Pobiera poprzedni dzień pracy
   */
  getPreviousWorkingDay(data, placowkaId = 1) {
    const start = moment(data).subtract(1, 'day');

    while (true) {
      if (this.isWorkingDay(start.format('YYYY-MM-DD'), placowkaId)) {
        return start.format('YYYY-MM-DD');
      }
      start.subtract(1, 'day');
    }
  }

  /**
   * Generuje raport dni wolnych w roku
   */
  generateHolidayReport(year, placowkaId = 1) {
    const holidays = this.getHolidaysForYear(year, placowkaId);
    
    const grouped = {
      swieta: [],
      dni_wolne: [],
      razem: holidays.length
    };

    holidays.forEach(h => {
      if (h.typ === 'swięto') {
        grouped.swieta.push({
          nazwa: h.nazwa,
          data_start: h.data_start,
          data_end: h.data_end,
          opis: h.opis
        });
      } else {
        grouped.dni_wolne.push({
          nazwa: h.nazwa,
          data_start: h.data_start,
          data_end: h.data_end,
          opis: h.opis
        });
      }
    });

    return grouped;
  }
}

module.exports = CalendarManager;
