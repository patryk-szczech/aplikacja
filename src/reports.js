const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const moment = require('moment');

class ReportManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generuje raport PDF
   */
  async generatePdfReport(type, data) {
    try {
      const fileName = `raport-${type}-${moment().format('YYYY-MM-DD-HHmmss')}.pdf`;
      const filePath = path.join(os.homedir(), 'Downloads', fileName);

      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));

      // Nagłówek
      doc.fontSize(20).text('Kwitariusz Szkoły', 100, 50);
      doc.fontSize(12).text(`Raport: ${type}`, 100, 80);
      doc.text(`Data generowania: ${moment().format('DD.MM.YYYY HH:mm')}`, 100, 100);
      doc.moveTo(100, 115).lineTo(500, 115).stroke();
      doc.moveTo(100, 115).lineTo(500, 115).stroke();

      let yPosition = 140;

      switch (type) {
        case 'zaleglosci':
          yPosition = this.addArrearsReport(doc, data, yPosition);
          break;
        case 'platnosci':
          yPosition = this.addPaymentsReport(doc, data, yPosition);
          break;
        case 'obecnosci':
          yPosition = this.addAttendanceReport(doc, data, yPosition);
          break;
        case 'statystyki':
          yPosition = this.addStatisticsReport(doc, data, yPosition);
          break;
      }

      // Stopka
      doc.fontSize(10).text('Wygenerowano automatycznie przez Kwitariusz Szkoły', 100, yPosition + 40);

      doc.end();

      return {
        success: true,
        filePath: filePath,
        message: 'Raport PDF został wygenerowany'
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generuje raport Excel
   */
  async generateExcelReport(type, data) {
    try {
      const fileName = `raport-${type}-${moment().format('YYYY-MM-DD-HHmmss')}.xlsx`;
      const filePath = path.join(os.homedir(), 'Downloads', fileName);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Raport');

      worksheet.columns = [
        { header: 'Lp.', key: 'lp', width: 5 },
        { header: 'Imię', key: 'imie', width: 15 },
        { header: 'Nazwisko', key: 'nazwisko', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Kwota', key: 'kwota', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      // Dodaj dane na podstawie typu raportu
      let rowIndex = 2;
      switch (type) {
        case 'zaleglosci':
          const zaleglosci = this.db.getZaleglosci();
          zaleglosci.forEach((z, idx) => {
            worksheet.addRow({
              lp: idx + 1,
              imie: z.imie,
              nazwisko: z.nazwisko,
              email: z.email,
              kwota: z.razem_zaleglosci,
              status: 'Zaległy'
            });
          });
          break;

        case 'platnosci':
          const platnosci = this.db.getPlatnosci();
          platnosci.forEach((p, idx) => {
            worksheet.addRow({
              lp: idx + 1,
              imie: p.rodzic_imie,
              nazwisko: p.rodzic_nazwisko,
              email: p.email,
              kwota: p.kwota,
              status: p.status
            });
          });
          break;
      }

      // Stylowanie
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      // Formatowanie kolumny kwoty
      worksheet.getColumn('kwota').numFmt = '#,##0.00';

      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        filePath: filePath,
        message: 'Raport Excel został wygenerowany'
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generuje rachunek (fakturę)
   */
  async generateInvoice(rodzicId, period) {
    try {
      const fileName = `rachunek-${rodzicId}-${moment().format('YYYY-MM-DD')}.pdf`;
      const filePath = path.join(os.homedir(), 'Downloads', fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      doc.pipe(fs.createWriteStream(filePath));

      // Dane placówki
      const placowka = this.db.getPlacowka();
      const rodzic = this.db.db.prepare('SELECT * FROM rodzice WHERE id = ?').get(rodzicId);

      // Nagłówek
      doc.fontSize(24).text('RACHUNEK', { align: 'center' });
      doc.fontSize(10).moveDown(0.5);

      // Info placówki po lewej
      if (placowka) {
        doc.fontSize(12).text(placowka.nazwa, 50, 100);
        doc.fontSize(10).text(placowka.adres || '', 50, 120);
        doc.text(`Tel: ${placowka.telefon || ''}`, 50, 135);
        doc.text(`Email: ${placowka.email || ''}`, 50, 150);
      }

      // Data i numer rachunku po prawej
      doc.fontSize(10).text(`Data: ${moment().format('DD.MM.YYYY')}`, 400, 100);
      doc.text(`Numer: ${rodzicId}-${moment().format('YYYYMM')}`, 400, 120);
      doc.text(`Okres: ${period}`, 400, 140);

      // Info o odbiorcy
      doc.moveDown(1);
      doc.fontSize(11).text('ODBIORCA:', 50, 180);
      doc.fontSize(10);
      doc.text(`${rodzic.imie} ${rodzic.nazwisko}`, 50, 200);
      if (rodzic.adres) doc.text(`${rodzic.adres}`, 50, 215);
      if (rodzic.miasto) doc.text(`${rodzic.kod_pocztowy} ${rodzic.miasto}`, 50, 230);

      // Tabela z płatościami
      const platnosci = this.db.getPlatnosci(rodzicId);
      
      const tableTop = 280;
      const col1X = 50;
      const col2X = 250;
      const col3X = 380;
      const col4X = 480;

      // Nagłówek tabeli
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Opis', col1X, tableTop);
      doc.text('Data', col2X, tableTop);
      doc.text('Ilość dni', col3X, tableTop);
      doc.text('Kwota', col4X, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Wiersze
      doc.font('Helvetica');
      let yPosition = tableTop + 25;
      let totalAmount = 0;

      platnosci.forEach(p => {
        doc.text(p.kategoria || 'Opłata', col1X, yPosition);
        doc.text(p.data_platnosci || '', col2X, yPosition);
        doc.text(p.data_od ? `${p.data_od} - ${p.data_do}` : '', col3X, yPosition);
        doc.text(p.kwota.toFixed(2) + ' zł', col4X, yPosition);
        
        totalAmount += p.kwota;
        yPosition += 20;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Suma
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      doc.font('Helvetica-Bold');
      doc.text('RAZEM:', col1X, yPosition + 10);
      doc.text(totalAmount.toFixed(2) + ' zł', col4X, yPosition + 10);

      // Notatka
      doc.moveTo(50, yPosition + 40).lineTo(550, yPosition + 40).stroke();
      doc.fontSize(9).font('Helvetica').text('Uwagi: Niniejszy rachunek potwierdzającej opłatę za usługi świadczone przez placówkę.', 50, yPosition + 50, { width: 500 });

      doc.end();

      return {
        success: true,
        filePath: filePath,
        message: 'Rachunek został wygenerowany'
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ============ HELPER METODY ============

  addArrearsReport(doc, data, yPos) {
    const zaleglosci = this.db.getZaleglosci();
    
    doc.fontSize(14).text('RAPORT ZALEGŁOŚCI', 100, yPos);
    yPos += 30;

    if (zaleglosci.length === 0) {
      doc.fontSize(10).text('Brak zaległości', 100, yPos);
      return yPos + 30;
    }

    // Tabela
    const col1 = 100;
    const col2 = 200;
    const col3 = 350;
    const col4 = 450;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Imię i nazwisko', col1, yPos);
    doc.text('Email', col2, yPos);
    doc.text('Liczba zaległ.', col3, yPos);
    doc.text('Kwota', col4, yPos);

    yPos += 20;
    doc.moveTo(100, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    doc.font('Helvetica').fontSize(9);
    zaleglosci.forEach(z => {
      doc.text(`${z.imie} ${z.nazwisko}`, col1, yPos);
      doc.text(z.email || '', col2, yPos);
      doc.text(z.liczba_zaleglosci || '', col3, yPos);
      doc.text(`${z.razem_zaleglosci.toFixed(2)} zł`, col4, yPos);
      yPos += 15;
    });

    return yPos;
  }

  addPaymentsReport(doc, data, yPos) {
    const platnosci = this.db.getPlatnosci();
    
    doc.fontSize(14).text('RAPORT PŁATNOŚCI', 100, yPos);
    yPos += 30;

    let totalPaid = 0;
    platnosci.forEach(p => {
      if (p.status === 'opłacona') totalPaid += p.kwota;
    });

    doc.fontSize(11).text(`Razem zapłacone: ${totalPaid.toFixed(2)} zł`, 100, yPos);
    yPos += 20;
    doc.text(`Liczba płatności: ${platnosci.length}`, 100, yPos);

    return yPos + 30;
  }

  addAttendanceReport(doc, data, yPos) {
    doc.fontSize(14).text('RAPORT OBECNOŚCI', 100, yPos);
    yPos += 30;
    doc.fontSize(10).text('(Raport będzie uzupełniony w kolejnych wersjach)', 100, yPos);
    return yPos + 20;
  }

  addStatisticsReport(doc, data, yPos) {
    const stats = this.db.getStatystyki();
    
    doc.fontSize(14).text('RAPORT STATYSTYK', 100, yPos);
    yPos += 30;

    doc.fontSize(11);
    doc.text(`Liczba rodziców: ${stats.liczba_rodzicow}`, 100, yPos);
    yPos += 20;
    doc.text(`Liczba dzieci: ${stats.liczba_dzieci}`, 100, yPos);
    yPos += 20;
    doc.text(`Razem opłacone: ${stats.razem_oplacone.toFixed(2)} zł`, 100, yPos);
    yPos += 20;
    doc.text(`Zaległości: ${stats.razem_zaleglosci.toFixed(2)} zł`, 100, yPos);
    yPos += 20;
    doc.text(`Oczekujące: ${stats.razem_oczekujace.toFixed(2)} zł`, 100, yPos);

    return yPos + 30;
  }
}

module.exports = ReportManager;
