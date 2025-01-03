document.addEventListener('DOMContentLoaded', () => {
    let clients = [];
    let projects = [];
    let resources = [];

    function loadData() {
        clients = JSON.parse(localStorage.getItem('clients')) || [];
        projects = JSON.parse(localStorage.getItem('projects')) || [];
        resources = JSON.parse(localStorage.getItem('resources')) || [];
        console.log('Clients loaded:', clients);
        initializeClientSelect();
        updateProjectsList();
        renderResourcesChart();
    }

    const projectForm = document.getElementById('projectForm');
    const clientSelect = projectForm.querySelector('[name="clientId"]');
    const resourcesAllocation = document.getElementById('resourcesAllocation');

    function initializeClientSelect() {
        clientSelect.innerHTML = `
            <option value="">Seleziona Cliente</option>
            ${clients.map(client => `
                <option value="${client.id}">${client.name}</option>
            `).join('')}
        `;
    }

    function getClientAvailableBudget(clientId) {
        const client = clients.find(c => c.id === parseInt(clientId));
        if (!client) return 0;

        const clientProjects = projects.filter(p => p.clientId === parseInt(clientId));
        const usedBudget = clientProjects.reduce((sum, project) => sum + project.totalCost, 0);
        
        return client.totalBudget - usedBudget;
    }

    function getResourceAvailableHours(clientId, resourceId) {
        const client = clients.find(c => c.id === parseInt(clientId));
        if (!client) return 0;

        const resourceData = client.resources.find(r => r.id === parseInt(resourceId));
        if (!resourceData) return 0;

        const clientProjects = projects.filter(p => p.clientId === parseInt(clientId));
        const usedHours = clientProjects.reduce((sum, project) => {
            const resourceAllocation = project.resources.find(r => r.id === parseInt(resourceId));
            return sum + (resourceAllocation ? resourceAllocation.hours : 0);
        }, 0);

        return resourceData.hours - usedHours;
    }

    function updateClientInfo(clientId) {
        const client = clients.find(c => c.id === parseInt(clientId));
        if (!client) {
            document.querySelector('.client-budget-info').style.display = 'none';
            resourcesAllocation.style.display = 'none';
            return;
        }

        document.querySelector('.client-budget-info').style.display = 'block';
        document.getElementById('totalBudget').textContent = `${client.totalBudget.toFixed(2)} €`;
        
        const availableBudget = getClientAvailableBudget(clientId);
        document.getElementById('availableBudget').textContent = `${availableBudget.toFixed(2)} €`;

        resourcesAllocation.style.display = 'block';
        const resourcesGrid = resourcesAllocation.querySelector('.resources-grid');
        resourcesGrid.innerHTML = client.resources.map(resource => {
            const availableHours = getResourceAvailableHours(clientId, resource.id);
            const resourceData = resources.find(r => r.id === resource.id);
            
            return `
                <div class="resource-allocation-item">
                    <div class="resource-allocation-header">
                        <h4>${resourceData.name}</h4>
                        <span>${availableHours}h disponibili</span>
                    </div>
                    <div class="resource-allocation-details">
                        <div class="form-group">
                            <label>Ore da Allocare</label>
                            <input type="number" 
                                   class="form-control resource-hours" 
                                   name="resource_${resource.id}_hours"
                                   min="0" 
                                   max="${availableHours}"
                                   step="0.5"
                                   data-resource-id="${resource.id}"
                                   data-hourly-rate="${resourceData.cost}">
                        </div>
                        <div class="resource-cost">
                            Costo: <span class="resource-cost-value">0.00 €</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const hourInputs = document.querySelectorAll('.resource-hours');
        hourInputs.forEach(input => {
            input.addEventListener('input', updateProjectSummary);
        });

        updateProjectSummary();
    }

    function updateProjectSummary() {
        const inputs = document.querySelectorAll('.resource-hours');
        let totalHours = 0;
        let totalCost = 0;

        inputs.forEach(input => {
            const hours = parseFloat(input.value) || 0;
            const hourlyRate = parseFloat(input.dataset.hourlyRate);
            const cost = hours * hourlyRate;
            
            totalHours += hours;
            totalCost += cost;

            const costElement = input.closest('.resource-allocation-item')
                                   .querySelector('.resource-cost-value');
            costElement.textContent = `${cost.toFixed(2)} €`;
        });

        document.getElementById('totalHours').textContent = `${totalHours}h`;
        document.getElementById('totalCost').textContent = `${totalCost.toFixed(2)} €`;
        document.querySelector('.project-summary').style.display = 'block';
    }

    function renderResourcesChart() {
        const ctx = document.getElementById('resourcesChart').getContext('2d');
        const resourcesData = resources.map(resource => {
            const totalHours = resource.workingDays * resource.hoursPerDay;
            const allocatedHours = projects.reduce((sum, project) => {
                const allocation = project.resources.find(r => r.id === resource.id);
                return sum + (allocation ? allocation.hours : 0);
            }, 0);

            return {
                name: resource.name,
                totalHours,
                allocatedHours,
                availableHours: totalHours - allocatedHours
            };
        });

        if (window.resourcesChart) {
            window.resourcesChart.destroy();
        }

        window.resourcesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: resourcesData.map(r => r.name),
                datasets: [
                    {
                        label: 'Ore Allocate',
                        data: resourcesData.map(r => r.allocatedHours),
                        backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    },
                    {
                        label: 'Ore Disponibili',
                        data: resourcesData.map(r => r.availableHours),
                        backgroundColor: 'rgba(75, 192, 192, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Ore'
                        }
                    }
                }
            }
        });
    }

    function resetForm() {
        projectForm.reset();
        projectForm.querySelector('[name="projectId"]').value = '';
        document.querySelector('.client-budget-info').style.display = 'none';
        resourcesAllocation.style.display = 'none';
        document.querySelector('.project-summary').style.display = 'none';
    }

    function formatCurrency(amount) {
        return `${amount.toFixed(2)} €`;
    }

    function updateProjectsList() {
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = projects.map(project => {
            const client = clients.find(c => c.id === project.clientId);
            const progress = (project.totalCost / client.totalBudget) * 100;
            
            return `
                <div class="project-card">
                    <div class="project-header">
                        <div>
                            <h3>${project.name}</h3>
                            <p class="client-name">Cliente: ${client.name}</p>
                        </div>
                        <div class="project-actions">
                            <button onclick="editProject(${project.id})" class="btn btn-primary btn-sm">Modifica</button>
                            <button onclick="deleteProject(${project.id})" class="btn btn-danger btn-sm">Elimina</button>
                        </div>
                    </div>

                    <div class="project-resources">
                        <h4>Risorse Allocate:</h4>
                        ${project.resources.map(allocation => {
                            const resource = resources.find(r => r.id === allocation.id);
                            return `
                                <div class="project-resource-item">
                                    <span>${resource.name}</span>
                                    <span>${allocation.hours}h (${formatCurrency(allocation.cost)})</span>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="project-budget">
                        <div class="budget-details">
                            <p>Ore Totali: ${project.totalHours}h</p>
                            <p>Costo Totale: ${formatCurrency(project.totalCost)}</p>
                        </div>
                        <div class="budget-progress">
                            <div class="budget-progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function editProject(id) {
        const project = projects.find(p => p.id === id);
        if (!project) return;

        projectForm.querySelector('[name="projectId"]').value = project.id;
        projectForm.querySelector('[name="clientId"]').value = project.clientId;
        projectForm.querySelector('[name="projectName"]').value = project.name;

        updateClientInfo(project.clientId);

        project.resources.forEach(allocation => {
            const input = projectForm.querySelector(`[name="resource_${allocation.id}_hours"]`);
            if (input) input.value = allocation.hours;
        });

        updateProjectSummary();
        document.querySelector('.project-summary').style.display = 'block';
    }

    function deleteProject(id) {
        if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;
        
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        updateProjectsList();
        renderResourcesChart();
    }

    clientSelect.addEventListener('change', () => {
        updateClientInfo(clientSelect.value);
    });

    projectForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const clientId = parseInt(this.querySelector('[name="clientId"]').value);
        const availableBudget = getClientAvailableBudget(clientId);
        
        const resourceInputs = document.querySelectorAll('.resource-hours');
        const projectResources = Array.from(resourceInputs)
            .map(input => {
                const hours = parseFloat(input.value) || 0;
                if (hours === 0) return null;

                const resourceId = parseInt(input.dataset.resourceId);
                const hourlyRate = parseFloat(input.dataset.hourlyRate);
                return {
                    id: resourceId,
                    hours,
                    cost: hours * hourlyRate
                };
            })
            .filter(r => r !== null);

        if (projectResources.length === 0) {
            alert('Devi allocare almeno una risorsa al progetto');
            return;
        }

        const totalCost = projectResources.reduce((sum, r) => sum + r.cost, 0);
        const projectId = this.querySelector('[name="projectId"]').value;

        if (!projectId && totalCost > availableBudget) {
            alert('Il costo totale del progetto supera il budget disponibile del cliente');
            return;
        }

        const project = {
            id: projectId ? parseInt(projectId) : Date.now(),
            clientId,
            name: this.querySelector('[name="projectName"]').value,
            resources: projectResources,
            totalCost,
            totalHours: projectResources.reduce((sum, r) => sum + r.hours, 0),
            createdAt: new Date().toISOString()
        };

        if (projectId) {
            projects = projects.map(p => p.id === parseInt(projectId) ? project : p);
        } else {
            projects.push(project);
        }

        localStorage.setItem('projects', JSON.stringify(projects));
        updateProjectsList();
        renderResourcesChart();
        resetForm();
    });

    // Inizializzazione
    loadData();

    // Esponi funzioni globali
    window.editProject = editProject;
    window.deleteProject = deleteProject;
});