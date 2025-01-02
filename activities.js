document.addEventListener('DOMContentLoaded', () => {
    let resources = JSON.parse(localStorage.getItem('resources')) || [];
    let projects = JSON.parse(localStorage.getItem('projects')) || [];
    let activities = JSON.parse(localStorage.getItem('activities')) || [];

    function saveToLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(activities));
        renderProjectCards();
    }

    function calculateProjectMetrics(project) {
        const projectActivities = activities.filter(a => a.projectId === project.id);
        
        const plannedCost = projectActivities.reduce((sum, a) => 
            sum + (a.plannedHourlyRate * a.plannedTime), 0);
        
        const actualCost = projectActivities.reduce((sum, a) => 
            sum + ((a.actualHourlyRate || a.plannedHourlyRate) * (a.actualTime || 0)), 0);

        const plannedTime = projectActivities.reduce((sum, a) => sum + a.plannedTime, 0);
        const actualTime = projectActivities.reduce((sum, a) => sum + (a.actualTime || 0), 0);

        const remainingTime = project.time - plannedTime;
        const remainingBudget = project.budget - plannedCost;
        const budgetVariance = plannedCost - actualCost;

        return {
            originalBudget: project.budget,
            originalTime: project.time,
            plannedCost,
            actualCost,
            plannedTime,
            actualTime,
            remainingTime,
            remainingBudget,
            budgetVariance,
            timeProgress: (plannedTime / project.time) * 100,
            budgetProgress: (plannedCost / project.budget) * 100
        };
    }

    function formatCurrency(amount) {
        return amount.toFixed(2) + ' €';
    }

    function createProjectCard(project) {
        const metrics = calculateProjectMetrics(project);
        const resource = resources.find(r => r.id === project.resourceId);

        const progressClass = (progress) => {
            if (progress >= 90) return 'danger';
            if (progress >= 75) return 'warning';
            return '';
        };

        return `
            <div class="project-card">
                <div class="project-header">
                    <h2>${project.name}</h2>
                    <button class="btn btn-primary" onclick="openModal(${project.id})">+ Attività</button>
                </div>

                <div class="project-metrics">
                    <div class="metric-item">
                        <h3>Budget Iniziale</h3>
                        <p>Budget: ${formatCurrency(project.budget)}</p>
                        <p>Tempo: ${project.time}h (${formatCurrency(project.hourlyRate)}/h)</p>
                    </div>
                    <div class="metric-item">
                        <h3>Budget Rimanente</h3>
                        <p>Budget: ${formatCurrency(metrics.remainingBudget)}</p>
                        <p>Tempo: ${metrics.remainingTime.toFixed(2)}h</p>
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass(metrics.budgetProgress)}" 
                                 style="width: ${Math.min(metrics.budgetProgress, 100)}%"></div>
                        </div>
                    </div>
                    <div class="metric-item">
                        <h3>Costi Pianificati vs Effettivi</h3>
                        <p>Pianificato: ${formatCurrency(metrics.plannedCost)}</p>
                        <p>Effettivo: ${formatCurrency(metrics.actualCost)}</p>
                        <p>Differenza: ${formatCurrency(metrics.budgetVariance)}</p>
                    </div>
                    <div class="metric-item">
                        <h3>Tempi</h3>
                        <p>Pianificato: ${metrics.plannedTime.toFixed(2)}h</p>
                        <p>Effettivo: ${metrics.actualTime.toFixed(2)}h</p>
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass(metrics.timeProgress)}" 
                                 style="width: ${Math.min(metrics.timeProgress, 100)}%"></div>
                        </div>
                    </div>
                </div>

                <div class="activities-list">
                    <h3>Attività</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrizione</th>
                                <th>Risorsa</th>
                                <th>Tempo Previsto</th>
                                <th>Costo Orario Previsto</th>
                                <th>Tempo Effettivo</th>
                                <th>Costo Orario Effettivo</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activities
                                .filter(a => a.projectId === project.id)
                                .map(activity => {
                                    const resource = resources.find(r => r.id === activity.resourceId);
                                    return `
                                        <tr>
                                            <td>${activity.description}</td>
                                            <td>${resource ? resource.name : 'N/A'}</td>
                                            <td>${activity.plannedTime}h</td>
                                            <td>${formatCurrency(activity.plannedHourlyRate)}/h</td>
                                            <td>${activity.actualTime || 0}h</td>
                                            <td>${activity.actualHourlyRate ? formatCurrency(activity.actualHourlyRate) + '/h' : 'Non completata'}</td>
                                            <td>
                                                <button onclick="editActivity(${activity.id})" class="btn btn-primary">Modifica</button>
                                                <button onclick="deleteActivity(${activity.id})" class="btn btn-danger">Elimina</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderProjectCards() {
        const container = document.getElementById('project-cards');
        container.innerHTML = projects.map(project => createProjectCard(project)).join('');
    }

    function openModal(projectId, activityId = null) {
        const modal = document.getElementById('activityModal');
        const form = document.getElementById('activityForm');
        const project = projects.find(p => p.id === projectId);
        
        if (!project) return;

        const activity = activityId ? activities.find(a => a.id === activityId) : null;
        
        form.querySelector('[name="projectId"]').value = projectId;
        
        const resourceSelect = form.querySelector('[name="resourceId"]');
        resourceSelect.innerHTML = resources.map(r => 
            `<option value="${r.id}">${r.name}</option>`
        ).join('');

        if (activity) {
            form.querySelector('[name="description"]').value = activity.description;
            form.querySelector('[name="resourceId"]').value = activity.resourceId;
            form.querySelector('[name="plannedTime"]').value = activity.plannedTime;
            form.querySelector('[name="plannedHourlyRate"]').value = activity.plannedHourlyRate;
            form.querySelector('[name="actualTime"]').value = activity.actualTime || '';
            form.querySelector('[name="actualHourlyRate"]').value = activity.actualHourlyRate || '';
            form.dataset.activityId = activity.id;
        } else {
            form.reset();
            form.dataset.activityId = '';
        }
        
        modal.style.display = 'block';
    }

    function editActivity(activityId) {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
            openModal(activity.projectId, activityId);
        }
    }

    function deleteActivity(id) {
        if (confirm('Sei sicuro di voler eliminare questa attività?')) {
            activities = activities.filter(a => a.id !== id);
            saveToLocalStorage();
        }
    }

    // Event Listeners
    const modal = document.getElementById('activityModal');
    const closeBtn = document.querySelector('.close');
    const activityForm = document.getElementById('activityForm');

    closeBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    activityForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const projectId = parseInt(this.projectId.value);
        const project = projects.find(p => p.id === projectId);
        const activityId = this.dataset.activityId;
        
        const activity = {
            id: activityId ? parseInt(activityId) : Date.now(),
            projectId,
            description: this.description.value,
            resourceId: parseInt(this.resourceId.value),
            plannedTime: parseFloat(this.plannedTime.value),
            plannedHourlyRate: parseFloat(this.plannedHourlyRate.value),
            actualTime: this.actualTime.value ? parseFloat(this.actualTime.value) : 0,
            actualHourlyRate: this.actualHourlyRate.value ? parseFloat(this.actualHourlyRate.value) : 0
        };

        const metrics = calculateProjectMetrics(project);

        // Verifica budget e tempo disponibile
        const timeToCheck = activityId ? 
            activity.plannedTime - (activities.find(a => a.id === parseInt(activityId))?.plannedTime || 0) :
            activity.plannedTime;

        const costToCheck = activityId ?
            activity.plannedTime * activity.plannedHourlyRate - 
            (activities.find(a => a.id === parseInt(activityId))?.plannedTime || 0) * 
            (activities.find(a => a.id === parseInt(activityId))?.plannedHourlyRate || 0) :
            activity.plannedTime * activity.plannedHourlyRate;

        if (metrics.remainingTime - timeToCheck < 0) {
            alert('Il tempo pianificato eccede il budget di ore del progetto!');
            return;
        }

        if (metrics.remainingBudget - costToCheck < 0) {
            alert('Il costo pianificato eccede il budget del progetto!');
            return;
        }

        if (activityId) {
            activities = activities.map(a => a.id === parseInt(activityId) ? activity : a);
        } else {
            activities.push(activity);
        }

        saveToLocalStorage();
        modal.style.display = 'none';
        this.reset();
    });

    // Inizializza il rendering
    renderProjectCards();

    // Esponi funzioni globali
    window.openModal = openModal;
    window.editActivity = editActivity;
    window.deleteActivity = deleteActivity;
});