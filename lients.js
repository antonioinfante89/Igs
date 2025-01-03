document.addEventListener('DOMContentLoaded', () => {
    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    let resources = JSON.parse(localStorage.getItem('resources')) || [];
    let activities = JSON.parse(localStorage.getItem('activities')) || [];

    const clientForm = document.getElementById('clientForm');
    const clientSubmitBtn = document.getElementById('clientSubmitBtn');
    const clientCancelBtn = document.getElementById('clientCancelBtn');

    function calculateBudget(hours) {
        // Il costo delle risorse è il 20% del budget totale
        const resourceCost = hours * calculateAverageResourceRate();
        const totalBudget = resourceCost * 5; // Moltiplichiamo per 5 per ottenere il 100%
        
        return {
            resourceCost: resourceCost,
            bonusCost: totalBudget * 0.05,
            profitCost: totalBudget * 0.25,
            structureCost: totalBudget * 0.25,
            igsCost: totalBudget * 0.25,
            totalBudget: totalBudget
        };
    }

    function calculateAverageResourceRate() {
        if (resources.length === 0) return 0;
        const totalRate = resources.reduce((sum, r) => sum + r.cost, 0);
        return totalRate / resources.length;
    }

    function updateBudgetBreakdown() {
        const hours = parseFloat(clientForm.querySelector('[name="totalHours"]').value) || 0;
        const budget = calculateBudget(hours);
        
        clientForm.querySelector('[name="hourlyRate"]').value = (budget.totalBudget / hours).toFixed(2);
        clientForm.querySelector('[name="resourceCost"]').value = budget.resourceCost.toFixed(2) + ' €';
        clientForm.querySelector('[name="bonusCost"]').value = budget.bonusCost.toFixed(2) + ' €';
        clientForm.querySelector('[name="profitCost"]').value = budget.profitCost.toFixed(2) + ' €';
        clientForm.querySelector('[name="structureCost"]').value = budget.structureCost.toFixed(2) + ' €';
        clientForm.querySelector('[name="igsCost"]').value = budget.igsCost.toFixed(2) + ' €';
        clientForm.querySelector('[name="totalBudget"]').value = budget.totalBudget.toFixed(2) + ' €';
    }

    clientForm.querySelector('[name="totalHours"]').addEventListener('input', updateBudgetBreakdown);

    clientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const clientId = this.querySelector('[name="clientId"]').value;
        const name = this.querySelector('[name="clientName"]').value;
        const totalHours = parseFloat(this.querySelector('[name="totalHours"]').value);
        const budget = calculateBudget(totalHours);

        const client = {
            id: clientId ? parseInt(clientId) : Date.now(),
            name,
            totalHours,
            budget: budget.totalBudget,
            breakdown: {
                resourceCost: budget.resourceCost,
                bonusCost: budget.bonusCost,
                profitCost: budget.profitCost,
                structureCost: budget.structureCost,
                igsCost: budget.igsCost
            }
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
        clientSubmitBtn.textContent = 'Aggiungi Cliente';
        clientCancelBtn.style.display = 'none';
        updateBudgetBreakdown();
    }

    function editClient(id) {
        const client = clients.find(c => c.id === id);
        if (client) {
            clientForm.querySelector('[name="clientId"]').value = client.id;
            clientForm.querySelector('[name="clientName"]').value = client.name;
            clientForm.querySelector('[name="totalHours"]').value = client.totalHours;
            updateBudgetBreakdown();
            clientSubmitBtn.textContent = 'Modifica Cliente';
            clientCancelBtn.style.display = 'inline-block';
        }
    }

    function deleteClient(id) {
        if (confirm('Sei sicuro di voler eliminare questo cliente e tutti i progetti associati?')) {
            clients = clients.filter(c => c.id !== id);
            // Rimuovi anche i progetti associati
            const clientProjects = projects.filter(p => p.clientId === id);
            projects = projects.filter(p => p.clientId !== id);
            // Rimuovi le attività dei progetti eliminati
            activities = activities.filter(a => !clientProjects.some(p => p.id === a.projectId));
            
            localStorage.setItem('clients', JSON.stringify(clients));
            localStorage.setItem('projects', JSON.stringify(projects));
            localStorage.setItem('activities', JSON.stringify(activities));
            updateUI();
        }
    }

    function getClientStats(clientId) {
        const clientProjects = projects.filter(p => p.clientId === clientId);
        const totalBudget = clientProjects.reduce((sum, p) => sum + p.budget, 0);
        const totalTime = clientProjects.reduce((sum, p) => sum + p.time, 0);
        const projectActivities = activities.filter(a => 
            clientProjects.some(p => p.id === a.projectId)
        );
        const usedBudget = projectActivities.reduce((sum, a) => sum + a.actualCost, 0);
        
        return {
            projectCount: clientProjects.length,
            totalBudget,
            usedBudget,
            totalTime,
            completionPercentage: totalBudget ? (usedBudget / totalBudget) * 100 : 0
        };
    }

    function updateUI() {
        const clientsList = document.getElementById('clientsList');
        clientsList.innerHTML = clients.map(client => {
            const stats = getClientStats(client.id);
            const clientProjects = projects.filter(p => p.clientId === client.id);
            
            return `
                <div class="client-card">
                    <div class="client-header">
                        <h3>${client.name}</h3>
                        <div class="client-actions">
                            <button onclick="editClient(${client.id})" class="btn btn-primary btn-sm">Modifica</button>
                            <button onclick="deleteClient(${client.id})" class="btn btn-danger btn-sm">Elimina</button>
                        </div>
                    </div>
                    <div class="client-stats">
                        <div class="client-stat-item">
                            Budget Totale: <span>${client.budget.toFixed(2)} €</span>
                        </div>
                        <div class="client-stat-item">
                            Ore Totali: <span>${client.totalHours}h</span>
                        </div>
                        <div class="client-stat-item">
                            Progetti: <span>${stats.projectCount}</span>
                        </div>
                        <div class="client-stat-item">
                            Budget Utilizzato: <span>${stats.usedBudget.toFixed(2)} €</span>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(stats.completionPercentage, 100)}%"></div>
                    </div>
                    <div class="project-list">
                        <h4>Progetti</h4>
                        ${clientProjects.map(project => {
                            const projectActivities = activities.filter(a => a.projectId === project.id);
                            const usedBudget = projectActivities.reduce((sum, a) => sum + a.actualCost, 0);
                            const progress = (usedBudget / project.budget) * 100;
                            
                            return `
                                <div class="project-item">
                                    <div class="project-item-header">
                                        <span>${project.name}</span>
                                        <span>${project.budget.toFixed(2)} €</span>
                                    </div>
                                    <div class="progress-container">
                                        <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('') || '<p>Nessun progetto</p>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateUI();

    // Esponi funzioni globali
    window.editClient = editClient;
    window.deleteClient = deleteClient;
});