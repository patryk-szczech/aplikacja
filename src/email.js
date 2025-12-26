const nodemailer = require('nodemailer');

class EmailManager {
  constructor(db) {
    this.db = db;
    this.transporter = null;
  }

  /**
   * Testuje połączenie z serwerem SMTP
   */
  async testConnection(config) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_port === 465,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        }
      });

      await transporter.verify();
      return { success: true, message: 'Połączenie pomyślne!' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Inicjalizuje transporter na podstawie konfiguracji
   */
  initializeTransporter() {
    const config = this.db.getEmailConfig();
    if (!config) {
      throw new Error('Email nie jest skonfigurowany');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      }
    });
  }

  /**
   * Wysyła pojedynczy email
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }

      const config = this.db.getEmailConfig();
      const mailOptions = {
        from: `"${config.email_imie}" <${config.email_od}>`,
        to: options.to,
        subject: options.subject,
        html: options.html || options.text,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Wysyła masowe emaile
   */
  async sendBulkEmail(recipients, subject, template) {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }

      const config = this.db.getEmailConfig();
      const results = [];

      for (const recipient of recipients) {
        const html = this.renderTemplate(template, recipient);
        
        try {
          const info = await this.transporter.sendMail({
            from: `"${config.email_imie}" <${config.email_od}>`,
            to: recipient.email,
            subject: subject,
            html: html
          });

          results.push({
            email: recipient.email,
            success: true,
            messageId: info.messageId
          });
        } catch (error) {
          results.push({
            email: recipient.email,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        wyslanychEmali: results.filter(r => r.success).length,
        bledu: results.filter(r => !r.success).length,
        details: results
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Wysyła email z przypomnieniem o zaległościach
   */
  async sendReminderEmail(rodzicId) {
    try {
      const rodzic = this.db.db.prepare('SELECT * FROM rodzice WHERE id = ?').get(rodzicId);
      if (!rodzic || !rodzic.email) {
        return { success: false, message: 'Rodzic nie ma emaila' };
      }

      const zaleglosci = this.db.getZaleglosci();
      const zaleglosc = zaleglosci.find(z => z.id === rodzicId);

      if (!zaleglosc || zaleglosc.razem_zaleglosci <= 0) {
        return { success: false, message: 'Brak zaległości' };
      }

      const html = `
        <h2>Przypomnienie o zaległościach</h2>
        <p>Szanowny Panie/Pani ${rodzic.imie} ${rodzic.nazwisko},</p>
        <p>Uprzejmie przypominamy, że posiadają Państwo zaległości w opłatach:</p>
        <h3>Kwota do zapłaty: <strong>${zaleglosc.razem_zaleglosci.toFixed(2)} zł</strong></h3>
        <p>Liczba zalegających płatności: ${zaleglosc.liczba_zaleglosci}</p>
        <p>Prosimy o niezwłoczne uregulowanie zalegających płatności.</p>
        <p>W razie pytań zapraszamy do kontaktu.</p>
        <hr/>
        <p><small>Wiadomość wysłana automatycznie przez system Kwitariusz Szkoły</small></p>
      `;

      return await this.sendEmail({
        to: rodzic.email,
        subject: 'Przypomnienie o zaległościach w opłatach',
        html: html
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Wysyła email z podsumowaniem opłat
   */
  async sendPaymentSummary(rodzicId, period) {
    try {
      const rodzic = this.db.db.prepare('SELECT * FROM rodzice WHERE id = ?').get(rodzicId);
      if (!rodzic || !rodzic.email) {
        return { success: false, message: 'Rodzic nie ma emaila' };
      }

      const platnosci = this.db.getPlatnosci(rodzicId);
      const totalDue = platnosci
        .filter(p => p.status === 'zaległa')
        .reduce((sum, p) => sum + p.kwota, 0);

      const totalPaid = platnosci
        .filter(p => p.status === 'opłacona')
        .reduce((sum, p) => sum + p.kwota, 0);

      const html = `
        <h2>Podsumowanie Opłat - ${period}</h2>
        <p>Szanowny Panie/Pani ${rodzic.imie} ${rodzic.nazwisko},</p>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f2f2f2;">
            <th>Status</th>
            <th>Kwota</th>
          </tr>
          <tr>
            <td>Opłacone</td>
            <td>${totalPaid.toFixed(2)} zł</td>
          </tr>
          <tr>
            <td>Do zapłaty</td>
            <td style="color: red;">${totalDue.toFixed(2)} zł</td>
          </tr>
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            <td>Razem</td>
            <td>${(totalPaid + totalDue).toFixed(2)} zł</td>
          </tr>
        </table>
        <p>&nbsp;</p>
        <p>Szczegóły płatności dostępne w systemie Kwitariusz Szkoły.</p>
        <hr/>
        <p><small>Wiadomość wysłana automatycznie</small></p>
      `;

      return await this.sendEmail({
        to: rodzic.email,
        subject: `Podsumowanie opłat - ${period}`,
        html: html
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Wysyła info o nowej opłacie/potwierdzenie
   */
  async sendPaymentNotification(platnoscId) {
    try {
      const platnosc = this.db.db.prepare('SELECT * FROM platnosci WHERE id = ?').get(platnoscId);
      if (!platnosc) {
        return { success: false, message: 'Płatność nie znaleziona' };
      }

      const rodzic = this.db.db.prepare('SELECT * FROM rodzice WHERE id = ?').get(platnosc.rodzic_id);
      const dziecko = this.db.db.prepare('SELECT * FROM dzieci WHERE id = ?').get(platnosc.dziecko_id);

      const html = `
        <h2>Potwierdzenie Płatności</h2>
        <p>Szanowny Panie/Pani ${rodzic.imie} ${rodzic.nazwisko},</p>
        <p>Potwierdzamy zarejestrowanie następującej płatności:</p>
        <table border="1" cellpadding="10" cellspacing="0">
          <tr><td><strong>Dziecko:</strong></td><td>${dziecko.imie} ${dziecko.nazwisko}</td></tr>
          <tr><td><strong>Kwota:</strong></td><td>${platnosc.kwota.toFixed(2)} zł</td></tr>
          <tr><td><strong>Data:</strong></td><td>${platnosc.data_platnosci}</td></tr>
          <tr><td><strong>Status:</strong></td><td>${platnosc.status}</td></tr>
          <tr><td><strong>Opis:</strong></td><td>${platnosc.opis || '-'}</td></tr>
        </table>
        <p>&nbsp;</p>
        <p>Dziękujemy za dokonanie płatności.</p>
        <hr/>
        <p><small>Wiadomość wysłana automatycznie</small></p>
      `;

      return await this.sendEmail({
        to: rodzic.email,
        subject: 'Potwierdzenie płatności',
        html: html
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Renderuje szablon email z danymi
   */
  renderTemplate(template, data) {
    let html = template;
    
    // Zamienia {{klucz}} na wartość
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key]);
    });

    return html;
  }
}

module.exports = EmailManager;
