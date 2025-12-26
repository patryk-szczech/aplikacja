// ============ GLOBAL STATE ============
let placowka = null;
let grupy = [];
let rodzice = [];
let dzieci = [];
let stawki = [];
let platnosci = [];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    setupEventListeners();
});

// ============ DATA LOADING ============
async function loadData() {
    try {
        // Pobierz placówkę
        placowka = await window.api.getPlacowka();
        if (!placowka) {
            showModal('placowkaModal');
        } else {
            loadPlacowkaData();
        }

        // Pobierz wszystkie dane
        grupy = await window.api.getGrupy(placowka?.id);
        rodzice = await window.api.getRodzice(placowka?.id);
        dzieci = await window.api.getDzieci();
        stawki = await window.api.getStawki();
        platnosci = await window.api.getPlatnosci();

        // Załaduj UI
        loadGrupy();
        loadRodzice();
        loadDzieci();
        loadStawki();
        loadPlatnosci();
        loadDashboard();
        loadSelects();
    } catch (error) {
        console.error('Błąd przy ładowaniu danych:', error);
        showAlert('Błąd przy ładowaniu danych: ' + error.message, 'danger');
    }
}

// ============ DASHBOARD ============
function loadDashboard() {
    if (!grupy.length) return;

    try {
        const stats = window.api.getStatystyki(grupy[0]?.id);
        
        document.getElementById('statRodzice').textContent = stats.liczba_rodzicow || 0;
        document.getElementById('statDzieci').textContent = stats.liczba_dzieci || 0;
        document.getElementById('statOplacone').textContent = ((stats.razem_oplacone || 0) / 100).toFixed(2) + ' zł';
        document.getElementById('statZaleglosci').textContent = ((stats.razem_zaleglosci || 0) / 100).toFixed(2) + ' zł';

        // Ostatnie płatności
        const recent = platnosci.slice(0, 5);
        const tbody = document.getElementById('recentPayments');
        tbody.innerHTML = '';

        recent.forEach(p => {
            const rodzic = rodzice.find(r => r.id === p.rodzic_id);
            const dziecko = dzieci.find(d => d.id === p.dziecko_id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rodzic ? rodzic.imie + ' ' + rodzic.nazwisko : 'Brak'}</td>
                <td>${dziecko ? dziecko.imie + ' ' + dziecko.nazwisko : 'Brak'}</td>
                <td>${(p.kwota / 100).toFixed(2)} zł</td>
                <td>${p.data_platnosci}</td>
                <td><span class="badge badge-${p.status === 'opłacona' ? 'success' : 'warning'}">${p.status}</span></td>
            `;
            tbody.appendChild(row);
        });

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Brak płatności</td></tr>';
        }
    } catch (error) {
        console.error('Błąd przy ładowaniu dashboard:', error);
    }
}

// ============ PLACÓWKA ============
function loadPlacowkaData() {
    if (placowka) {
        document.getElementById('placowkaNazwa').value = placowka.nazwa || '';
        document.getElementById('placowkaAdres').value = placowka.adres || '';
        document.getElementById('placowkaTelefon').value = placowka.telefon || '';
        document.getElementById('placowkaEmail').value = placowka.email || '';
    }

    document.getElementById('placowkaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = {
                nazwa: document.getElementById('placowkaNazwa').value,
                adres: document.getElementById('placowkaAdres').value,
                telefon: document.getElementById('placowkaTelefon').value,
                email: document.getElementById('placowkaEmail').value
            };

            if (placowka) {
                await window.api.updatePlacowka(placowka.id, data);
            } else {
                const result = await window.api.addPlacowka(data);
                placowka = { id: result.lastInsertRowid, ...data };
            }

            showAlert('Placówka zapisana!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    });
}

// ============ GRUPY ============
function loadGrupy() {
    const tbody = document.getElementById('grupiTable');
    tbody.innerHTML = '';

    grupy.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${g.nazwa}</td>
            <td>${g.opis || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editGrupa(${g.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGrupa(${g.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (grupy.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Brak grup</td></tr>';
    }
}

async function saveGrupa() {
    try {
        const data = {
            placowka_id: placowka.id,
            nazwa: document.getElementById('grupaNazwa').value,
            opis: document.getElementById('grupaOpis').value
        };

        await window.api.addGrupa(data);
        showAlert('Grupa dodana!', 'success');
        
        // Wyczyść formularz
        document.getElementById('grupaForm').reset();
        
        // Zamknij modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('grupaModal'));
        modal.hide();
        
        // Przeładuj
        await loadData();
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function deleteGrupa(id) {
    if (confirm('Naprawdę usunąć tę grupę?')) {
        try {
            await window.api.deleteGrupa(id);
            showAlert('Grupa usunięta!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    }
}

// ============ RODZICE ============
function loadRodzice() {
    const tbody = document.getElementById('rodziceTable');
    tbody.innerHTML = '';

    rodzice.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.imie}</td>
            <td>${r.nazwisko}</td>
            <td>${r.email || '-'}</td>
            <td>${r.telefon || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editRodzic(${r.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRodzic(${r.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (rodzice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Brak rodziców</td></tr>';
    }
}

async function saveRodzic() {
    try {
        const data = {
            placowka_id: placowka.id,
            imie: document.getElementById('rodzicImie').value,
            nazwisko: document.getElementById('rodzicNazwisko').value,
            email: document.getElementById('rodzicEmail').value,
            telefon: document.getElementById('rodzicTelefon').value,
            adres: document.getElementById('rodzicAdres').value,
            miasto: document.getElementById('rodzicMiasto').value,
            kod_pocztowy: document.getElementById('rodzicKodPocztowy').value
        };

        await window.api.addRodzic(data);
        showAlert('Rodzic dodany!', 'success');
        document.getElementById('rodzicForm').reset();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('rodzicModal'));
        modal.hide();
        
        await loadData();
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function deleteRodzic(id) {
    if (confirm('Naprawdę usunąć tego rodzica?')) {
        try {
            await window.api.deleteRodzic(id);
            showAlert('Rodzic usunięty!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    }
}

// ============ DZIECI ============
function loadDzieci() {
    const tbody = document.getElementById('dzieciTable');
    tbody.innerHTML = '';

    dzieci.forEach(d => {
        const rodzic = rodzice.find(r => r.id === d.rodzic_id);
        const grupa = grupy.find(g => g.id === d.grupa_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${d.imie}</td>
            <td>${d.nazwisko}</td>
            <td>${rodzic ? rodzic.imie + ' ' + rodzic.nazwisko : 'Brak'}</td>
            <td>${grupa ? grupa.nazwa : 'Brak'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editDziecko(${d.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDziecko(${d.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (dzieci.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Brak dzieci</td></tr>';
    }
}

async function saveDziecko() {
    try {
        const data = {
            grupa_id: parseInt(document.getElementById('dzieckoGrupa').value),
            rodzic_id: parseInt(document.getElementById('dzieckoRodzic').value),
            imie: document.getElementById('dzieckoImie').value,
            nazwisko: document.getElementById('dzieckoNazwisko').value,
            data_urodzenia: document.getElementById('dzieckoDataUrodzenia').value
        };

        await window.api.addDziecko(data);
        showAlert('Dziecko dodane!', 'success');
        document.getElementById('dzieckoForm').reset();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('dzieckoModal'));
        modal.hide();
        
        await loadData();
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function deleteDziecko(id) {
    if (confirm('Naprawdę usunąć to dziecko?')) {
        try {
            await window.api.deleteDziecko(id);
            showAlert('Dziecko usunięte!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    }
}

// ============ STAWKI ============
function loadStawki() {
    const tbody = document.getElementById('stawkiTable');
    tbody.innerHTML = '';

    stawki.forEach(s => {
        const grupa = grupy.find(g => g.id === s.grupa_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${grupa ? grupa.nazwa : 'Brak'}</td>
            <td>${s.kategoria}</td>
            <td>${(s.kwota / 100).toFixed(2)} zł</td>
            <td>${s.data_od || '-'}</td>
            <td>${s.data_do || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editStawka(${s.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStawka(${s.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (stawki.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Brak stawek</td></tr>';
    }
}

async function saveStawka() {
    try {
        const data = {
            grupa_id: parseInt(document.getElementById('stawkaGrupa').value),
            kategoria: document.getElementById('stawkaKategoria').value,
            kwota: parseFloat(document.getElementById('stawkaKwota').value) * 100,
            data_od: document.getElementById('stawkaDataOd').value,
            data_do: document.getElementById('stawkaDataDo').value
        };

        await window.api.addStawka(data);
        showAlert('Stawka dodana!', 'success');
        document.getElementById('stawkaForm').reset();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('stawkaModal'));
        modal.hide();
        
        await loadData();
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function deleteStawka(id) {
    if (confirm('Naprawdę usunąć tę stawkę?')) {
        try {
            await window.api.deleteStawka(id);
            showAlert('Stawka usunięta!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    }
}

// ============ PŁATNOŚCI ============
function loadPlatnosci() {
    const tbody = document.getElementById('platnosciTable');
    tbody.innerHTML = '';

    platnosci.forEach(p => {
        const rodzic = rodzice.find(r => r.id === p.rodzic_id);
        const dziecko = dzieci.find(d => d.id === p.dziecko_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rodzic ? rodzic.imie + ' ' + rodzic.nazwisko : 'Brak'}</td>
            <td>${dziecko ? dziecko.imie + ' ' + dziecko.nazwisko : 'Brak'}</td>
            <td>${(p.kwota / 100).toFixed(2)} zł</td>
            <td>${p.data_platnosci}</td>
            <td><span class="badge badge-${p.status === 'opłacona' ? 'success' : 'warning'}">${p.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlatnosc(${p.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (platnosci.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Brak płatności</td></tr>';
    }
}

async function savePlatnosc() {
    try {
        const data = {
            rodzic_id: parseInt(document.getElementById('platnoscRodzic').value),
            dziecko_id: parseInt(document.getElementById('platnoscDziecko').value) || null,
            kwota: parseFloat(document.getElementById('platnoscKwota').value) * 100,
            data_platnosci: document.getElementById('platnoscData').value,
            kategoria: document.getElementById('platnoscKategoria').value,
            opis: document.getElementById('platnoscOpis').value,
            status: document.getElementById('platnoscStatus').value
        };

        await window.api.addPlatnosc(data);
        showAlert('Płatność dodana!', 'success');
        document.getElementById('platnoscForm').reset();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('platnoscModal'));
        modal.hide();
        
        await loadData();
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function deletePlatnosc(id) {
    if (confirm('Naprawdę usunąć tę płatność?')) {
        try {
            await window.api.deletePlatnosc(id);
            showAlert('Płatność usunięta!', 'success');
            await loadData();
        } catch (error) {
            showAlert('Błąd: ' + error.message, 'danger');
        }
    }
}

// ============ RAPORTY ============
async function generateReport(type, format = 'pdf') {
    try {
        showAlert('Generowanie raportu...', 'info');
        
        if (format === 'pdf') {
            await window.api.generatePdfReport(type, {});
        } else {
            await window.api.generateExcelReport(type, {});
        }
        
        showAlert('Raport został wygenerowany i pobrany!', 'success');
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function generateInvoice() {
    const rodzicId = document.getElementById('rodzicForInvoice').value;
    if (!rodzicId) {
        showAlert('Wybierz rodzica!', 'warning');
        return;
    }

    try {
        showAlert('Generowanie rachunku...', 'info');
        const today = new Date().toLocaleDateString('pl-PL');
        await window.api.generateInvoice(rodzicId, today);
        showAlert('Rachunek został wygenerowany!', 'success');
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

// ============ IMPORT ============
async function importBankData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showAlert('Wybierz plik!', 'warning');
        return;
    }

    try {
        const filePath = await window.api.selectImportFile();
        if (!filePath) return;

        showAlert('Importowanie...', 'info');

        let result;
        if (file.name.endsWith('.csv')) {
            result = await window.api.importCSV(filePath);
        } else {
            result = await window.api.importXLSX(filePath);
        }

        if (result.success) {
            showAlert(`Import zakończony! Zaimportowano: ${result.imported}`, 'success');
            await loadData();
        } else {
            showAlert('Błąd: ' + result.message, 'danger');
        }
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

// ============ BACKUP ============
async function createBackup() {
    try {
        showAlert('Tworzenie backupu...', 'info');
        const result = await window.api.backupData();
        if (result.success) {
            showAlert('Backup został utworzony!', 'success');
            loadBackups();
        } else {
            showAlert('Błąd: ' + result.message, 'danger');
        }
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

async function restoreBackup() {
    try {
        const result = await window.api.restoreData();
        if (result.success) {
            showAlert('Dane zostały przywrócone! Aplikacja będzie przeładowana...', 'success');
            setTimeout(() => location.reload(), 2000);
        } else {
            showAlert('Błąd: ' + result.message, 'danger');
        }
    } catch (error) {
        showAlert('Błąd: ' + error.message, 'danger');
    }
}

function loadBackups() {
    // Funkcja do załadowania listy backupów
    // Będzie zaimplementowana razem z pełnym UI
}

// ============ UTILITIES ============
function showSection(sectionId) {
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Pokazuj wybraną sekcję
    document.getElementById(sectionId).classList.add('active');

    // Aktualizuj aktywny link w sidebar
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.nav-link').classList.add('active');
}

function showAlert(message, type = 'info') {
    // Prosta implementacja alertu
    alert(message);
}

function loadSelects() {
    // Załaduj selecty w modalsach
    const rodzicSelects = document.querySelectorAll('[id*="Rodzic"]');
    const grupaSelects = document.querySelectorAll('[id*="Grupa"]');

    rodzicSelects.forEach(select => {
        select.innerHTML = '<option value="">-- Wybierz --</option>';
        rodzice.forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = `${r.imie} ${r.nazwisko}`;
            select.appendChild(option);
        });
    });

    grupaSelects.forEach(select => {
        select.innerHTML = '<option value="">-- Wybierz --</option>';
        grupy.forEach(g => {
            const option = document.createElement('option');
            option.value = g.id;
            option.textContent = g.nazwa;
            select.appendChild(option);
        });
    });
}

function setupEventListeners() {
    // Dodaj inne event listenery tutaj
}

// Bootstrap Modal Helper
function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}
