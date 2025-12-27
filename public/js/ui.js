// ============ GLOBAL STATE ============
let placowkaId = 1;
let currentSection = 'dashboard';

// ============ INIT ============
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboard();
    setupEventListeners();
});

// ============ SETUP EVENT LISTENERS ============
function setupEventListeners() {
    // Navigation - Używamy .nav-link zamiast .nav-item
    const navLinks = document.querySelectorAll('.nav-link');
    console.log('Znaleziono nav-link:', navLinks.length);
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const section = link.getAttribute('data-section');
            console.log('Kliknięto sekcję:', section);
            
            if (section) {
                switchSection(section);
            }
        });
    });

    // Buttons
    document.getElementById('addChildBtn')?.addEventListener('click', showAddChildModal);
    document.getElementById('addParentBtn')?.addEventListener('click', showAddParentModal);
    document.getElementById('addGroupBtn')?.addEventListener('click', showAddGroupModal);
    document.getElementById('addPaymentBtn')?.addEventListener('click', showAddPaymentModal);
    document.getElementById('addRateBtn')?.addEventListener('click', showAddRateModal);

    // Modal closes
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        });
    });
}

// ============ MODAL HELPERS ============
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// ============ SECTION SWITCHING ============
function switchSection(section) {
    currentSection = section;

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
    });

    // Show selected section
    const sectionEl = document.getElementById(section);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }

    // Update nav - Używamy .nav-link zamiast .nav-item
    document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section data
    if (section === 'dashboard') {
        loadDashboard();
    } else if (section === 'children') {
        loadChildren();
    } else if (section === 'parents') {
        loadParents();
    } else if (section === 'groups') {
        loadGroups();
    } else if (section === 'payments') {
        loadPayments();
    } else if (section === 'rates') {
        loadRates();
    }
}

// ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const stats = await window.api.getStatystyki(placowkaId);
        document.getElementById('childrenCount').textContent = stats.liczba_dzieci || 0;
        document.getElementById('parentsCount').textContent = stats.liczba_rodzicow || 0;
        document.getElementById('totalPaid').textContent = (stats.razem_oplacone || 0) + ' zł';
        document.getElementById('totalDebt').textContent = (stats.razem_zaleglosci || 0) + ' zł';
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============ CHILDREN ============
async function loadChildren() {
    try {
        const children = await window.api.getDzieci();
        const tbody = document.querySelector('#childrenTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Brak dzieci</td></tr>';
            return;
        }

        children.forEach(child => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${child.imie}</td>
                <td>${child.nazwisko}</td>
                <td>${child.rodzic_id}</td>
                <td>${child.grupa_id}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editChild(${child.id})">Edytuj</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteChild(${child.id})">Usuń</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading children:', error);
    }
}

// ============ PARENTS ============
async function loadParents() {
    try {
        const parents = await window.api.getRodzice();
        const tbody = document.querySelector('#parentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (parents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Brak rodziców</td></tr>';
            return;
        }

        parents.forEach(parent => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${parent.imie}</td>
                <td>${parent.nazwisko}</td>
                <td>${parent.telefon}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editParent(${parent.id})">Edytuj</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteParent(${parent.id})">Usuń</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading parents:', error);
    }
}

// ============ GROUPS ============
async function loadGroups() {
    try {
        const groups = await window.api.getGrupy();
        const tbody = document.querySelector('#groupsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (groups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">Brak grup</td></tr>';
            return;
        }

        groups.forEach(group => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${group.nazwa}</td>
                <td>${group.opis}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editGroup(${group.id})">Edytuj</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteGroup(${group.id})">Usuń</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// ============ PAYMENTS ============
async function loadPayments() {
    try {
        const payments = await window.api.getPlatnosci();
        const tbody = document.querySelector('#paymentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak płatności</td></tr>';
            return;
        }

        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.rodzic_id}</td>
                <td>${payment.dziecko_id}</td>
                <td>${payment.kwota} zł</td>
                <td>${payment.data}</td>
                <td><span class="badge badge-${payment.status === 'opłacone' ? 'success' : 'warning'}">${payment.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editPayment(${payment.id})">Edytuj</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePayment(${payment.id})">Usuń</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// ============ RATES ============
async function loadRates() {
    try {
        const rates = await window.api.getStawki();
        const tbody = document.querySelector('#ratesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (rates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak stawek</td></tr>';
            return;
        }

        rates.forEach(rate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rate.grupa_id}</td>
                <td>${rate.kategoria}</td>
                <td>${rate.kwota} zł</td>
                <td>${rate.od}</td>
                <td>${rate.do}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editRate(${rate.id})">Edytuj</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRate(${rate.id})">Usuń</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading rates:', error);
    }
}

// ============ STUBS FOR FUTURE IMPLEMENTATION ============
function showAddChildModal() { console.log('Add child'); }
function showAddParentModal() { console.log('Add parent'); }
function showAddGroupModal() { console.log('Add group'); }
function showAddPaymentModal() { console.log('Add payment'); }
function showAddRateModal() { console.log('Add rate'); }

function editChild(id) { console.log('Edit child:', id); }
function deleteChild(id) { console.log('Delete child:', id); }
function editParent(id) { console.log('Edit parent:', id); }
function deleteParent(id) { console.log('Delete parent:', id); }
function editGroup(id) { console.log('Edit group:', id); }
function deleteGroup(id) { console.log('Delete group:', id); }
function editPayment(id) { console.log('Edit payment:', id); }
function deletePayment(id) { console.log('Delete payment:', id); }
function editRate(id) { console.log('Edit rate:', id); }
function deleteRate(id) { console.log('Delete rate:', id); }
