# 📚 Kwitariusz Szkoły - System Zarządzania Opłatami Szkolnymi

Profesjonalna aplikacja desktopowa do zarządzania opłatami szkolnymi, obecnościami i raportowaniem. Wybudowana w **Electronie** z bazą **SQLite**.

## 🎯 Główne Funkcje

### 📊 Raportowanie i Analityka
- ✅ Raporty PDF/Excel
- ✅ Wykresy i statystyki
- ✅ Analiza trendów płatności
- ✅ Raporty zaległości

### 💰 Zarządzanie Finansami
- ✅ Historia wszystkich transakcji
- ✅ Import z pliku bankowego (CSV/XLSX)
- ✅ Automatyczne wyliczanie opłat z obecności
- ✅ Zarządzanie zaległościami

### 👥 Grupowanie i Stawki
- ✅ Obsługa wielu grup (przedszkole, szkoła)
- ✅ Różne stawki dla każdej grupy
- ✅ Kategorie: Śniadanie, II Śniadanie, Obiad, Podwieczorek, Pełna
- ✅ Edycja stawek w każdej chwili

### 📧 Komunikacja
- ✅ Masowe emaile do rodziców
- ✅ Automatyczne remidnery o zaległościach
- ✅ Potwierdzenia płatności
- ✅ Konfiguracja SMTP

### 📅 Zaawansowane Funkcje
- ✅ Kalendarz ze świętami i dniami wolnymi
- ✅ Automatyczne wyliczanie opłat na podstawie obecności
- ✅ Tryb jasny i ciemny (wybór użytkownika)
- ✅ Synchronizacja z Google Drive (backup)
- ✅ Generowanie rachunków/faktur
- ✅ Uruchamianie z aplikacji lub pendrive'a

---

## 🚀 Instalacja i Uruchomienie

### Wymagania
- **Node.js** (v14 lub nowsze) - [Pobierz](https://nodejs.org/)
- **Git** - [Pobierz](https://git-scm.com/)
- **Windows** (x64) do budowania EXE

### Kroki Instalacji

```bash
# 1. Klonuj repozytorium
git clone https://github.com/TWOJE-KONTO/kwitariusz-szkoly.git
cd kwitariusz-szkoly

# 2. Zainstaluj zależności
npm install

# 3. Uruchom aplikację w dev mode
npm start
```

### Uruchomienie w Production

```bash
# Buduj aplikację (generuje plik .exe)
npm run build:win

# Instalator NSIS pojawi się w folderze: dist/
```

---

## 📁 Struktura Projektu

```
kwitariusz-szkoly/
├── main.js                 # Główny proces Electrona
├── preload.js             # Bezpieczny most IPC
├── index.html             # Interfejs (będzie dodany)
├── package.json           # Zależności i konfiguracja
├── .gitignore             # Ignorowane pliki
│
├── src/                   # Moduły backend
│   ├── database.js        # SQLite manager
│   ├── finance.js         # Obliczenia finansowe
│   ├── email.js           # Wysyłanie emaili
│   ├── reports.js         # Generowanie raportów (PDF/Excel)
│   ├── import.js          # Import z CSV/XLSX
│   ├── sync.js            # Google Drive sync
│   ├── calendar.js        # Zarządzanie kalendarzem
│   └── storage.js         # Backupy i pendrive
│
├── public/                # Zasoby frontend
│   ├── css/
│   │   └── styles.css     # Style (będą dodane)
│   └── js/
│       ├── ui.js          # Logika UI (będzie dodana)
│       ├── theme.js       # Zmiana motywu (będzie dodana)
│       └── charts.js      # Wykresy (będzie dodane)
│
└── assets/
    └── icon.png           # Ikona aplikacji
```

---

## ⚙️ Konfiguracja

### 1️⃣ Pierwsza Uruchomienie

Po uruchomieniu aplikacji zobaczysz:
- Panel logowania/tworzenia placówki
- Formularz podstawowych danych

### 2️⃣ Konfiguracja Email (opcjonalnie)

**Menu → Ustawienia → Email**

```
SMTP Host:     smtp.gmail.com
SMTP Port:     587
SMTP User:     twoj.email@gmail.com
SMTP Password: hasło_aplikacji (nie zwykłe hasło!)
Email Od:      twoje.imie@gmail.com
```

> **Ważne**: W Gmailu musisz włączyć ["Hasła aplikacji"](https://myaccount.google.com/apppasswords)

### 3️⃣ Dodaj Grupy i Stawki

1. **Zarządzanie → Grupy** - dodaj grupy (Przedszkole, Szkoła)
2. **Zarządzanie → Stawki** - ustaw ceny dla każdej kategorii

### 4️⃣ Dodaj Rodziców i Dzieci

1. **Rodzice** → Dodaj nowego rodzica
2. **Dzieci** → Przypisz dzieci do rodziców i grup

---

## 📊 Jak Używać Głównych Funkcji

### 📥 Import Przelewów z Banku

1. **Menu → Plik → Importuj Dane**
2. Wybierz plik CSV/XLSX z wypisem bankowym
3. Format esperowany:
   ```
   data, kwota, opis, numer_konta
   2024-01-15, 500.00, Jan Kowalski, PL12345678
   ```
4. System automatycznie dopasuje do rodziców

### 📋 Raport Zaległości

1. **Raporty → Zaległości**
2. Wybierz grupę (opcjonalnie)
3. Eksportuj do PDF lub Excel

### 📧 Masowy Email

1. **Komunikacja → Wyślij Email**
2. Wybierz odbiorców (np. wszyscy z zaległościami)
3. Wybierz szablon (potwierdzenie, reminder)
4. Wyślij

### 💾 Backup Danych

**Menu → Plik → Nowy Backup**
- Tworzy kopię bezpieczeństwa bazy danych
- Przechowywana w folderze: `%APPDATA%/Kwitariusz Szkoły/backups/`

### 📱 Pendrive

**Menu → Ustawienia → Tryb Przenośny**
- Skopiuj aplikację na pendrive
- Uruchamiaj z pendrive'a na innym komputerze
- Dane będą zapisywane na pendrive

---

## 🎨 Motyw Ciemny/Jasny

**Prawy górny róg → Ikona słońca/księżyca**

Aplikacja pamiętam wybór w każdej sesji.

---

## 🔧 Budowanie Instalatora EXE

### Aby wygenerować plik .exe:

```bash
# Instalator NSIS + wersja przenośna
npm run build:win
```

**Wynik:**
```
dist/
├── Kwitariusz Szkoły-Setup.exe  (instalator)
└── Kwitariusz Szkoły-portable.exe (do uruchomienia bez instalacji)
```

> Instalator zostanie umieszczony w folderze `dist/`

---

## 🤝 Dodanie do Githuba

### 1. Utwórz repozytorium na Github

```bash
# W repozytorium Github utwórz pusty projekt
# Wtedy:

git init
git add .
git commit -m "Initial commit: Kwitariusz Szkoły v2.0.0"
git remote add origin https://github.com/TWOJE-KONTO/kwitariusz-szkoly.git
git branch -M main
git push -u origin main
```

### 2. Edytuj `package.json`

Zmień:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/TWOJE-KONTO/kwitariusz-szkoly.git"
}
```

### 3. Zignoruj ważne pliki

`.gitignore` ignoruje:
- `node_modules/` - zależności (ściągniesz z `npm install`)
- `*.db` - bazy danych
- `dist/` - zbudowane pliki

---

## 📝 Struktura Bazy Danych

Aplikacja używa **SQLite** z tabelami:

```
placowka         - Dane szkoły/przedszkola
grupy            - Grupy (Przedszkole, Szkoła)
rodzice          - Dane rodziców
dzieci           - Uczniowie
stawki           - Ceny za posiłki
obecnosci        - Rejestr obecności
platnosci        - Wpłacone pieniądze
historia_transakcji - Historia wszystkich ruchów
dni_wolne        - Święta i dni wolne
email_config     - Konfiguracja SMTP
backupy          - Lista backupów
logi             - Log zmian w systemie
ustawienia       - Ustawienia aplikacji
```

---

## 🐛 Troubleshooting

### Problem: "Module not found"
```bash
npm install
```

### Problem: "Cannot find Electron"
```bash
npm install electron --save-dev
```

### Problem: "Database locked"
- Zamknij aplikację
- Usuń plik `.db-journal` z `%APPDATA%/Kwitariusz Szkoły/`

### Problem: "SMTP error"
- Sprawdź hasło w Gmailu (użyj hasła aplikacji, nie zwykłego)
- Włącz port 587 w firewall'u

---

## 📦 Publikacja na GitHub

### Release Notes Szablon

```markdown
## v2.0.0 - Duża aktualizacja

### Nowe funkcje
- ✨ Raportowanie i analityka (PDF/Excel)
- ✨ Import z pliku bankowego
- ✨ Automatyczne wyliczanie opłat
- ✨ Masowe emaile do rodziców
- ✨ Kalendarz ze świętami
- ✨ Tryb jasny/ciemny
- ✨ Backup danych
- ✨ Wersja przenośna (pendrive)

### Poprawki
- 🐛 Naprawiono błędy w synchronizacji
- 🐛 Ulepszono wydajność

### Pobierz
- [Instalator Windows](link-do-exe)
- [Wersja Przenośna](link-do-portable)
```

---

## 📧 Support

W razie problemów:
1. Sprawdź [GitHub Issues](https://github.com/TWOJE-KONTO/kwitariusz-szkoly/issues)
2. Stwórz nowy Issue z opisem problemu
3. Dołącz screenshota lub log z konsoli (F12)

---

## 📄 Licencja

MIT License - możesz używać, modyfikować i rozpowszechniać

---

**Powodzenia! 🚀 Zapraszam do GitHuba!**
