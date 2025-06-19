const DB_NAME = 'UnipampaClassesDB';
const DB_VERSION = 2; // Incremented DB version to trigger onupgradeneeded
const STORE_NAMES = {
    CLASSES: 'classes',
    EVENTS: 'events'
};

let db;
let loggedIn = false; // Simple login state

// Default admin credentials (for demonstration purposes)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

// Mapeamento de dias da semana para evitar inconsistências
const DAY_MAP_PT = {
    "domingo": "domingo",
    "segunda": "segunda-feira",
    "terça": "terça-feira",
    "quarta": "quarta-feira",
    "quinta": "quinta-feira",
    "sexta": "sexta-feira",
    "sábado": "sábado",
    "sunday": "domingo",
    "monday": "segunda-feira",
    "tuesday": "terça-feira",
    "wednesday": "quarta-feira",
    "thursday": "quinta-feira",
    "friday": "sexta-feira",
    "saturday": "sábado"
};

let currentSortKeyClasses = 'horario1'; // Default sort for classes table
let currentSortDirectionClasses = 'asc';
let currentSortKeyEvents = 'horarioInicio'; // Default sort for events table
let currentSortDirectionEvents = 'asc';

// Paleta de cores suaves e confortáveis para os olhos
const SOFT_COLOR_PALETTE = [
    '#D4EDDA', // Light Greenish
    '#CCE5FF', // Light Blue
    '#FFF3CD', // Light Yellow/Cream
    '#F8D7DA', // Light Pink
    '#E2E3E5', // Light Gray
    '#D1ECF1', // Light Cyan
    '#F0E68C', // Khaki (slightly yellowish)
    '#ADD8E6', // Light Steel Blue
    '#F5DEB3', // Wheat (pale orange-yellow)
    '#FFEBCD'  // Blanched Almond (pale peach)
];

/**
 * Determines whether text color should be dark or light based on background color brightness.
 * @param {string} hexColor The hex color string (e.g., "#RRGGBB").
 * @returns {string} "black" or "white".
 */
function getContrastYIQ(hexColor) {
    if (!hexColor || hexColor.length !== 7) return 'black'; // Default to black for invalid or missing hex

    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // YIQ formula to determine brightness
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#333d47' : 'white'; // Use specific dark color for light backgrounds
}

/**
 * Opens the IndexedDB database.
 * Creates the object store if it doesn't exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database object.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            // Create or upgrade classes store
            if (!db.objectStoreNames.contains(STORE_NAMES.CLASSES)) {
                const classStore = db.createObjectStore(STORE_NAMES.CLASSES, { keyPath: 'id', autoIncrement: true });
                classStore.createIndex('diaSemana', 'diaSemana', { unique: false });
                classStore.createIndex('horario1', 'horario1', { unique: false });
                classStore.createIndex('turno', 'turno', { unique: false });
                classStore.createIndex('disciplina', 'disciplina', { unique: false });
                classStore.createIndex('professor', 'professor', { unique: false });
                classStore.createIndex('sala', 'sala', { unique: false });
                classStore.createIndex('prioridade', 'prioridade', { unique: false });
                console.log('Classes object store created/upgraded successfully.');
            }

            // Create or upgrade events store
            if (!db.objectStoreNames.contains(STORE_NAMES.EVENTS)) {
                const eventStore = db.createObjectStore(STORE_NAMES.EVENTS, { keyPath: 'id', autoIncrement: true });
                eventStore.createIndex('data', 'data', { unique: false });
                eventStore.createIndex('horarioInicio', 'horarioInicio', { unique: false });
                eventStore.createIndex('turno', 'turno', { unique: false });
                eventStore.createIndex('titulo', 'titulo', { unique: false });
                console.log('Events object store created/upgraded successfully.');
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
            showMessageBox(`Erro no banco de dados: ${event.target.error.message}`, 'error');
            reject(event.target.errorCode);
        };
    });
}

/**
 * Shows a custom message box.
 * @param {string} message The message to display.
 * @param {string} type The type of message (e.g., 'info', 'error', 'success', 'warning').
 * @param {function} callback Optional callback function for 'OK' or 'No' actions.
 * @param {boolean} isConfirm If true, shows 'Sim'/'Não' buttons instead of 'OK'.
 * @returns {Promise<boolean>} Resolves true for 'Sim', false for 'Não', or void for 'OK'.
 */
function showMessageBox(message, type = 'info', callback = null, isConfirm = false) {
    return new Promise(resolve => {
        const messageBox = document.getElementById('customMessageBox');
        const messageText = document.getElementById('messageText');
        const messageIcon = document.getElementById('messageIcon');
        const messageOkBtn = document.getElementById('messageOkBtn');
        const messageConfirmYesBtn = document.getElementById('messageConfirmYesBtn');
        const messageConfirmNoBtn = document.getElementById('messageConfirmNoBtn');

        // Reset display and classes
        messageBox.className = 'message-modal'; // Reset classes
        messageBox.style.display = 'flex'; // Make sure it's visible for animation
        messageBox.classList.add(type); // Add type class for styling

        messageText.textContent = message;
        messageOkBtn.style.display = 'none';
        messageConfirmYesBtn.style.display = 'inline-flex';
        messageConfirmNoBtn.style.display = 'inline-flex';

        let iconClass = ''; // For Font Awesome
        switch (type) {
            case 'success': iconClass = 'fas fa-check-circle'; break;
            case 'error': iconClass = 'fas fa-times-circle'; break;
            case 'info': iconClass = 'fas fa-info-circle'; break;
            case 'warning': iconClass = 'fas fa-exclamation-triangle'; break; // For confirmation
            default: iconClass = '';
        }
        messageIcon.className = 'message-icon ' + iconClass; // Apply Font Awesome class

        if (isConfirm) {
            messageConfirmYesBtn.onclick = () => {
                messageBox.style.display = 'none';
                if (callback) callback(true);
                resolve(true);
            };
            messageConfirmNoBtn.onclick = () => {
                messageBox.style.display = 'none';
                if (callback) callback(false);
                resolve(false);
            };
        } else {
            messageOkBtn.style.display = 'inline-flex'; // Show OK button
            messageConfirmYesBtn.style.display = 'none'; // Hide confirm buttons
            messageConfirmNoBtn.style.display = 'none'; // Hide confirm buttons

            messageOkBtn.onclick = () => {
                messageBox.style.display = 'none';
                if (callback) callback();
                resolve();
            };
        }
    });
}


/**
 * Adds a new item (class or event) to IndexedDB.
 * @param {object} itemData The data of the item to add.
 * @param {string} storeName The name of the object store ('classes' or 'events').
 */
async function addItem(itemData, storeName) {
    try {
        const dbInstance = await openDB();
        const transaction = dbInstance.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.add(itemData);

        request.onsuccess = () => {
            console.log(`[addItem SUCCESS] Added ${storeName} item. ID: ${request.result}. Data:`, itemData);
            showMessageBox(`${storeName === STORE_NAMES.CLASSES ? 'Turma' : 'Evento'} salvo com sucesso!`, 'success', null, false).then(() => {
                if (storeName === STORE_NAMES.CLASSES) resetClassForm(); else resetEventForm();
                renderDashboardItems();
            });
        };
        request.onerror = (event) => {
            console.error(`[addItem ERROR] Error adding ${storeName} item:`, event.target.error, 'Item data:', itemData);
            showMessageBox(`Erro ao adicionar ${storeName === STORE_NAMES.CLASSES ? 'turma' : 'evento'}: ${event.target.error.message}`, 'error');
        };
    } catch (error) {
        console.error('Error opening database for adding item:', error);
        showMessageBox('Erro interno ao acessar o banco de dados.', 'error');
    } finally { // Ensure table re-render even on error to reflect state
        if (loggedIn) {
            renderAdminTable(storeName);
        }
    }
}

/**
 * Retrieves all items from a given IndexedDB store.
 * @param {string} storeName The name of the object store ('classes' or 'events').
 * @returns {Promise<Array<object>>} A promise that resolves with an array of item objects.
 */
async function getItems(storeName) {
    try {
        const dbInstance = await openDB();
        const transaction = dbInstance.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                console.log(`[getItems SUCCESS] Retrieved items from '${storeName}' store:`, event.target.result);
                resolve(event.target.result);
            };
            request.onerror = (event) => {
                console.error(`[getItems ERROR] Error getting ${storeName} items:`, event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Error opening database for getting items:', error);
        return [];
    }
}

/**
 * Updates an existing item in IndexedDB.
 * @param {object} itemData The updated item data, including its ID.
 * @param {string} storeName The name of the object store ('classes' or 'events').
 */
async function updateItem(itemData, storeName) {
    try {
        const dbInstance = await openDB();
        const transaction = dbInstance.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(itemData); // Use put for update

        request.onsuccess = () => {
            console.log(`[updateItem SUCCESS] Updated ${storeName} item. ID: ${itemData.id}. Data:`, itemData);
            showMessageBox(`${storeName === STORE_NAMES.CLASSES ? 'Turma' : 'Evento'} atualizado com sucesso!`, 'success', null, false).then(() => {
                if (storeName === STORE_NAMES.CLASSES) resetClassForm(); else resetEventForm();
                renderDashboardItems();
            });
        };
        request.onerror = (event) => {
            console.error(`[updateItem ERROR] Error updating ${storeName} item:`, event.target.error, 'Item data:', itemData);
            showMessageBox(`Erro ao atualizar ${storeName === STORE_NAMES.CLASSES ? 'turma' : 'evento'}: ${event.target.error.message}`, 'error');
        };
    } catch (error) {
        console.error('Error opening database for updating item:', error);
        showMessageBox('Erro interno ao acessar o banco de dados.', 'error');
    } finally { // Ensure table re-render even on error to reflect state
        if (loggedIn) {
            renderAdminTable(storeName);
        }
    }
}

/**
 * Deletes an item from IndexedDB.
 * @param {number} id The ID of the item to delete.
 * @param {string} storeName The name of the object store ('classes' or 'events').
 */
async function deleteItem(id, storeName) {
    const confirmed = await showMessageBox(`Tem certeza que deseja excluir este ${storeName === STORE_NAMES.CLASSES ? 'turma' : 'evento'}?`, 'warning', null, true);
    if (confirmed) {
        try {
            const dbInstance = await openDB();
            const transaction = dbInstance.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                showMessageBox(`${storeName === STORE_NAMES.CLASSES ? 'Turma' : 'Evento'} excluído com sucesso!`, 'success').then(() => {
                    renderDashboardItems();
                    if (loggedIn) renderAdminTable(storeName);
                });
            };
            request.onerror = (event) => {
                console.error(`Error deleting ${storeName} item:`, event.target.error);
                showMessageBox(`Erro ao excluir ${storeName === STORE_NAMES.CLASSES ? 'turma' : 'evento'}: ${event.target.error.message}`, 'error');
            };
        }
        catch (error) {
            console.error('Error opening database for deleting item:', error);
            showMessageBox('Erro interno ao acessar o banco de dados.', 'error');
        }
    }
}

/**
 * Renders classes and events on the main dashboard, combined and sorted.
 */
async function renderDashboardItems() {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.innerHTML = '<p class="loading-message col-span-full">Carregando aulas e eventos...</p>';

    const filterTurno = document.getElementById('turno-filter').value;
    const filterDia = document.getElementById('dia-filter').value;

    const allClasses = await getItems(STORE_NAMES.CLASSES);
    const allEvents = await getItems(STORE_NAMES.EVENTS);

    if (!allClasses && !allEvents) {
        cardsContainer.innerHTML = '<p class="loading-message col-span-full">Erro ao carregar aulas e eventos.</p>';
        return;
    }

    const combinedItems = [];

    // Process Classes
    if (allClasses) {
        allClasses.forEach(cls => {
            const classDayNormalized = cls.diaSemana.toLowerCase();
            const sortKey = `${classDayNormalized}-${cls.horario1}`;
            combinedItems.push({ type: 'class', sortKey, ...cls });
        });
    }

    // Process Events
    if (allEvents) {
        allEvents.forEach(event => {
            const [year, month, day] = event.data.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            const eventDayName = eventDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
            const sortKey = `${eventDayName}-${event.horarioInicio}`;
            combinedItems.push({ type: 'event', sortKey, ...event });
        });
    }

    // Filter items based on selected day and turno
    let filteredItems = combinedItems.filter(item => {
        const today = new Date();
        const currentDayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(today).toLowerCase();

        let matchesDay = false;
        let itemDayNormalized;
        let itemTurno;

        if (item.type === 'class') {
            itemDayNormalized = item.diaSemana.toLowerCase();
            itemTurno = item.turno;
        } else { // type === 'event'
            const [year, month, day] = item.data.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            itemDayNormalized = eventDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();

            itemTurno = item.turno;
        }
        matchesDay = (filterDia === 'auto' && itemDayNormalized === currentDayName) ||
                     (filterDia === 'todos') ||
                     (filterDia !== 'auto' && filterDia !== 'todos' && itemDayNormalized === DAY_MAP_PT[filterDia]);

        const matchesTurno = (filterTurno === 'todos') || (itemTurno === filterTurno);

        // Additionally filter out past events/classes for 'Hoje' filter
        if (filterDia === 'auto') {
            if (itemDayNormalized === currentDayName) {
                const now = new Date(); // Re-fetch current time as it might be an interval call
                const currentTime = now.toTimeString().slice(0, 5);
                const itemTime = item.type === 'class' ? item.horario1 : item.horarioInicio;
                if (itemTime < currentTime) {
                    return false; // Exclude past classes/events for "Hoje"
                }
            } else {
                return false; // Only show today's items for "Hoje"
            }
        }


        return matchesDay && matchesTurno;
    });

    // Sort combined items by time
    filteredItems.sort((a, b) => {
        const timeA = a.type === 'class' ? a.horario1 : a.horarioInicio;
        const timeB = b.type === 'class' ? b.horario1 : b.horarioInicio;
        return timeA.localeCompare(timeB);
    });

    if (filteredItems.length === 0) {
        cardsContainer.innerHTML = '<p class="loading-message col-span-full">Nenhuma aula ou evento encontrado para os filtros selecionados.</p>';
        return;
    }

    cardsContainer.innerHTML = ''; // Clear previous items

    filteredItems.forEach(item => {
        const randomColor = SOFT_COLOR_PALETTE[Math.floor(Math.random() * SOFT_COLOR_PALETTE.length)];
        const textColor = getContrastYIQ(randomColor);

        if (item.type === 'class') {
            const salaStatusClass = item.salaAberta ? 'open' : 'closed';
            const salaStatusText = item.salaAberta ? 'Aberta' : 'Fechada';
            
            const classCard = document.createElement('div');
            classCard.className = `dashboard-card`; 
            classCard.style.backgroundColor = randomColor;
            classCard.style.borderColor = randomColor;
            classCard.style.color = textColor;

            classCard.innerHTML = `
                <h3 style="color: ${textColor};">${item.disciplina || ''}</h3>
                <p style="color: ${textColor};">Prof: ${item.professor || ''}</p>
                <p style="color: ${textColor};">Local: B${item.bloco || ''}, A${item.andar || ''}, S${item.sala || ''}</p>
                <p style="color: ${textColor};">Hora: ${(item.horario1 || '')}-${(item.horario2 || '')}</p>
                <p style="color: ${textColor};">Dia: ${item.diaSemana ? item.diaSemana.charAt(0).toUpperCase() + item.diaSemana.slice(1) : ''} - Turno: ${item.turno ? item.turno.charAt(0).toUpperCase() + item.turno.slice(1) : ''}</p>
                <span class="sala-status-badge ${salaStatusClass}" style="color: white;">${salaStatusText}</span>
            `;
            cardsContainer.appendChild(classCard);
        } else { // type === 'event'
            const eventCard = document.createElement('div');
            // Add 'event-card' class for specific styling including the blink animation (foto 3)
            eventCard.className = `event-card`;
            eventCard.style.backgroundColor = randomColor; // Events now use random soft colors
            eventCard.style.borderColor = randomColor;
            eventCard.style.color = textColor; // Apply determined text color

            const [ano, mes, dia] = item.data.split('-');
            const displayDate = `${dia}/${mes}/${ano}`;
            const displayTime = item.horarioFim ? `${(item.horarioInicio || '')}-${(item.horarioFim || '')}` : (item.horarioInicio || '');

            eventCard.innerHTML = `
                <h3 style="color: ${textColor};">${item.titulo || ''}</h3>
                <p style="color: ${textColor};">Local: ${item.local || ''}</p>
                <p style="color: ${textColor};">Data: ${displayDate}</p>
                <p style="color: ${textColor};">Hora: ${displayTime}</p>
                <p style="color: ${textColor};">Turno: ${item.turno ? item.turno.charAt(0).toUpperCase() + item.turno.slice(1) : ''}</p>
                <span class="event-badge" style="color: white;">Evento</span>
            `;
            cardsContainer.appendChild(eventCard);
        }
    });
}

/**
 * Renders items (classes or events) in the admin table based on the active tab.
 * @param {string} [activeTab='classes'] The tab to render ('classes' or 'events').
 */
async function renderAdminTable(activeTab = 'classes') {
    let tableBody;
    let emptyMessageElement;
    let items;
    let searchTermInput;
    let filterDayOrDateInput;
    let sortKey;
    let sortDirection;

    console.log(`[renderAdminTable START] Preparing to render table for: ${activeTab}`);

    if (activeTab === STORE_NAMES.CLASSES) {
        tableBody = document.querySelector('#admin-table-body-classes');
        emptyMessageElement = document.getElementById('adminTableClassesEmptyMessage');
        searchTermInput = document.getElementById('busca-admin-classes');
        filterDayOrDateInput = document.getElementById('admin-dia-filter');
        items = await getItems(STORE_NAMES.CLASSES);
        sortKey = currentSortKeyClasses;
        sortDirection = currentSortDirectionClasses;
        console.log(`[renderAdminTable CLASSES] Retrieved items:`, items);

    } else if (activeTab === STORE_NAMES.EVENTS) {
        tableBody = document.querySelector('#admin-table-body-events');
        emptyMessageElement = document.getElementById('adminTableEventsEmptyMessage');
        searchTermInput = document.getElementById('busca-admin-events');
        filterDayOrDateInput = document.getElementById('admin-data-filter-events');
        items = await getItems(STORE_NAMES.EVENTS);
        sortKey = currentSortKeyEvents;
        sortDirection = currentSortDirectionEvents;
        console.log(`[renderAdminTable EVENTS] Retrieved items:`, items);
    } else {
        console.warn(`[renderAdminTable] Invalid tab provided: ${activeTab}`);
        return; // Invalid tab
    }

    tableBody.innerHTML = ''; // Clear current rows
    emptyMessageElement.classList.add('hidden'); // Hide message initially
    emptyMessageElement.textContent = 'Carregando...';

    if (!items || items.length === 0) { // Consolidated check for empty or null items
        emptyMessageElement.classList.remove('hidden');
        emptyMessageElement.textContent = `Nenhum ${activeTab === STORE_NAMES.CLASSES ? 'aula' : 'evento'} encontrado para os filtros selecionados.`;
        console.log(`[renderAdminTable END] No items found for ${activeTab} after fetching.`);
        return;
    }

    let filteredItems = items.filter(item => {
        const searchTerm = searchTermInput.value.toLowerCase();
        let matchesSearch = false;
        let matchesFilter = true;

        if (activeTab === STORE_NAMES.CLASSES) {
            matchesSearch = (item.disciplina && item.disciplina.toLowerCase().includes(searchTerm)) ||
                            (item.sala && item.sala.toLowerCase().includes(searchTerm)) ||
                            (item.professor && item.professor.toLowerCase().includes(searchTerm));
            const filterDia = filterDayOrDateInput.value;
            matchesFilter = (filterDia === 'todos') || (item.diaSemana === DAY_MAP_PT[filterDia]);
        } else { // Events
            matchesSearch = (item.titulo && item.titulo.toLowerCase().includes(searchTerm)) ||
                            (item.local && item.local.toLowerCase().includes(searchTerm));
            const filterDate = filterDayOrDateInput.value; // ISO-MM-DD format
            if (filterDate) {
                matchesFilter = item.data === filterDate;
            }
        }
        return matchesFilter && matchesSearch;
    });
    console.log(`[renderAdminTable] Filtered items for ${activeTab}:`, filteredItems);

    // Apply sorting
    if (sortKey) {
        filteredItems.sort((a, b) => {
            let valA, valB;

            if (activeTab === STORE_NAMES.CLASSES) {
                if (sortKey === 'bloco') {
                    valA = `${a.bloco || ''}${a.andar || ''}${a.sala || ''}`.toLowerCase();
                    valB = `${b.bloco || ''}${b.andar || ''}${b.sala || ''}`.toLowerCase();
                } else if (sortKey === 'diaSemana') {
                    const dayOrder = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                    valA = dayOrder.indexOf(a.diaSemana);
                    valB = dayOrder.indexOf(b.diaSemana);
                } else if (sortKey === 'horario1') {
                    valA = a.horario1 || '';
                    valB = b.horario1 || '';
                } else {
                    valA = String(a[sortKey] || '').toLowerCase();
                    valB = String(b[sortKey] || '').toLowerCase();
                }
            } else { // Events
                if (sortKey === 'data') {
                    // Combine date and time for accurate chronological sorting
                    valA = new Date(`${a.data || '2000-01-01'}T${a.horarioInicio || '00:00'}`).getTime();
                    valB = new Date(`${b.data || '2000-01-01'}T${b.horarioInicio || '00:00'}`).getTime();
                } else if (sortKey === 'horarioInicio') {
                    valA = a.horarioInicio || '';
                    valB = b.horarioInicio || '';
                } else {
                    valA = String(a[sortKey] || '').toLowerCase();
                    valB = String(b[sortKey] || '').toLowerCase();
                }
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        // Default sort for events: by date then by time
        if (activeTab === STORE_NAMES.EVENTS) {
            filteredItems.sort((a, b) => {
                const dateA = new Date(`${a.data || '2000-01-01'}T${a.horarioInicio || '00:00'}`);
                const dateB = new Date(`${b.data || '2000-01-01'}T${b.horarioInicio || '00:00'}`);
                return dateA - dateB;
            });
        }
    }


    if (filteredItems.length === 0) {
        emptyMessageElement.classList.remove('hidden');
        emptyMessageElement.textContent = `Nenhum ${activeTab === STORE_NAMES.CLASSES ? 'aula' : 'evento'} encontrado para os filtros selecionados.`;
        console.log(`[renderAdminTable END] No items found for ${activeTab} after filtering.`);
        return;
    }

    emptyMessageElement.classList.add('hidden'); // Hide loading message if items found

    filteredItems.forEach(item => {
        const row = tableBody.insertRow();
        if (activeTab === STORE_NAMES.CLASSES) { // Explicitly check activeTab for rendering
            // console.log(`[renderAdminTable - CLASSES] Rendering item details:`, item); // Specific debug log for classes - removed for brevity in console
            const salaStatusClass = item.salaAberta ? 'open' : 'closed';
            const salaStatusText = item.salaAberta ? 'Aberta' : 'Fechada';
            row.innerHTML = `
                <td>B${item.bloco || ''} A${item.andar || ''} S${item.sala || ''}</td>
                <td>${item.disciplina || ''}</td>
                <td>${item.turmas || ''}</td>
                <td>${item.professor || ''}</td>
                <td>${(item.horario1 || '') + '-' + (item.horario2 || '')}</td>
                <td>${item.turno ? item.turno.charAt(0).toUpperCase() + item.turno.slice(1) : ''}</td>
                <td>${item.diaSemana ? item.diaSemana.charAt(0).toUpperCase() + item.diaSemana.slice(1) : ''}</td>
                <td class="action-buttons">
                    <button class="btn-action secondary-btn" onclick="editItem(${item.id}, '${STORE_NAMES.CLASSES}')">Editar</button>
                    <button class="btn-action danger-btn" onclick="deleteItem(${item.id}, '${STORE_NAMES.CLASSES}')">Excluir</button>
                </td>
            `;
        } else if (activeTab === STORE_NAMES.EVENTS) { // Explicitly check activeTab for rendering
            // console.log(`[renderAdminTable - EVENTS] Rendering item details:`, item); // Specific debug log for events - removed for brevity in console
            const [ano, mes, dia] = item.data.split('-');
            const displayDate = `${dia}/${mes}/${ano}`;
            const displayTime = item.horarioFim ? `${(item.horarioInicio || '')}-${(item.horarioFim || '')}` : (item.horarioInicio || '');

            row.innerHTML = `
                <td>${item.titulo || ''}</td>
                <td>${item.local || ''}</td>
                <td>${displayDate}</td>
                <td>${displayTime}</td>
                <td>${item.turno ? item.turno.charAt(0).toUpperCase() + item.turno.slice(1) : ''}</td>
                <td class="action-buttons">
                    <button class="btn-action secondary-btn" onclick="editItem(${item.id}, '${STORE_NAMES.EVENTS}')">Editar</button>
                    <button class="btn-action danger-btn" onclick="deleteItem(${item.id}, '${STORE_NAMES.EVENTS}')">Excluir</button>
                </td>
            `;
        }
    });
}

/**
 * Function to handle table header clicks for sorting.
 * @param {string} sortKey The key to sort by.
 * @param {string} tableType The type of table ('classes' or 'events').
 */
function handleTableSort(sortKey, tableType) {
    console.log(`[handleTableSort] Sorting by ${sortKey} for ${tableType} table.`);
    if (tableType === STORE_NAMES.CLASSES) {
        if (currentSortKeyClasses === sortKey) {
            currentSortDirectionClasses = currentSortDirectionClasses === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKeyClasses = sortKey;
            currentSortDirectionClasses = 'asc';
        }
        console.log(`[handleTableSort] Classes sort state: key=${currentSortKeyClasses}, direction=${currentSortDirectionClasses}`);
    } else if (tableType === STORE_NAMES.EVENTS) {
        if (currentSortKeyEvents === sortKey) {
            currentSortDirectionEvents = currentSortDirectionEvents === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortKeyEvents = sortKey;
            currentSortDirectionEvents = 'asc';
        }
        console.log(`[handleTableSort] Events sort state: key=${currentSortKeyEvents}, direction=${currentSortDirectionEvents}`);
    }
    renderAdminTable(tableType);
}

/**
 * Fills the form with data of an item for editing in the admin page.
 * @param {number} id The ID of the item to edit.
 * @param {string} storeName The name of the object store ('classes' or 'events').
 */
async function editItem(id, storeName) {
    const items = await getItems(storeName);
    const numericId = parseInt(id);

    if (isNaN(numericId)) {
        showMessageBox('ID inválido para edição.', 'error');
        return;
    }

    const itemToEdit = items.find(item => item.id === numericId);

    if (!itemToEdit) {
        showMessageBox('Item não encontrado para edição.', 'error');
        return;
    }

    if (storeName === STORE_NAMES.CLASSES) {
        // Preenche formulário de aula
        document.getElementById('editClassId').value = itemToEdit.id;
        document.getElementById('disciplina').value = itemToEdit.disciplina || '';
        document.getElementById('professor').value = itemToEdit.professor || '';
        document.getElementById('turmas').value = itemToEdit.turmas || '';
        document.getElementById('bloco').value = itemToEdit.bloco || '';
        document.getElementById('andar').value = itemToEdit.andar || '';
        document.getElementById('sala').value = itemToEdit.sala || '';
        document.getElementById('diaSemana').value = itemToEdit.diaSemana || '';
        document.getElementById('horario1').value = itemToEdit.horario1 || '';
        document.getElementById('horario2').value = itemToEdit.horario2 || '';
        document.getElementById('turno').value = itemToEdit.turno || '';
        document.getElementById('prioridade').value = itemToEdit.prioridade || 'Média';

        // Alterna para aba e formulário de aulas
        document.getElementById('tab-classes').classList.add('active');
        document.getElementById('tab-events').classList.remove('active');
        document.getElementById('formTurma').classList.add('active');
        document.getElementById('formEvento').classList.remove('active');

    } else if (storeName === STORE_NAMES.EVENTS) {
        // Preenche formulário de evento
        document.getElementById('editEventId').value = itemToEdit.id;
        document.getElementById('tituloEvento').value = itemToEdit.titulo || '';
        document.getElementById('localEvento').value = itemToEdit.local || '';
        document.getElementById('dataEvento').value = itemToEdit.data || '';
        document.getElementById('horarioInicioEvento').value = itemToEdit.horarioInicio || '';
        document.getElementById('horarioFimEvento').value = itemToEdit.horarioFim || '';
        document.getElementById('turnoEvento').value = itemToEdit.turno || '';

        // Alterna para aba e formulário de eventos
        document.getElementById('tab-events').classList.add('active');
        document.getElementById('tab-classes').classList.remove('active');
        document.getElementById('formEvento').classList.add('active');
        document.getElementById('formTurma').classList.remove('active');
    }

    // Mostra a aba de administração se necessário
    document.getElementById('dashboard-view').classList.remove('is-active');
    document.getElementById('admin-panel-page').classList.add('is-active');
}


/**
 * Handles the form submission for adding/updating classes.
 */
async function handleClassFormSubmission(event) {
    event.preventDefault();
    console.log('[handleClassFormSubmission] Form submitted.');

    const horario1 = document.getElementById('horario1').value;
    const horario2 = document.getElementById('horario2').value;

    if (horario1 && horario2 && horario1 > horario2) {
        showMessageBox('O Horário de Início não pode ser depois do Horário de Fim.', 'error');
        return;
    }

    const classData = {
        bloco: document.getElementById('bloco').value,
        andar: document.getElementById('andar').value,
        sala: document.getElementById('sala').value,
        disciplina: document.getElementById('disciplina').value,
        turmas: document.getElementById('turmas').value,
        professor: document.getElementById('professor').value,
        horario1: horario1,
        horario2: horario2,
        turno: document.getElementById('turno').value,
        diaSemana: DAY_MAP_PT[document.getElementById('diaSemana').value],
        prioridade: document.getElementById('prioridade').value,
        salaAberta: document.getElementById('toggle-sala-aberta').classList.contains('open')
    };

    console.log('[handleClassFormSubmission] Data to be saved/updated:', classData); // Crucial log

    const editId = document.getElementById('editClassId').value;
    if (editId) {
        classData.id = parseInt(editId);
        console.log('[handleClassFormSubmission] Updating existing class:', classData);
        await updateItem(classData, STORE_NAMES.CLASSES);
    } else {
        console.log('[handleClassFormSubmission] Adding new class:', classData);
        await addItem(classData, STORE_NAMES.CLASSES);
    }
}

/**
 * Handles the form submission for adding/updating events.
 */
async function handleEventFormSubmission(event) {
    event.preventDefault();
    console.log('[handleEventFormSubmission] Form submitted.');

    const horarioInicio = document.getElementById('horarioInicioEvento').value;
    const horarioFim = document.getElementById('horarioFimEvento').value;

    if (horarioInicio && horarioFim && horarioInicio > horarioFim) {
        showMessageBox('O Horário de Início do Evento não pode ser depois do Horário de Fim.', 'error');
        return;
    }

    const eventData = {
        titulo: document.getElementById('tituloEvento').value,
        local: document.getElementById('localEvento').value,
        data: document.getElementById('dataEvento').value,
        horarioInicio: horarioInicio,
        horarioFim: horarioFim,
        turno: document.getElementById('turnoEvento').value
    };

    console.log('[handleEventFormSubmission] Data to be saved/updated:', eventData); // *** CRUCIAL LOG ***

    const editId = document.getElementById('editEventId').value;
    if (editId) {
        eventData.id = parseInt(editId);
        console.log('[handleEventFormSubmission] Updating existing event:', eventData);
        await updateItem(eventData, STORE_NAMES.EVENTS);
    } else {
        console.log('[handleEventFormSubmission] Adding new event:', eventData);
        await addItem(eventData, STORE_NAMES.EVENTS);
    }
}


/**
 * Resets the admin class form fields and state.
 */
function resetClassForm() {
    document.getElementById('formTurma').reset();
    document.getElementById('editClassId').value = '';
    document.querySelector('#formTurma button[type="submit"]').textContent = 'Salvar Turma';
    document.getElementById('toggle-sala-aberta').classList.remove('open');
    document.getElementById('toggle-sala-aberta').classList.add('closed');
    document.getElementById('toggle-sala-aberta').innerHTML = '<i class="fas fa-lock"></i> Sala Fechada';
    document.getElementById('prioridade').value = 'Média';
    console.log('[resetClassForm] Class form reset.');
}

/**
 * Resets the admin event form fields and state.
 */
function resetEventForm() {
    document.getElementById('formEvento').reset();
    document.getElementById('editEventId').value = '';
    document.querySelector('#formEvento button[type="submit"]').textContent = 'Salvar Evento';
    // Reset select fields to default option if they have one
    document.getElementById('turnoEvento').value = '';
    console.log('[resetEventForm] Event form reset.');
}


/**
 * Opens the login modal.
 */
function abrirLogin() {
    document.getElementById('loginModal').classList.add('is-active');
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-senha').value = '';
    console.log('[abrirLogin] Login modal opened.');
}

/**
 * Hides the login modal.
 */
function hideLoginModal() {
    document.getElementById('loginModal').classList.remove('is-active');
    console.log('[hideLoginModal] Login modal hidden.');
}

/**
 * Validates admin login credentials.
 */
function validarLogin() {
    const usuario = document.getElementById('login-usuario').value;
    const senha = document.getElementById('login-senha').value;
    console.log(`[validarLogin] Attempting login with user: ${usuario}`);

    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        loggedIn = true;
        hideLoginModal(); // Hide login modal
        showAdminPanel(); // Show admin page
        showForm('class'); // Show class form and table by default on login
        showTable('classes');
        console.log('[validarLogin] Login successful!');
    } else {
        showMessageBox('Usuário ou senha incorretos!', 'error');
        console.warn('[validarLogin] Login failed: incorrect credentials.');
    }
}

/**
 * Shows the main dashboard view and hides other views.
 */
function showDashboard() {
    document.getElementById('admin-panel-page').classList.remove('is-active');
    document.getElementById('dashboard-view').classList.add('is-active');
    renderDashboardItems(); // Re-render dashboard items when shown
    console.log('[showDashboard] Displaying dashboard view.');
}

/**
 * Shows the admin panel view and hides other views.
 */
function showAdminPanel() {
    document.getElementById('dashboard-view').classList.remove('is-active');
    document.getElementById('admin-panel-page').classList.add('is-active');
    // Ensure forms and tables are rendered/updated when admin panel is shown
    showForm('class'); // Default to classes form
    showTable('classes'); // Default to classes table
    console.log('[showAdminPanel] Displaying admin panel view.');
}

/**
 * Toggles between Class and Event forms in the Admin Panel.
 * @param {string} formType 'class' or 'event'
 */
function showForm(formType) {
    console.log(`[showForm] Switching to ${formType} form.`);
    document.getElementById('formTurma').classList.remove('active');
    document.getElementById('formEvento').classList.remove('active');
    document.getElementById('tab-classes').classList.remove('active');
    document.getElementById('tab-events').classList.remove('active');

    if (formType === 'class') {
        document.getElementById('formTurma').classList.add('active');
        document.getElementById('tab-classes').classList.add('active');
        resetClassForm(); // Reset form when switching tabs
    } else {
        document.getElementById('formEvento').classList.add('active');
        document.getElementById('tab-events').classList.add('active');
        resetEventForm(); // Reset form when switching tabs
    }
}

/**
 * Toggles between Classes and Events tables in the Admin Panel.
 * @param {string} tableType 'classes' or 'events'
 */
function showTable(tableType) {
    console.log(`[showTable] Switching to ${tableType} table.`);
    document.getElementById('classes-table-container').classList.remove('active');
    document.getElementById('events-table-container').classList.remove('active');
    document.getElementById('table-tab-classes').classList.remove('active');
    document.getElementById('table-tab-events').classList.remove('active');

    if (tableType === 'classes') {
        document.getElementById('classes-table-container').classList.add('active');
        document.getElementById('table-tab-classes').classList.add('active');
        renderAdminTable(STORE_NAMES.CLASSES);
    } else {
        document.getElementById('events-table-container').classList.add('active');
        document.getElementById('table-tab-events').classList.add('active');
        renderAdminTable(STORE_NAMES.EVENTS);
    }
}


/**
 * Toggles the fullscreen mode.
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .catch((err) => {
                showMessageBox(`Erro ao entrar em tela cheia: ${err.message}. Seu navegador pode ter restrições (ex: deve ser iniciado por um gesto do usuário).`, 'error');
            });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen()
                .catch((err) => {
                    showMessageBox(`Erro ao sair da tela cheia: ${err.message}.`, 'error');
                });
        }
    }
    console.log('[toggleFullscreen] Fullscreen toggled.');
}

/**
 * Toggles the sala aberta/fechada status in the admin form.
 */
function toggleSalaAberta() {
    const toggleButton = document.getElementById('toggle-sala-aberta');
    if (toggleButton.classList.contains('closed')) {
        toggleButton.classList.remove('closed');
        toggleButton.classList.add('open');
        toggleButton.innerHTML = '<i class="fas fa-lock-open"></i> Sala Aberta';
    } else {
        toggleButton.classList.remove('open');
        toggleButton.classList.add('closed');
        toggleButton.innerHTML = '<i class="fas fa-lock"></i> Sala Fechada';
    }
    console.log('[toggleSalaAberta] Sala status toggled.');
}

/**
 * Updates the current date and time in the header.
 */
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('datetime').textContent = now.toLocaleDateString('pt-BR', options);
}

/**
 * Updates the timer for the next upcoming class/event.
 */
async function updateNextClassTimer() {
    const now = new Date();
    const currentDayNameRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now).toLowerCase();
    const currentDayName = DAY_MAP_PT[currentDayNameRaw] || currentDayNameRaw; // Normalize
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const allClasses = await getItems(STORE_NAMES.CLASSES);
    const allEvents = await getItems(STORE_NAMES.EVENTS);

    const upcomingItems = [];

    if (allClasses) {
        allClasses.forEach(cls => {
            const classDayNormalized = cls.diaSemana.toLowerCase();
            if (classDayNormalized === currentDayName && cls.horario1 >= currentTime) {
                upcomingItems.push({ type: 'aula', name: cls.disciplina, time: cls.horario1 });
            }
        });
    }

    if (allEvents) {
        allEvents.forEach(event => {
            const [year, month, day] = event.data.split('-').map(Number);
            const eventDate = new Date(year, month - 1, day);
            const eventDayName = eventDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
            if (eventDayName === currentDayName && event.horarioInicio >= currentTime) {
                upcomingItems.push({ type: 'evento', name: event.titulo, time: event.horarioInicio });
            }
        });
    }

    upcomingItems.sort((a, b) => a.time.localeCompare(b.time));

    if (upcomingItems.length > 0) {
        const nextItem = upcomingItems[0];
        document.getElementById('nextClassTimer').textContent = `Próximo ${nextItem.type}: ${nextItem.name} às ${nextItem.time}`;
    } else {
        document.getElementById('nextClassTimer').textContent = 'Nenhuma aula ou evento próximo.';
    }
}


/**
 * Exports data to a JSON file.
 * @param {string} storeName The name of the object store to export ('classes' or 'events').
 */
async function exportarDados(storeName) {
    const items = await getItems(storeName);
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName}_unipampa.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageBox(`${storeName === STORE_NAMES.CLASSES ? 'Aulas' : 'Eventos'} exportados para JSON com sucesso!`, 'success');
    console.log(`[exportarDados] Data from ${storeName} exported.`);
}

/**
 * Exports data to a CSV file.
 * @param {string} storeName The name of the object store to export ('classes' or 'events').
 */
async function exportarCSV(storeName) {
    const items = await getItems(storeName);
    if (items.length === 0) {
        showMessageBox(`Não há dados de ${storeName === STORE_NAMES.CLASSES ? 'aulas' : 'eventos'} para exportar em CSV.`, 'info');
        return;
    }

    let headers;
    if (storeName === STORE_NAMES.CLASSES) {
        headers = ["id", "bloco", "andar", "sala", "disciplina", "turmas", "professor", "horario1", "horario2", "turno", "diaSemana", "salaAberta", "prioridade"];
    } else { // Events
        headers = ["id", "titulo", "local", "data", "horarioInicio", "horarioFim", "turno"];
    }
    let csvContent = headers.join(";") + "\n"; // Use semicolon as delimiter

    items.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] !== undefined ? row[header] : '';
            if (typeof value === 'boolean') {
                value = value ? 'Sim' : 'Não';
            }
            // For event data, format date to standard ISO-MM-DD
            if (header === 'data' && value) {
                value = new Date(value).toISOString().split('T')[0];
            }
            // Escape semicolons and newlines within the value if present, and wrap in quotes
            if (typeof value === 'string' && (value.includes(';') || value.includes('\n') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += values.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName}_unipampa.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageBox(`${storeName === STORE_NAMES.CLASSES ? 'Aulas' : 'Eventos'} exportados para CSV com sucesso!`, 'success');
    console.log(`[exportarCSV] Data from ${storeName} exported as CSV.`);
}


/**
 * Imports data from a JSON file.
 * @param {Event} event The file input change event.
 * @param {string} storeName The name of the object store to import into ('classes' or 'events').
 */
function importarDados(event, storeName) {
    const file = event.target.files[0];
    if (!file) {
        console.warn('[importarDados] No file selected for import.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedItems = JSON.parse(e.target.result);
            const dbInstance = await openDB();
            const transaction = dbInstance.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            let successCount = 0;
            let errorCount = 0;
            console.log(`[importarDados] Starting import into ${storeName}.`);

            for (const item of importedItems) {
                try {
                    // Normalize diaSemana for classes
                    if (storeName === STORE_NAMES.CLASSES && item.diaSemana) {
                        item.diaSemana = DAY_MAP_PT[item.diaSemana.toLowerCase()] || item.diaSemana;
                    }
                    // For events, ensure date is in ISO-MM-DD format if needed (it should be from date input)
                    if (storeName === STORE_NAMES.EVENTS && item.data) {
                        item.data = new Date(item.data).toISOString().split('T')[0];
                    }

                    const itemToAdd = { ...item };
                    delete itemToAdd.id; // Ensure new ID is generated for new entries, avoiding conflicts

                    const request = objectStore.add(itemToAdd);
                    await new Promise(resolve => {
                        request.onsuccess = () => {
                            successCount++;
                            resolve();
                        };
                        request.onerror = (event) => {
                            console.error('Erro ao importar item:', event.target.error, 'Item:', item);
                            errorCount++;
                            resolve(); // Resolve to continue with next item
                        };
                    });
                } catch (itemError) {
                    console.error('Erro ao processar item importado (loop):', itemError, 'Item:', item);
                    errorCount++;
                }
            }

            transaction.oncomplete = () => {
                showMessageBox(`Importação concluída. Adicionados: ${successCount}. Erros: ${errorCount}.`, 'success').then(() => {
                    renderDashboardItems();
                    if (loggedIn) renderAdminTable(storeName);
                });
                console.log(`[importarDados] Import finished for ${storeName}. Successes: ${successCount}, Errors: ${errorCount}.`);
            };
            transaction.onerror = (event) => {
                console.error('Transaction error during import:', event.target.error);
                showMessageBox('Erro na transação de importação de dados.', 'error');
            };

        } catch (error) {
            console.error('Erro ao ler ou parsear arquivo JSON:', error);
            showMessageBox('Erro ao importar arquivo. Verifique se é um JSON válido.', 'error');
        }
    };
    reader.readAsText(file);
}


/**
 * Resets all data in a given IndexedDB store.
 * @param {string} storeName The name of the object store to reset ('classes' or 'events').
 */
async function resetarDados(storeName) {
    const confirmed = await showMessageBox(`ATENÇÃO: Tem certeza que deseja APAGAR TODOS os dados de ${storeName === STORE_NAMES.CLASSES ? 'aulas' : 'eventos'}? Esta ação é irreversível.`, 'warning', null, true);
    if (confirmed) {
        try {
            const dbInstance = await openDB();
            const transaction = dbInstance.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear(); // Clears all data from the object store

            request.onsuccess = () => {
                showMessageBox(`Todos os dados de ${storeName === STORE_NAMES.CLASSES ? 'aulas' : 'eventos'} foram resetados com sucesso!`, 'success').then(() => {
                    renderDashboardItems();
                    if (loggedIn) renderAdminTable(storeName);
                });
                console.log(`[resetarDados] All data in ${storeName} cleared.`);
            };
            request.onerror = (event) => {
                console.error('Error clearing data:', event.target.error);
                showMessageBox(`Erro ao resetar dados de ${storeName === STORE_NAMES.CLASSES ? 'aulas' : 'eventos'}: ${event.target.error.message}`, 'error');
            };
        } catch (error) {
            console.error('Error opening database for clearing data:', error);
            showMessageBox('Erro interno ao acessar o banco de dados.', 'error');
        }
    }
}


// Event Listeners and Initialization
window.onload = async () => {
    console.log('Window loaded. Initializing application.');
    await openDB();
    renderDashboardItems(); // Initial render for dashboard
    updateDateTime();
    updateNextClassTimer();
    setInterval(updateDateTime, 1000); // Update time every second
    setInterval(updateNextClassTimer, 60000); // Update next class/event every minute

    // Class Form Submission
    document.getElementById('formTurma').addEventListener('submit', handleClassFormSubmission);

    // Event Form Submission
    document.getElementById('formEvento').addEventListener('submit', handleEventFormSubmission);


    // Dashboard Filters
    document.getElementById('turno-filter').addEventListener('change', renderDashboardItems);
    document.getElementById('dia-filter').addEventListener('change', renderDashboardItems);

    // Admin Table Filters and Search - Classes
    document.getElementById('admin-dia-filter').addEventListener('change', () => renderAdminTable(STORE_NAMES.CLASSES));
    document.getElementById('busca-admin-classes').addEventListener('input', () => renderAdminTable(STORE_NAMES.CLASSES));

    // Admin Table Filters and Search - Events
    document.getElementById('admin-data-filter-events').addEventListener('change', () => renderAdminTable(STORE_NAMES.EVENTS));
    document.getElementById('busca-admin-events').addEventListener('input', () => renderAdminTable(STORE_NAMES.EVENTS));


    // Add event listeners for table sorting - Classes
    document.querySelectorAll('#admin-table-classes th[data-sort-key]').forEach(header => {
        header.addEventListener('click', () => {
            handleTableSort(header.dataset.sortKey, STORE_NAMES.CLASSES);
        });
    });

    // Add event listeners for table sorting - Events
    document.querySelectorAll('#admin-table-events th[data-sort-key]').forEach(header => {
        header.addEventListener('click', () => {
            handleTableSort(header.dataset.sortKey, STORE_NAMES.EVENTS);
        });
    });


    // Set default dashboard day filter to "Hoje"
    const today = new Date();
    const currentDayNameRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(today).toLowerCase();
    const currentDayForFilter = Object.keys(DAY_MAP_PT).find(key => DAY_MAP_PT[key] === currentDayNameRaw) || 'auto';

    const diaFilterSelect = document.getElementById('dia-filter');
    diaFilterSelect.value = currentDayForFilter;


    // Theme toggle
    document.getElementById('toggleTheme').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const themeIcon = document.querySelector('#toggleTheme i');
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        console.log('[toggleTheme] Theme toggled.');
    });

    // Initial theme icon setup
    const themeIcon = document.querySelector('#toggleTheme i');
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
    console.log('[Initial Setup] Theme icon set.');
};
