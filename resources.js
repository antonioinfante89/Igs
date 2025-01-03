document.addEventListener('DOMContentLoaded', () => {
    let resources = JSON.parse(localStorage.getItem('resources')) || [];

    const resourceForm = document.getElementById('resourceForm');
    const resourceSubmitBtn = document.getElementById('resourceSubmitBtn');
    const resourceCancelBtn = document.getElementById('resourceCancelBtn');

    function calculateHourlyRate(monthlyPay, workingDays, hoursPerDay) {
        const annualPay = monthlyPay * 12;
        const annualHours = workingDays * hoursPerDay;
        return annualPay / annualHours;
    }

    // Gestione input per calcolo automatico
    ['monthlyPay', 'workingDays', 'hoursPerDay'].forEach(field => {
        const input = resourceForm.querySelector(`[name="${field}"]`);
        input.addEventListener('input', updateHourlyRate);
    });

    function updateHourlyRate() {
        const monthlyPay = parseFloat(resourceForm.querySelector('[name="monthlyPay"]').value) || 0;
        const workingDays = parseFloat(resourceForm.querySelector('[name="workingDays"]').value) || 0;
        const hoursPerDay = parseFloat(resourceForm.querySelector('[name="hoursPerDay"]').value) || 0;
        
        if (monthlyPay && workingDays && hoursPerDay) {
            const hourlyRate = calculateHourlyRate(monthlyPay, workingDays, hoursPerDay);
            resourceForm.querySelector('[name="hourlyRate"]').value = hourlyRate.toFixed(2);
        }
    }

    // Gestione form
    resourceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const resource = {
            id: this.querySelector('[name="resourceId"]').value || Date.now(),
            name: this.querySelector('[name="resourceName"]').value,
            monthlyPay: parseFloat(this.querySelector('[name="monthlyPay"]').value),
            workingDays: parseFloat(this.querySelector('[name="workingDays"]').value),
            hoursPerDay: parseFloat(this.querySelector('[name="hoursPerDay"]').value),
            cost: parseFloat(this.querySelector('[name="hourlyRate"]').value)
        };

        const index = resources.findIndex(r => r.id === parseInt(resource.id));
        if (index !== -1) {
            resources[index] = resource;
        } else {
            resources.push(resource);
        }

        localStorage.setItem('resources', JSON.stringify(resources));
        updateUI();
        resetForm();
    });

    resourceCancelBtn.addEventListener('click', resetForm);

    function resetForm() {
        resourceForm.reset();
        resourceForm.querySelector('[name="resourceId"]').value = '';
        resourceSubmitBtn.textContent = 'Aggiungi Risorsa';
        resourceCancelBtn.style.display = 'none';
    }

    function editResource(id) {
        const resource = resources.find(r => r.id === parseInt(id));
        if (resource) {
            resourceForm.querySelector('[name="resourceId"]').value = resource.id;
            resourceForm.querySelector('[name="resourceName"]').value = resource.name;
            resourceForm.querySelector('[name="monthlyPay"]').value = resource.monthlyPay;
            resourceForm.querySelector('[name="workingDays"]').value = resource.workingDays;
            resourceForm.querySelector('[name="hoursPerDay"]').value = resource.hoursPerDay;
            resourceForm.querySelector('[name="hourlyRate"]').value = resource.cost;
            resourceSubmitBtn.textContent = 'Modifica Risorsa';
            resourceCancelBtn.style.display = 'inline-block';
        }
    }

    function deleteResource(id) {
        const clients = JSON.parse(localStorage.getItem('clients')) || [];
        const clientsUsingResource = clients.filter(client => 
            client.resources.some(r => r.id === parseInt(id))
        );

        if (clientsUsingResource.length > 0) {
            alert('Non puoi eliminare questa risorsa perché è utilizzata in uno o più clienti.');
            return;
        }
        
        if (confirm('Sei sicuro di voler eliminare questa risorsa?')) {
            resources = resources.filter(r => r.id !== parseInt(id));
            localStorage.setItem('resources', JSON.stringify(resources));
            updateUI();
        }
    }

    function getResourceStats(resourceId) {
        const clients = JSON.parse(localStorage.getItem('clients')) || [];
        let totalHours = 0;
        let assignedClients = 0;

        clients.forEach(client => {
            const resourceData = client.resources.find(r => r.id === parseInt(resourceId));
            if (resourceData) {
                totalHours += resourceData.hours;
                assignedClients++;
            }
        });

        return { totalHours, assignedClients };
    }

    function updateUI() {
        const resourcesList = document.getElementById('resourcesList');
        resourcesList.innerHTML = resources.map(resource => {
            const stats = getResourceStats(resource.id);
            return `
                <div class="resource-card">
                    <div class="resource-info">
                        <h3>${resource.name}</h3>
                        <div class="resource-details">
                            <div class="resource-detail">
                                Costo Orario: <span>${resource.cost.toFixed(2)} €/h</span>
                            </div>
                            <div class="resource-detail">
                                Ore Disponibili: <span>${stats.totalHours}h</span>
                            </div>
                            <div class="resource-detail">
                                Clienti: <span>${stats.assignedClients}</span>
                            </div>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <button onclick="editResource(${resource.id})" class="btn btn-primary btn-sm">Modifica</button>
                        <button onclick="deleteResource(${resource.id})" class="btn btn-danger btn-sm">Elimina</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Inizializzazione
    updateUI();

    // Esponi funzioni globali
    window.editResource = editResource;
    window.deleteResource = deleteResource;
});