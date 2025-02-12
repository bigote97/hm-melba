import { FirebaseService } from './firebase-service.js';

let allRecords = [];

export class App {
    static async init() {
        try {
            await FirebaseService.initialize();
            
            const records = await FirebaseService.getAllRecords();
            
            this.initializeEventListeners();
            await this.loadRecords();
        } catch (error) {
            let errorMessage = 'Error al inicializar la aplicación.';
            
            if (error.code?.startsWith('auth/')) {
                errorMessage = 'Error de autenticación. Por favor, recarga la página.';
            }
            
            document.getElementById('records').innerHTML = `
                <div class="error">
                    ${errorMessage}
                </div>
            `;
            this.showNotification(errorMessage);
        }
    }

    static async loadRecords() {
        try {
            allRecords = await FirebaseService.getAllRecords();
            
            const currentData = await FirebaseService.getCurrentData();
            if (currentData) {
                this.updateCurrentInfo(currentData);
            } else {
                const lastRecord = allRecords[0];
                if (lastRecord) {
                    this.updateCurrentInfo({
                        peso: lastRecord.peso,
                        date: lastRecord.date,
                        medicamentos: []
                    });
                }
            }
            
            this.populateFilters(allRecords);
            this.displayRecords(allRecords);
        } catch (error) {
            let errorMessage = 'Error al cargar los datos. Por favor, verifica tu conexión a internet.';
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/not-authorized') {
                errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
            }
            
            document.getElementById('records').innerHTML = `
                <div class="error">
                    ${errorMessage}
                </div>
            `;
            this.showNotification(errorMessage);
        }
    }

    static initializeEventListeners() {
        document.getElementById('applyFilters').addEventListener('click', () => this.filterRecords());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.filterRecords());
        document.getElementById('dateFrom').addEventListener('change', () => this.filterRecords());
        document.getElementById('dateTo').addEventListener('change', () => this.filterRecords());
        document.getElementById('keywordSelect').addEventListener('change', () => this.filterRecords());
        document.getElementById('doctorSelect').addEventListener('change', () => this.filterRecords());
        document.getElementById('sortSelect').addEventListener('change', () => this.filterRecords());

        document.querySelectorAll('.accordion-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const section = button.closest('.accordion-section');
                section.classList.toggle('expanded');
            });
        });

        const addRecordPopup = document.getElementById('addRecordPopup');
        document.getElementById('addRecordBtn').addEventListener('click', () => {
            addRecordPopup.style.display = 'flex';
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            document.getElementById('recordDate').value = dateStr;
        });

        document.getElementById('recordDate').addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            e.target.dataset.formattedDate = `${day}/${month}/${year}`;
        });

        document.getElementById('closePopup').addEventListener('click', () => {
            addRecordPopup.style.display = 'none';
            document.getElementById('newRecordForm').reset();
        });

        addRecordPopup.addEventListener('click', (e) => {
            if (e.target === addRecordPopup) {
                addRecordPopup.style.display = 'none';
                document.getElementById('newRecordForm').reset();
            }
        });

        document.getElementById('newRecordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const dateInput = document.getElementById('recordDate');
            if (!dateInput.dataset.formattedDate) {
                const date = new Date(dateInput.value);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                dateInput.dataset.formattedDate = `${day}/${month}/${year}`;
            }
            this.handleNewRecord(e);
        });
        
        document.querySelector('.notification-close').addEventListener('click', () => {
            document.getElementById('errorNotification').classList.remove('show');
        });
    }

    static populateFilters(records) {
        const keywordSet = new Set();
        records.forEach(record => {
            if (record.keywords) {
                record.keywords.forEach(keyword => keywordSet.add(keyword));
            }
        });
        
        const keywordSelect = document.getElementById('keywordSelect');
        keywordSelect.innerHTML = '<option value="">Seleccionar keyword...</option>';
        [...keywordSet].sort().forEach(keyword => {
            const option = document.createElement('option');
            option.value = keyword;
            option.textContent = keyword;
            keywordSelect.appendChild(option);
        });

        const doctorSet = new Set();
        records.forEach(record => {
            if (record.medico) {
                doctorSet.add(record.medico);
            }
        });
        
        const doctorSelect = document.getElementById('doctorSelect');
        doctorSelect.innerHTML = '<option value="">Seleccionar médico...</option>';
        [...doctorSet].sort().forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            doctorSelect.appendChild(option);
        });
    }

    static updateCurrentInfo(lastData) {
        if (lastData.peso) {
            document.getElementById('currentWeight').textContent = lastData.peso;
            document.getElementById('lastUpdateDate').textContent = this.formatDate(lastData.date);
        }

        const today = new Date();
        const activeMedsContainer = document.getElementById('activeMeds');
        activeMedsContainer.innerHTML = '';

        if (lastData.medicamentos && lastData.medicamentos.length > 0) {
            lastData.medicamentos.forEach(med => {
                const endDate = new Date(med.fechaFin);
                if (endDate > today) {
                    const medElement = document.createElement('div');
                    medElement.classList.add('med-item');
                    medElement.innerHTML = `
                        <div class="med-name">${med.nombre}</div>
                        <div class="med-date">Hasta: ${this.formatDate(med.fechaFin)}</div>
                        ${med.instrucciones ? `<div class="med-info">${med.instrucciones}</div>` : ''}
                    `;
                    activeMedsContainer.appendChild(medElement);
                }
            });
        }

        if (activeMedsContainer.children.length === 0) {
            activeMedsContainer.innerHTML = '<div class="no-meds">Sin medicamentos activos</div>';
        }
    }

    static filterRecords() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const selectedKeyword = document.getElementById('keywordSelect').value;
        const selectedDoctor = document.getElementById('doctorSelect').value;

        let filteredRecords = allRecords.filter(record => {
            const searchMatch = !searchText || 
                record.medico?.toLowerCase().includes(searchText) ||
                record.vacuna?.toLowerCase().includes(searchText) ||
                record.keywords?.some(k => k.toLowerCase().includes(searchText));

            const dateMatch = (!dateFrom || record.date >= dateFrom) && 
                            (!dateTo || record.date <= dateTo);

            const keywordMatch = !selectedKeyword || 
                record.keywords?.includes(selectedKeyword);

            const doctorMatch = !selectedDoctor || 
                record.medico === selectedDoctor;

            return searchMatch && dateMatch && keywordMatch && doctorMatch;
        });

        this.displayRecords(filteredRecords);
    }

    static displayRecords(records) {
        const recordsContainer = document.getElementById('records');
        recordsContainer.innerHTML = '';

        const sortOrder = document.getElementById('sortSelect').value;
        const sortedRecords = [...records].sort((a, b) => {
            const dateA = this.parseDate(a.date);
            const dateB = this.parseDate(b.date);
            
            if (sortOrder === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });

        sortedRecords.forEach(record => {
            const recordElement = document.createElement('div');
            recordElement.classList.add('record');
            
            let isEditing = false;

            const updateContent = () => {
                recordElement.innerHTML = `
                    <div class="record-header">
                        <h2>${isEditing ? 
                            `<input type="text" class="edit-input date-input" value="${record.date}" placeholder="dd/mm/aa"/>` : 
                            record.date}</h2>
                        <div class="record-actions">
                            ${isEditing ? `
                                <button class="save-btn">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                                <button class="cancel-edit-btn">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                                <button class="delete-btn">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            ` : `
                                <button class="edit-btn">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                            `}
                        </div>
                    </div>
                    <p><strong>Consulta:</strong> ${isEditing ? 
                        `<input type="text" class="edit-input" value="${record.consulta || ''}" placeholder="Ingrese consulta"/>` : 
                        record.consulta || "No registrada"}</p>
                    <p><strong>Médico:</strong> ${isEditing ? 
                        `<input type="text" class="edit-input" value="${record.medico || ''}" placeholder="Ingrese médico"/>` : 
                        record.medico || "No especificado"}</p>
                    <p><strong>Vacuna:</strong> ${isEditing ? 
                        `<input type="text" class="edit-input" value="${record.vacuna || ''}" placeholder="Ingrese vacuna"/>` : 
                        record.vacuna || "No aplicada"}</p>
                    <p><strong>Peso:</strong> ${isEditing ? 
                        `<input type="text" class="edit-input" value="${record.peso ? record.peso.replace(' kg', '') : ''}" placeholder="Ingrese peso"/>` : 
                        record.peso || "No registrado"}</p>
                    <p><strong>Keywords:</strong> ${isEditing ? 
                        `<input type="text" class="edit-input" value="${record.keywords?.join(", ") || ''}" placeholder="Ingrese keywords separadas por coma"/>` : 
                        record.keywords?.join(", ") || "No hay keywords"}</p>
                `;

                if (isEditing) {
                    const saveBtn = recordElement.querySelector('.save-btn');
                    const cancelBtn = recordElement.querySelector('.cancel-edit-btn');
                    
                    saveBtn.addEventListener('click', () => this.handleSaveEdit(recordElement, record));
                    cancelBtn.addEventListener('click', () => {
                        isEditing = false;
                        updateContent();
                    });
                }

                const editBtn = recordElement.querySelector('.edit-btn');
                const deleteBtn = recordElement.querySelector('.delete-btn');

                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        isEditing = true;
                        updateContent();
                    });
                }

                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        this.showDeleteConfirmation(record);
                    });
                }
            };

            updateContent();
            recordsContainer.appendChild(recordElement);
        });
    }

    static showDeleteConfirmation(record) {
        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        popup.innerHTML = `
            <div class="popup-content">
                <h3>Confirmar eliminación</h3>
                <p>¿Estás seguro que deseas eliminar el registro del ${this.formatDate(record.date)}?</p>
                <div class="popup-buttons">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="confirm-btn">Eliminar</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        popup.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });

        popup.querySelector('.confirm-btn').addEventListener('click', async () => {
            try {
                await FirebaseService.deleteRecord(record);
                await this.loadRecords();
                document.body.removeChild(popup);
                this.showNotification('Registro eliminado exitosamente');
            } catch (error) {
                this.showNotification('Error al eliminar el registro');
            }
        });

        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                document.body.removeChild(popup);
            }
        });
    }

    static clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('keywordSelect').value = '';
        document.getElementById('doctorSelect').value = '';
        this.displayRecords(allRecords);
    }

    static formatDate(dateString) {
        return dateString;
    }

    static parseDate(dateString) {
        const [day, month, year] = dateString.split('/');
        const fullYear = '20' + year;
        return new Date(`${fullYear}-${month}-${day}`);
    }

    static async handleNewRecord(e) {
        e.preventDefault();
        
        const dateInput = document.getElementById('recordDate');
        const formattedDate = dateInput.dataset.formattedDate;
        
        const newRecord = {
            date: formattedDate,
            consulta: document.getElementById('recordConsulta').value || null,
            medico: document.getElementById('recordMedico').value || null,
            vacuna: document.getElementById('recordVacuna').value || null,
            peso: document.getElementById('recordPeso').value ? 
                `${document.getElementById('recordPeso').value} kg` : null,
            keywords: document.getElementById('recordKeywords').value
                .split(',')
                .map(k => k.trim())
                .filter(k => k !== '')
        };

        try {
            await FirebaseService.saveRecord(newRecord);
            allRecords = await FirebaseService.getAllRecords();
            this.populateFilters(allRecords);
            this.displayRecords(allRecords);
            document.getElementById('addRecordPopup').style.display = 'none';
            document.getElementById('newRecordForm').reset();
            this.showNotification('Registro guardado exitosamente');
        } catch (error) {
            this.showNotification('Error al guardar el registro. Por favor, verifica tu conexión e intenta nuevamente.');
        }
    }

    static async handleSaveEdit(recordElement, originalRecord) {
        try {
            const dateInput = recordElement.querySelector('.date-input').value;
            if (!this.isValidDateFormat(dateInput)) {
                this.showNotification('Formato de fecha inválido. Use dd/mm/aa');
                return;
            }

            const updatedRecord = {
                ...originalRecord,
                date: dateInput,
                consulta: recordElement.querySelector('input[placeholder="Ingrese consulta"]').value || null,
                medico: recordElement.querySelector('input[placeholder="Ingrese médico"]').value || null,
                vacuna: recordElement.querySelector('input[placeholder="Ingrese vacuna"]').value || null,
                peso: recordElement.querySelector('input[placeholder="Ingrese peso"]').value ? 
                    `${recordElement.querySelector('input[placeholder="Ingrese peso"]').value} kg` : null,
                keywords: recordElement.querySelector('input[placeholder="Ingrese keywords separadas por coma"]').value
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k !== '')
            };

            await FirebaseService.updateRecord(updatedRecord);
            await this.loadRecords();
            this.showNotification('Registro actualizado exitosamente');
        } catch (error) {
            this.showNotification('Error al actualizar el registro');
        }
    }

    static showNotification(message) {
        const notification = document.getElementById('errorNotification');
        const messageElement = notification.querySelector('.notification-message');
        messageElement.textContent = message;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    static isValidDateFormat(dateString) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{2})$/;
        if (!regex.test(dateString)) return false;

        const [, day, month, year] = dateString.match(regex);
        
        const numDay = parseInt(day, 10);
        const numMonth = parseInt(month, 10);
        const numYear = parseInt(year, 10);

        if (numMonth < 1 || numMonth > 12) return false;
        if (numDay < 1 || numDay > 31) return false;
        if (numYear < 0 || numYear > 99) return false;

        const daysInMonth = new Date(2000 + numYear, numMonth, 0).getDate();
        if (numDay > daysInMonth) return false;

        return true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
}); 