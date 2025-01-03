document.addEventListener('DOMContentLoaded', () => {
    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let resources = JSON.parse(localStorage.getItem('resources')) || [];
    
    const clientForm = document.getElementById('clientForm');
    const clientSubmitBtn = document.getElementById('clientSubmitBtn');
    const clientCancelBtn = document.getElementById('clientCancelBtn');
    
    function calculateBudgetBreakdown(totalBudget) {
        const resourceBudget = totalBudget * 0.20; // 20% del budget totale
        return {
            resourceBudget,
            bonusBudget: totalBudget * 0.05,  // 5%
            profitBudget: totalBudget * 0.25, // 25%
            structureBudget: totalBudget * 0.25, // 25%
            igsBudget: totalBudget * 0.25     // 25%
        };
    }

    function calculateResourceHours(resourceBudget, hourlyRate) {
        return Math.floor(resourceBudget / hourlyRate);
    }

    function updateResourcesSelection() {
        const resourcesSelection = document.getElementById('resourcesSelection');
        resourcesSelection.innerHTML = resources.map(resource => `
            <div class="resource-checkbox">
                <input type="checkbox" name="selectedResources" value="${resource.id}" 
                       data-hourly-rate="${resource.cost}">
                <label>${resource.name} (${resource.cost.toFixed(2)} €/h)</label>
            </div>
        `).join('');

        // Aggiungi event listener per i checkbox
        const checkboxes = document.querySelectorAll('input[name="selectedResources"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBudgetCalculations);
        });
    }

    function updateBudgetCalculations() {
        const totalBudget = parseFloat(clientForm.querySelector('[name="totalBudget"]').value) || 0;
        const breakdown = calculateBudgetBreakdown(totalBudget);
        
        // Aggiorna visualizzazione budget risorse disponibile
        document.getElementById('resourceBudgetAvailable').textContent = 
            breakdown.resourceBudget.toFixed(2) + ' €';

        // Aggiorna calcoli per ogni risorsa selezionata
        const resourceCalculations = document.getElementById('resourceCalculations');
        const selectedResources = document.querySelectorAll('input[name="selectedResources"]:checked');
        
        if (selectedResources.length > 0) {
            const resourceBudgetPerResource = breakdown.resourceBudget / selectedResources.length;
            
            resourceCalculations.innerHTML = Array.from(selectedResources).map(checkbox => {
                const resource = resources.find(r => r.id === parseInt(checkbox.value));
                const hours = calculateResourceHours(resourceBudgetPerResource, resource.cost);
                return `
                    <div class="resource-calculation-item">
                        <strong>${resource.name}:</strong>
                        <div>Budget: ${resourceBudgetPerResource.toFixed(2)} €</div>
                        <div>Ore disponibili: ${hours}h</div>
                    </div>
                `;
            }).join('');
        } else {
            resourceCalculations.innerHTML = '<p>Seleziona almeno una risorsa</p>';
        }

        // Aggiorna altri campi del budget
        clientForm.querySelector('[name="bonusBudget"]').value = breakdown.bonusBudget.toFixed(2) + ' €';
        clientForm.querySelector('[name="profitBudget"]').value = breakdown.profitBudget.toFixed(2) + ' €';
        clientForm.querySelector('[name="structureBudget"]').value = breakdown.structureBudget.toFixed(2) + ' €';
        clientForm.querySelector('[name="igsBudget"]').value = breakdown.igsBudget.toFixed(2) + ' €';
    }

    // Event Listeners
    clientForm.querySelector('[name="totalBudget"]').addEventListener('input', updateBudgetCalculations);

    clientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const clientId = this.querySelector('[name="clientId"]').value;
        const name = this.querySelector('[name="clientName"]').value;
        const totalBudget = parseFloat(this.querySelector('[name="totalBudget"]').value);
        
        const selectedResources = Array.from(document.querySelectorAll('input[name="selectedResources"]:checked'))
            .map(checkbox => {
                const resource = resources.find(r => r.id === parseInt(checkbox.value));
                const breakdown = calculateBudgetBreakdown(totalBudget);
                const resourceBudget = breakdown.resourceBudget / document.querySelectorAll('input[name="selectedResources"]:checked').length;
                return {
                    id: resource.id,
                    name: resource.name,
                    hourlyRate: resource.cost,
                    budget: resourceBudget,
                    hours: calculateResourceHours(resourceBudget, resource.cost)
                };
            });

        if (selectedResources.length === 0) {
            alert('Seleziona almeno una risorsa');
            return;
        }

        const client = {
            id: clientId ? parseInt(clientId) : Date.now(),
            name,
            totalBudget,
            resources: selectedResources,
            breakdown: calculateBudgetBreakdown(totalBudget)
        };

        if (clientId) {
            clients = clients.map(c => c.id === client.id ? client : c);
        } else {
            clients.push(client);
        }

        localStorage.setItem('clients', JSON.stringify(clients));
        updateUI();
        resetForm();
    });

    clientCancelBtn.addEventListener('click', resetForm);

    function resetForm() {
        clientForm.reset();
        clientForm.querySelector('[name="clientId"]').value = '';
        document.getElementById('resourceCalculations').innerHTML = '';
        clientSubmitBtn.textContent = 'Aggiungi Cliente';
        clientCancelBtn.style.display = 'none';
        updateBudgetCalculations();
    }

    function editClient(id) {
        const client = clients.find(c => c.id === id);
        if (client) {
            clientForm.querySelector('[name="clientId"]').value = client.id;
            clientForm.querySelector('[name="clientName"]').value = client.name;
            clientForm.querySelector('[name="totalBudget"]').value = client.totalBudget;
            
            // Seleziona le risorse del cliente
            document.querySelectorAll('input[name="selectedResources"]').forEach(checkbox => {
                checkbox.checked = client.resources.some(r => r.id === parseInt(checkbox.value));
            });

            updateBudgetCalculations();
            clientSubmitBtn.textContent = 'Modifica Cliente';
            clientCancelBtn.style.display = 'inline-block';
        }
    }

    function deleteClient(id) {
        if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
            clients = clients.filter(c => c.id !== id);
            localStorage.setItem('clients', JSON.stringify(clients));
            updateUI();
        }
    }

    function updateUI() {
        const clientsList = document.getElementById('clientsList');
        clientsList.innerHTML = clients.map(client => `
            <div class="client-card">
                <div class="client-header">
                    <h3>${client.name}</h3>
                    <div class="client-actions">
                        <button onclick="editClient(${client.id})" class="btn btn-primary">Modifica</button>
                        <button onclick="deleteClient(${client.id})" class="btn btn-danger">Elimina</button>
                    </div>
                </div>
                <div class="client-budget">
                    <div class="budget-total">Budget Totale: ${client.totalBudget.toFixed(2)} €</div>
                    <div class="resources-list">
                        <h4>Risorse Assegnate:</h4>
                        ${client.resources.map(resource => `
                            <div class="resource-item">
                                ${resource.name}: ${resource.hours}h disponibili 
                                (${resource.budget.toFixed(2)} €)
                            </div>
                        `).join('')}
                    </div>
                    <div class="budget-breakdown">
                        <div>Bonus (5%): ${client.breakdown.bonusBudget.toFixed(2)} €</div>
                        <div>Utile (25%): ${client.breakdown.profitBudget.toFixed(2)} €</div>
                        <div>Struttura (25%): ${client.breakdown.structureBudget.toFixed(2)} €</div>
                        <div>IGS (25%): ${client.breakdown.igsBudget.toFixed(2)} €</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Inizializzazione
    updateResourcesSelection();
    updateBudgetCalculations();
    updateUI();

    // Esponi funzioni globali
    window.editClient = editClient;
    window.deleteClient = deleteClient;
});