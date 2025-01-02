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
    if (markups.markup1) total *= 1.20;
    if (markups.markup2) total *= 1.05;
    if (markups.markup3) total *= 1.25;
    if (markups.markup4) total *= 1.25;
    if (markups.markup5) total *= 1.25;
    return total;
}

// Gestione Risorse
const resourceForm = document.getElementById('resourceForm');
const resourceSubmitBtn = document.getElementById('resourceSubmitBtn');
const resourceCancelBtn = document.getElementById('resourceCancelBtn');

['monthlyPay', 'workingDays', 'hoursPerDay'].forEach(field => {
    const input = resourceForm.querySelector(`[name="${field}"]`);
    input.addEventListener('input', () => {
        const monthlyPay = parseFloat(resourceForm.querySelector('[name="monthlyPay"]').value) || 0;
        const workingDays = parseFloat(resourceForm.querySelector('[name="workingDays"]').value) || 0;
        const hoursPerDay = parseFloat(resourceForm.querySelector('[name="hoursPerDay"]').value) || 0;
        
        if (monthlyPay && workingDays && hoursPerDay) {
            const hourlyRate = calculateHourlyRate(monthlyPay, workingDays, hoursPerDay);
            resourceForm.querySelector('[name="hourlyRate"]').value = hourlyRate.toFixed(2);
        }
    });
});

resourceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const resourceId = this.querySelector('[name="resourceId"]').value;
    const name = this.querySelector('[name="resourceName"]').value;
    const monthlyPay = parseFloat(this.querySelector('[name="monthlyPay"]').value);
    const workingDays = parseFloat(this.querySelector('[name="workingDays"]').value);
    const hoursPerDay = parseFloat(this.querySelector('[name="hoursPerDay"]').value);
    const cost = parseFloat(this.querySelector('[name="hourlyRate"]').value);

    const resource = {
        id: resourceId ? parseInt(resourceId) : Date.now(),
        name,
        monthlyPay,
        workingDays,
        hoursPerDay,
        cost
    };

    if (resourceId) {
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
    resourceForm.querySelector('[name="resourceId"]').value = '';
    resourceSubmitBtn.textContent = 'Aggiungi Risorsa';
    resourceCancelBtn.style.display = 'none';
}

function editResource(id) {
    const resource = resources.find(r => r.id === id);
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
    console.log('Form submitted');
    const formData = {
        resourceId: this.querySelector('[name="resourceId"]').value,
        name: this.querySelector('[name="resourceName"]').value,
        monthlyPay: this.querySelector('[name="monthlyPay"]').value,
        workingDays: this.querySelector('[name="workingDays"]').value,
        hoursPerDay: this.querySelector('[name="hoursPerDay"]').value,
        cost: this.querySelector('[name="hourlyRate"]').value
    };
    console.log('Form data:', formData);

    const projectId = this.querySelector('[name="projectId"]').value;
    const name = this.querySelector('[name="projectName"]').value;
    const resourceId = parseInt(this.querySelector('[name="projectResource"]').value);
    const time = parseFloat(this.querySelector('[name="projectTime"]').value);
    
    const markups = {
        markup1: this.querySelector('[name="markup1"]').checked,
        markup2: this.querySelector('[name="markup2"]').checked,
        markup3: this.querySelector('[name="markup3"]').checked,
        markup4: this.querySelector('[name="markup4"]').checked,
        markup5: this.querySelector('[name="markup5"]').checked
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
    projectForm.querySelector('[name="projectId"]').value = '';
    projectSubmitBtn.textContent = 'Aggiungi Progetto';
    projectCancelBtn.style.display = 'none';
    projectForm.querySelector('[name="markup1"]').checked = true;
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (project) {
        projectForm.querySelector('[name="projectId"]').value = project.id;
        projectForm.querySelector('[name="projectName"]').value = project.name;
        projectForm.querySelector('[name="projectResource"]').value = project.resourceId;
        projectForm.querySelector('[name="projectTime"]').value = project.time;
        projectForm.querySelector('[name="markup1"]').checked = project.markups.markup1;
        projectForm.querySelector('[name="markup2"]').checked = project.markups.markup2;
        projectForm.querySelector('[name="markup3"]').checked = project.markups.markup3;
        projectForm.querySelector('[name="markup4"]').checked = project.markups.markup4;
        projectForm.querySelector('[name="markup5"]').checked = project.markups.markup5;
        projectSubmitBtn.textContent = 'Modifica Progetto';
        projectCancelBtn.style.display = 'inline-block';
    }
}

function deleteProject(id) {
    if (confirm('Sei sicuro di voler eliminare questo progetto? Tutte le attività associate verranno eliminate.')) {
        projects = projects.filter(p => p.id !== id);
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        const updatedActivities = activities.filter(a => a.projectId !== id);
        localStorage.setItem('activities', JSON.stringify(updatedActivities));
        saveToLocalStorage();
    }
}

function updateUI() {
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

    const projectResourceSelect = document.querySelector('[name="projectResource"]');
    projectResourceSelect.innerHTML = resources.map(resource =>
        `<option value="${resource.id}">${resource.name}</option>`
    ).join('');
}

updateUI();

window.editResource = editResource;
window.deleteResource = deleteResource;
window.editProject = editProject;
window.deleteProject = deleteProject;