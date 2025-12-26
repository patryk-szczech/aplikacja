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
  // Navigation
document.querySelectorAll('.nav-link').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.getAttribute('data-section');
        switchSection(section);
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

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

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
        <td>${child.grupa_id || '-'}</td>
        <td>${child.data_urodzenia || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteChild(${child.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading children:', error);
  }
}

function showAddChildModal() {
  showModal('addChildModal');
}

async function submitAddChild() {
  const rodzicId = document.getElementById('childParentId')?.value;
  const grupaId = document.getElementById('childGroupId')?.value;
  const imie = document.getElementById('childFirstName')?.value;
  const nazwisko = document.getElementById('childLastName')?.value;
  const dataUrodzenia = document.getElementById('childBirthDate')?.value;

  if (!imie || !nazwisko) {
    alert('Wypełnij wszystkie pola');
    return;
  }

  try {
    await window.api.addDziecko({
      rodzic_id: rodzicId || 0,
      grupa_id: grupaId || 0,
      imie,
      nazwisko,
      data_urodzenia: dataUrodzenia
    });
    
    closeModal('addChildModal');
    loadChildren();
    alert('Dziecko dodane!');
  } catch (error) {
    console.error('Error adding child:', error);
    alert('Błąd przy dodawaniu dziecka');
  }
}

async function deleteChild(id) {
  if (!confirm('Czy na pewno usunąć?')) return;
  
  try {
    await window.api.deleteDziecko(id);
    loadChildren();
  } catch (error) {
    console.error('Error deleting child:', error);
  }
}

// ============ PARENTS ============
async function loadParents() {
  try {
    const parents = await window.api.getRodzice(placowkaId);
    const tbody = document.querySelector('#parentsTable tbody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    if (parents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak rodziców</td></tr>';
      return;
    }

    parents.forEach(parent => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${parent.imie}</td>
        <td>${parent.nazwisko}</td>
        <td>${parent.email || '-'}</td>
        <td>${parent.telefon || '-'}</td>
        <td>${parent.miasto || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteParent(${parent.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading parents:', error);
  }
}

function showAddParentModal() {
  showModal('addParentModal');
}

async function submitAddParent() {
  const imie = document.getElementById('parentFirstName')?.value;
  const nazwisko = document.getElementById('parentLastName')?.value;
  const email = document.getElementById('parentEmail')?.value;
  const telefon = document.getElementById('parentPhone')?.value;
  const adres = document.getElementById('parentAddress')?.value;
  const miasto = document.getElementById('parentCity')?.value;
  const kodPocztowy = document.getElementById('parentPostCode')?.value;

  if (!imie || !nazwisko) {
    alert('Wypełnij imię i nazwisko');
    return;
  }

  try {
    await window.api.addRodzic({
      placowka_id: placowkaId,
      imie,
      nazwisko,
      email,
      telefon,
      adres,
      miasto,
      kod_pocztowy: kodPocztowy
    });
    
    closeModal('addParentModal');
    loadParents();
    alert('Rodzic dodany!');
  } catch (error) {
    console.error('Error adding parent:', error);
    alert('Błąd przy dodawaniu rodzica');
  }
}

async function deleteParent(id) {
  if (!confirm('Czy na pewno usunąć?')) return;
  
  try {
    await window.api.deleteRodzic(id);
    loadParents();
  } catch (error) {
    console.error('Error deleting parent:', error);
  }
}

// ============ GROUPS ============
async function loadGroups() {
  try {
    const groups = await window.api.getGrupy(placowkaId);
    const tbody = document.querySelector('#groupsTable tbody');
    
    if (!tbody) return;

    tbody.innerHTML = '';

    if (groups.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">Brak grup</td></tr>';
      return;
    }

    groups.forEach(group => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${group.nazwa}</td>
        <td>${group.opis || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteGroup(${group.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

function showAddGroupModal() {
  showModal('addGroupModal');
}

async function submitAddGroup() {
  const nazwa = document.getElementById('groupName')?.value;
  const opis = document.getElementById('groupDescription')?.value;

  if (!nazwa) {
    alert('Wypełnij nazwę grupy');
    return;
  }

  try {
    await window.api.addGrupa({
      placowka_id: placowkaId,
      nazwa,
      opis
    });
    
    closeModal('addGroupModal');
    loadGroups();
    alert('Grupa dodana!');
  } catch (error) {
    console.error('Error adding group:', error);
    alert('Błąd przy dodawaniu grupy');
  }
}

async function deleteGroup(id) {
  if (!confirm('Czy na pewno usunąć?')) return;
  
  try {
    await window.api.deleteGrupa(id);
    loadGroups();
  } catch (error) {
    console.error('Error deleting group:', error);
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
        <td>${payment.data_platnosci || '-'}</td>
        <td>${payment.rodzic_id || '-'}</td>
        <td>${payment.kwota} zł</td>
        <td>${payment.kategoria || '-'}</td>
        <td><span class="badge ${payment.status === 'opłacona' ? 'badge-success' : 'badge-danger'}">${payment.status || '-'}</span></td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deletePayment(${payment.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading payments:', error);
  }
}

function showAddPaymentModal() {
  showModal('addPaymentModal');
}

async function submitAddPayment() {
  const rodzicId = document.getElementById('paymentParentId')?.value;
  const kwota = document.getElementById('paymentAmount')?.value;
  const dataPlatnosci = document.getElementById('paymentDate')?.value;
  const kategoria = document.getElementById('paymentCategory')?.value;
  const status = document.getElementById('paymentStatus')?.value;

  if (!rodzicId || !kwota) {
    alert('Wypełnij rodzica i kwotę');
    return;
  }

  try {
    await window.api.addPlatnosc({
      rodzic_id: rodzicId,
      dziecko_id: null,
      kwota: parseInt(kwota),
      data_platnosci: dataPlatnosci,
      kategoria,
      opis: '',
      status
    });
    
    closeModal('addPaymentModal');
    loadPayments();
    alert('Płatność dodana!');
  } catch (error) {
    console.error('Error adding payment:', error);
    alert('Błąd przy dodawaniu płatności');
  }
}

async function deletePayment(id) {
  if (!confirm('Czy na pewno usunąć?')) return;
  
  try {
    await window.api.deletePlatnosc(id);
    loadPayments();
  } catch (error) {
    console.error('Error deleting payment:', error);
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
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Brak stawek</td></tr>';
      return;
    }

    rates.forEach(rate => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${rate.kategoria}</td>
        <td>${rate.kwota} zł</td>
        <td>${rate.data_od || '-'}</td>
        <td>${rate.data_do || '-'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteRate(${rate.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading rates:', error);
  }
}

function showAddRateModal() {
  showModal('addRateModal');
}

async function submitAddRate() {
  const grupaId = document.getElementById('rateGroupId')?.value;
  const kategoria = document.getElementById('rateCategory')?.value;
  const kwota = document.getElementById('rateAmount')?.value;
  const dataOd = document.getElementById('rateFrom')?.value;
  const dataDo = document.getElementById('rateTo')?.value;

  if (!kategoria || !kwota) {
    alert('Wypełnij kategorię i kwotę');
    return;
  }

  try {
    await window.api.addStawka({
      grupa_id: grupaId || 0,
      kategoria,
      kwota: parseInt(kwota),
      data_od: dataOd,
      data_do: dataDo
    });
    
    closeModal('addRateModal');
    loadRates();
    alert('Stawka dodana!');
  } catch (error) {
    console.error('Error adding rate:', error);
    alert('Błąd przy dodawaniu stawki');
  }
}

async function deleteRate(id) {
  if (!confirm('Czy na pewno usunąć?')) return;
  
  try {
    await window.api.deleteStawka(id);
    loadRates();
  } catch (error) {
    console.error('Error deleting rate:', error);
  }
}

// ============ BACKUP ============
async function backupData() {
  try {
    await window.api.backupData();
    alert('Backup zapisany!');
  } catch (error) {
    console.error('Error backing up data:', error);
    alert('Błąd przy tworzeniu backupu');
  }
}
