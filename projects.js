class ProjectManager {
    constructor() {
        this.clients = [];
        this.projects = [];
        this.resources = [];
        this.clientSelect = document.getElementById('clientSelect');
        this.projectForm = document.getElementById('projectForm');
        this.init();
    }
 
    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
    }
 
    loadData() {
        this.clients = JSON.parse(localStorage.getItem('clients')) || [];
        this.projects = JSON.parse(localStorage.getItem('projects')) || [];
        this.resources = JSON.parse(localStorage.getItem('resources')) || [];
        console.log('Loaded clients:', this.clients);
    }
 
    saveData() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
        this.updateUI();
    }
 
    setupEventListeners() {
        this.clientSelect.addEventListener('change', (e) => {
            const clientId = parseInt(e.target.value);
            if (clientId) {
                this.updateClientInfo(clientId);
            }
        });
 
        this.projectForm.addEventListener('submit', (e) => this.handleProjectSubmit(e));
        
        document.addEventListener('click', (e) => {
          if (e.target.classList.contains('edit-project')) {
            const projectId = parseInt(e.target.dataset.projectId);
            this.editProject(projectId);
          } else if (e.target.classList.contains('delete-project')) {
            const projectId = parseInt(e.target.dataset.projectId);
            this.deleteProject(projectId);
          }
        });
    }
 
    updateUI() {
        this.populateClientSelect();
        this.populateFilters();
        this.updateProjectsList();
        this.renderResourcesChart();
    }
 
    populateClientSelect() {
        this.clientSelect.innerHTML = `
            <option value="">Seleziona Cliente</option>
            ${this.clients.map(client => 
                `<option value="${client.id}">${client.name}</option>`
            ).join('')}
        `;
    }
 
    populateFilters() {
        const clientFilter = document.getElementById('clientFilter');
        const resourceFilter = document.getElementById('resourceFilter');
 
        clientFilter.innerHTML = `<option value="">Tutti i Clienti</option>` + 
            this.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        resourceFilter.innerHTML = `<option value="">Tutte le Risorse</option>` +
            this.resources.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
 
        clientFilter.addEventListener('change', () => this.updateProjectsList());  
        resourceFilter.addEventListener('change', () => this.updateProjectsList());
    }
 
    getClientAvailableBudget(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client || !client.totalBudget) return 0;
        
        const clientProjects = this.projects.filter(p => p.clientId === clientId);
        const usedBudget = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
      
        return client.totalBudget - usedBudget;
      }
 
    getResourceAvailableHours(clientId, resourceId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return 0;
 
        const resourceData = client.resources.find(r => r.id === resourceId);
        if (!resourceData) return 0;
 
        const clientProjects = this.projects.filter(p => p.clientId === clientId);
        const usedHours = clientProjects.reduce((sum, project) => {
            const allocation = project.resources.find(r => r.id === resourceId);
            return sum + (allocation ? allocation.hours : 0);
        }, 0);
 
        return resourceData.hours - usedHours;
    }
 
    updateClientInfo(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (!client) return;
 
        document.querySelector('.client-budget-info').style.display = 'block';
        document.getElementById('totalBudget').textContent = 
            `${client.totalBudget.toFixed(2)} €`;
        
        const availableBudget = this.getClientAvailableBudget(clientId);
        document.getElementById('availableBudget').textContent = 
            `${availableBudget.toFixed(2)} €`;
 
        this.updateResourcesAllocation(client);
    }
 
    updateResourcesAllocation(client) {
        const container = document.getElementById('resourcesAllocation');
        container.style.display = 'block';
        
        const resourcesGrid = container.querySelector('.resources-grid');
        resourcesGrid.innerHTML = client.resources.map(resource => {
            const availableHours = this.getResourceAvailableHours(client.id, resource.id);
            const resourceData = this.resources.find(r => r.id === resource.id);
            
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
            input.addEventListener('input', () => this.updateProjectSummary());
        });
 
        this.updateProjectSummary();
    }
 
    updateProjectSummary() {
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
 
    renderResourcesChart() {
        const ctx = document.getElementById('resourcesChart');
        if (!ctx) return;
 
        const resourcesData = this.resources.map(resource => {
            const totalHours = resource.workingDays * resource.hoursPerDay;
            const allocatedHours = this.projects.reduce((sum, project) => {
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
 
        new Chart(ctx, {
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
 
    handleProjectSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        const clientSelect = form.querySelector('#clientSelect');
        if (!clientSelect) {
            console.error('Client select not found');
            return;
        }
    
        const clientId = parseInt(clientSelect.value);
        if (!clientId) {
            alert('Seleziona un cliente');
            return;
        }
        
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
        const projectId = form.querySelector('[name="projectId"]').value;
 
        const availableBudget = this.getClientAvailableBudget(clientId);
 
        if (!projectId && totalCost > availableBudget) {
            alert('Il costo totale del progetto supera il budget disponibile del cliente');
            return;
        }
 
        const project = {
            id: projectId ? parseInt(projectId) : Date.now(),
            clientId,
            name: form.querySelector('[name="projectName"]').value,
            resources: projectResources,
            totalCost,
            totalHours: projectResources.reduce((sum, r) => sum + r.hours, 0),
            createdAt: new Date().toISOString()
        };
 
        if (projectId) {
            this.projects = this.projects.map(p => 
                p.id === parseInt(projectId) ? project : p
            );
        } else {
            this.projects.push(project);
        }
 
        this.saveData();
        this.resetForm();
    }
 
    resetForm() {
        this.projectForm.reset();
        this.projectForm.querySelector('[name="projectId"]').value = '';
        document.querySelector('.client-budget-info').style.display = 'none';
        document.getElementById('resourcesAllocation').style.display = 'none';
        document.querySelector('.project-summary').style.display = 'none';
    }
 
    updateProjectsList() {
        const projectsList = document.getElementById('projectsList');
        const clientFilter = document.getElementById('clientFilter').value;
        const resourceFilter = document.getElementById('resourceFilter').value;
 
        const filteredProjects = this.projects
            .filter(p => !clientFilter || p.clientId === parseInt(clientFilter))
            .filter(p => !resourceFilter || p.resources.some(r => r.id === parseInt(resourceFilter)));
        
        projectsList.innerHTML = filteredProjects.map(project => {
            const client = this.clients.find(c => c.id === project.clientId);
            const progress = (project.totalCost / client.totalBudget) * 100;
            
            return `
                <div class="project-card">
                    <div class="project-header">
                        <div>
                            <h3>${project.name}</h3>
                            <p class="client-name">Cliente: ${client.name}</p>
                        </div>
                        <div class="project-actions">
                            <button class="btn btn-primary btn-sm edit-project" data-project-id="${project.id}">
                                Modifica
                            </button>
                            <button class="btn btn-danger btn-sm delete-project" data-project-id="${project.id}">
                                Elimina
                            </button>
                        </div>
                    </div>
 
                    <div class="project-resources">
                        <h4>Risorse Allocate:</h4>
                        ${project.resources.map(allocation => {
                            const resource = this.resources.find(r => r.id === allocation.id);
                            return `
                                <div class="project-resource-item">
                                    <span>${resource.name}</span>
                                    <span>${allocation.hours}h (${this.formatCurrency(allocation.cost)})</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
 
                    <div class="project-budget">
                        <div class="budget-details">
                            <p>Ore Totali: ${project.totalHours}h</p>
                            <p>Costo Totale: ${this.formatCurrency(project.totalCost)}</p>
                        </div>
                        <div class="budget-progress">
                            <div class="budget-progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
 
    formatCurrency(amount) {
        return `${amount.toFixed(2)} €`;
    }
 
    editProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;
 
        this.projectForm.querySelector('[name="projectId"]').value = project.id;
        this.projectForm.querySelector('[name="clientId"]').value = project.clientId;
        this.projectForm.querySelector('[name="projectName"]').value = project.name;
 
        this.updateClientInfo(project.clientId);
 
        project.resources.forEach(allocation => {
            const input = this.projectForm.querySelector(
                `[name="resource_${allocation.id}_hours"]`
            );
            if (input) input.value = allocation.hours;
        });
 
        this.updateProjectSummary();
        document.querySelector('.project-summary').style.display = 'block';
    }
 
    deleteProject(id) {
        if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;
        
        this.projects = this.projects.filter(p => p.id !== id);
        this.saveData();
    }
 }
 
 const projectManager = new ProjectManager();
 
 window.projectManager = projectManager;