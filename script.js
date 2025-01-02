let resources = JSON.parse(localStorage.getItem('resources')) || [];
let projects = JSON.parse(localStorage.getItem('projects')) || [];

function saveToLocalStorage() {
    localStorage.setItem('resources', JSON.stringify(resources));
    localStorage.setItem('projects', JSON.stringify(projects));
    updateUI();
}

function calculateHourlyRate(monthlyPay, workingDays, hoursPerDay) {
    const annualPay = monthlyPay * 12;
    const annualHours = workingDays * hoursPerDay;
    return annualPay / annualHours;
}

function calculateMarkup(baseCost, markups) {
    let total = baseCost;
    if (markups.markup1) total *= 1.20; // 20% costo orario
    if (markups.markup2) total *= 1.05; // 5% bonus
    if (markups.markup3) total *= 1.25; // 25% struttura
    if (markups.markup4) total *= 1.25; // 25% utile
    if (markups.markup5) total *= 1.25; // 25% IGS
    return total;
}

// Gestione Risorse
const resourceForm = document.getElementById('resourceForm');
const resourceSubmitBtn = document.getElementById('resourceSubmitBtn');
const resourceCancelBtn = document.getElementById('resourceCancelBtn');

['monthlyPay', 'workingDays', 'hoursPerDay'].forEach(field => {
    resourceForm[field].addEventListener('input', () => {
        const monthlyPay = parseFloat(resourceForm.monthlyPay.value) || 0;
        const workingDays = parseFloat(resourceForm.workingDays.value) || 0;
        const hoursPerDay = parseFloat(resourceForm.hoursPerDay.value) || 0;
        
        if (monthlyPay && workingDays && hoursPerDay) {
            resourceForm.hourlyRate.value = calculateHourlyRate(monthlyPay, workingDays, hoursPerDay).toFixed(2);
        }
    });
});

resourceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const resource = {
        id: this.resourceId.value ? parseInt(this.resourceId.value) : Date.now(),
        name: this.resourceName.value,
        monthlyPay: parseFloat(this.monthlyPay.value),
        workingDays: parseFloat(this.workingDays.value),
        hoursPerDay: parseFloat(this.hoursPerDay.value),
        cost: parseFloat(this.hourlyRate.value)
    };

    if (this.resourceId.value) {
        resources = resources.map(r => r.id === resource.id ? resource : r);
    } else {
        resources.push(resource);
    }

    saveToLocalStorage();
    resetResourceForm();
});

resourceCancelBtn.addEventListener('click', resetResourceForm);

function resetResourceForm() {
    resourceForm.reset();
    resourceForm.resourceId.value = '';
    resourceSubmitBtn.textContent = 'Aggiungi Risorsa';
    resourceCancelBtn.style.display = 'none';
}

function editResource(id) {
    const resource = resources.find(r => r.id === id);
    if (resource) {
        resourceForm.resourceId.value = resource.id;
        resourceForm.resourceName.value = resource.name;
        resourceForm.monthlyPay.value = resource.monthlyPay;
        resourceForm.workingDays.value = resource.workingDays;
        resourceForm.hoursPerDay.value = resource.hoursPerDay;
        resourceForm.hourlyRate.value = resource.cost;
        resourceSubmitBtn.textContent = 'Modifica Risorsa';
        resourceCancelBtn.style.display = 'inline-block';
    }
}

function deleteResource(id) {
    const relatedProjects = projects.filter(p => p.resourceId === id);
    if (relatedProjects.length > 0) {
        alert('Non puoi eliminare questa risorsa perché è utilizzata in uno o più progetti.');
        return;
    }
    
    if (confirm('Sei sicuro di voler eliminare questa risorsa?')) {
        resources = resources.filter(r => r.id !== id);
        saveToLocalStorage();
    }
}

// Gestione Progetti
const projectForm = document.getElementById('projectForm');
const projectSubmitBtn = document.getElementById('projectSubmitBtn');
const projectCancelBtn = document.getElementById('projectCancelBtn');

projectForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const projectId = this.projectId.value;
    const name = this.projectName.value;
    const resourceId = parseInt(this.projectResource.value);
    const time = parseFloat(this.projectTime.value);
    
    const markups = {
        markup1: this.markup1.checked,
        markup2: this.markup2.checked,
        markup3: this.markup3.checked,
        markup4: this.markup4.checked,
        markup5: this.markup5.checked
    };

    const resource = resources.find(r => r.id === resourceId);
    const baseCost = resource.cost * time;
    const budget = calculateMarkup(baseCost, markups);

    const project = {
        id: projectId ? parseInt(projectId) : Date.now(),
        name,
        resourceId,
        time,
        budget,
        markups,
        hourlyRate: budget / time
    };

    if (projectId) {
        projects = projects.map(p => p.id === project.id ? project : p);
    } else {
        projects.push(project);
    }

    saveToLocalStorage();
    resetProjectForm();
});

projectCancelBtn.addEventListener('click', resetProjectForm);

function resetProjectForm() {
    projectForm.reset();
    projectForm.projectId.value = '';
    projectSubmitBtn.textContent = 'Aggiungi Progetto';
    projectCancelBtn.style.display = 'none';
    projectForm.markup1.checked = true;
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (project) {
        projectForm.projectId.value = project.id;
        projectForm.projectName.value = project.name;
        projectForm.projectResource.value = project.resourceId;
        projectForm.projectTime.value = project.time;
        projectForm.markup1.checked = project.markups.markup1;
        projectForm.markup2.checked = project.markups.markup2;
        projectForm.markup3.checked = project.markups.markup3;
        projectForm.markup4.checked = project.markups.markup4;
        projectForm.markup5.checked = project.markups.markup5;
        projectSubmitBtn.textContent = 'Modifica Progetto';
        projectCancelBtn.style.display = 'inline-block';
    }
}

function deleteProject(id) {
    if (confirm('Sei sicuro di voler eliminare questo progetto? Tutte le attività associate verranno eliminate.')) {
        projects = projects.filter(p => p.id !== id);
        // Rimuovi anche le attività associate
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        const updatedActivities = activities.filter(a => a.projectId !== id);
        localStorage.setItem('activities', JSON.stringify(updatedActivities));
        saveToLocalStorage();
    }
}

// Aggiornamento UI
function updateUI() {
    // Aggiorna tabella risorse
    const resourceTableBody = document.querySelector('#resourceTable tbody');
    resourceTableBody.innerHTML = resources.map(resource => `
        <tr>
            <td>${resource.name}</td>
            <td>${resource.monthlyPay.toFixed(2)} €</td>
            <td>${resource.workingDays}</td>
            <td>${resource.hoursPerDay}</td>
            <td>${resource.cost.toFixed(2)} €/h</td>
            <td>
                <button onclick="editResource(${resource.id})" class="btn btn-primary">Modifica</button>
                <button onclick="deleteResource(${resource.id})" class="btn btn-danger">Elimina</button>
            </td>
        </tr>
    `).join('');

    // Aggiorna tabella progetti
    const projectTableBody = document.querySelector('#projectTable tbody');
    projectTableBody.innerHTML = projects.map(project => {
        const resource = resources.find(r => r.id === project.resourceId);
        return `
            <tr>
                <td>${project.name}</td>
                <td>${resource ? resource.name : 'N/A'}</td>
                <td>${project.time} ore</td>
                <td>${project.budget.toFixed(2)} € (${project.hourlyRate.toFixed(2)} €/h)</td>
                <td>
                    <button onclick="editProject(${project.id})" class="btn btn-primary">Modifica</button>
                    <button onclick="deleteProject(${project.id})" class="btn btn-danger">Elimina</button>
                </td>
            </tr>
        `;
    }).join('');

    // Aggiorna select nei form
    const projectResourceSelect = document.querySelector('[name="projectResource"]');
    projectResourceSelect.innerHTML = resources.map(resource =>
        `<option value="${resource.id}">${resource.name}</option>`
    ).join('');
}

// Inizializzazione UI
updateUI();

// Esponi funzioni globali
window.editResource = editResource;
window.deleteResource = deleteResource;
window.editProject = editProject;
window.deleteProject = deleteProject;