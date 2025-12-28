// GLOBAL STATE
let placowkaId = 1;
let currentSection = 'dashboard';

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
  setupEventListeners();
  console.log('✓ UI initialized');
});

// SETUP EVENT LISTENERS
function setupEventListeners() {
  // ============== NAVIGATION MENU ==============
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const section = link.getAttribute('data-section');
      console.log('Clicked section:', section);
      
      if (section) {
        switchSection(section);
      }
    });
  });

  // ============== ADD BUTTONS ==============
  document.getElementById('addChildBtn')?.addEventListener('click', showAddChildModal);
  document.getElementById('addParentBtn')?.addEventListener('click', showAddParentModal);
  document.getElementById('addGroupBtn')?.addEventListener('click', showAddGroupModal);
  document.getElementById('addPaymentBtn')?.addEventListener('click', showAddPaymentModal);
  document.getElementById('addRateBtn')?.addEventListener('click', showAddRateModal);

  // ============== MODAL CLOSE BUTTONS ==============
  document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
      }
    });
  });

  console.log('✓ Event listeners setup complete');
}

// ============== MODAL HELPERS ==============
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('show');
    console.log('Modal shown:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
    console.log('Modal closed:', modalId);
  }
}

// ============== SECTION SWITCHING ==============
function switchSection(section) {
  currentSection = section;
  
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  // Show selected section
  const sectionEl = document.getElementById(section);
  if (sectionEl) {
    sectionEl.classList.add('active');
    sectionEl.style.display = 'block';
    console.log('Section switched to:', section);
  }

  // Update navigation highlight
  document.querySelectorAll('.sidebar .nav-link').forEach(item => {
    item.classList.remove('active');
  });
  const activeLink = document.querySelector(`.sidebar .nav-link[data-section="${section}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // Load section data
  switch(section) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'children':
      loadChildren();
      break;
    case 'parents':
      loadParents();
      break;
    case 'groups':
      loadGroups();
      break;
    case 'payments':
      loadPayments();
      break;
    case 'rates':
      loadRates();
      break;
    case 'facility':
      loadFacility();
      break;
  }
}

// ============== DASHBOARD ==============
async function loadDashboard() {
  try {
    const stats = await window.api.getStatystyki(placowkaId);
    document.getElementById('childrenCount').textContent = stats.liczbadzieci || 0;
    document.getElementById('parentsCount').textContent = stats.liczbarodzicow || 0;
    document.getElementById('totalPaid').textContent = (stats.razemoplacone || 0) + ' zł';
    document.getElementById('totalDebt').textContent = (stats.razemzaleglosci || 0) + ' zł';
    console.log('✓ Dashboard loaded');
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ============== CHILDREN ==============
async function loadChildren() {
  try {
    const children = await window.api.getDzieci();
    const tbody = document.querySelector('#childrenTable tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!children || children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Brak dzieci</td></tr>';
      return;
    }

    children.forEach(child => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${child.imie}</td>
        <td>${child.nazwisko}</td>
        <td>${child.rodzicid}</td>
        <td>${child.grupaid}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editChild(${child.id})">Edytuj</button>
          <button class="btn btn-sm btn-danger" onclick="deleteChild(${child.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    console.log('✓ Children loaded:', children.length);
  } catch (error) {
    console.error('Error loading children:', error);
  }
}

// ============== PARENTS ==============
async function loadParents() {
  try {
    const parents = await window.api.getRodzice();
    const tbody = document.querySelector('#parentsTable tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!parents || parents.length === 0) {
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
    console.log('✓ Parents loaded:', parents.length);
  } catch (error) {
    console.error('Error loading parents:', error);
  }
}

// ============== GROUPS ==============
async function loadGroups() {
  try {
    const groups = await window.api.getGrupy();
    const tbody = document.querySelector('#groupsTable tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!groups || groups.length === 0) {
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
    console.log('✓ Groups loaded:', groups.length);
  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

// ============== PAYMENTS ==============
async function loadPayments() {
  try {
    const payments = await window.api.getPlatnosci();
    const tbody = document.querySelector('#paymentsTable tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!payments || payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak płatności</td></tr>';
      return;
    }

    payments.forEach(payment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${payment.rodzicid}</td>
        <td>${payment.dzieckoid}</td>
        <td>${payment.kwota} zł</td>
        <td>${payment.dataplatnosci}</td>
        <td><span class="badge ${payment.status === 'opacona' ? 'badge-success' : 'badge-warning'}">${payment.status}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editPayment(${payment.id})">Edytuj</button>
          <button class="btn btn-sm btn-danger" onclick="deletePayment(${payment.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    console.log('✓ Payments loaded:', payments.length);
  } catch (error) {
    console.error('Error loading payments:', error);
  }
}

// ============== RATES ==============
async function loadRates() {
  try {
    const rates = await window.api.getStawki();
    const tbody = document.querySelector('#ratesTable tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!rates || rates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Brak stawek</td></tr>';
      return;
    }

    rates.forEach(rate => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${rate.grupaid}</td>
        <td>${rate.kategoria}</td>
        <td>${rate.kwota} zł</td>
        <td>${rate.dataod}</td>
        <td>${rate.datado}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editRate(${rate.id})">Edytuj</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRate(${rate.id})">Usuń</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    console.log('✓ Rates loaded:', rates.length);
  } catch (error) {
    console.error('Error loading rates:', error);
  }
}

// ============== FACILITY ==============
async function loadFacility() {
  try {
    const facility = await window.api.getPlacowka();
    if (facility) {
      document.getElementById('facilityName').value = facility.nazwa || '';
      document.getElementById('facilityPhone').value = facility.telefon || '';
      document.getElementById('facilityAddress').value = facility.adres || '';
    }
    console.log('✓ Facility loaded');
  } catch (error) {
    console.error('Error loading facility:', error);
  }
}

// ============== MODAL FUNCTIONS ==============
function showAddChildModal() {
  showModal('addChildModal');
}

function showAddParentModal() {
  showModal('addParentModal');
}

function showAddGroupModal() {
  showModal('addGroupModal');
}

function showAddPaymentModal() {
  showModal('addPaymentModal');
}

function showAddRateModal() {
  showModal('addRateModal');
}

// ============== EDIT FUNCTIONS ==============
function editChild(id) {
  console.log('Edit child:', id);
  showModal('addChildModal');
}

function deleteChild(id) {
  if (confirm('Czy na pewno chcesz usunąć to dziecko?')) {
    console.log('Delete child:', id);
    // Call API to delete
  }
}

function editParent(id) {
  console.log('Edit parent:', id);
  showModal('addParentModal');
}

function deleteParent(id) {
  if (confirm('Czy na pewno chcesz usunąć tego rodzica?')) {
    console.log('Delete parent:', id);
    // Call API to delete
  }
}

function editGroup(id) {
  console.log('Edit group:', id);
  showModal('addGroupModal');
}

function deleteGroup(id) {
  if (confirm('Czy na pewno chcesz usunąć tę grupę?')) {
    console.log('Delete group:', id);
    // Call API to delete
  }
}

function editPayment(id) {
  console.log('Edit payment:', id);
  showModal('addPaymentModal');
}

function deletePayment(id) {
  if (confirm('Czy na pewno chcesz usunąć tę płatność?')) {
    console.log('Delete payment:', id);
    // Call API to delete
  }
}

function editRate(id) {
  console.log('Edit rate:', id);
  showModal('addRateModal');
}

function deleteRate(id) {
  if (confirm('Czy na pewno chcesz usunąć tę stawkę?')) {
    console.log('Delete rate:', id);
    // Call API to delete
  }
}
