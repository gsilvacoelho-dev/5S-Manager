// 5SManager Frontend Application

class App {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'welcome';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    bindEvents() {
        
        document.getElementById('login-btn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('get-started-btn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
       
        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('dashboard');
        });
        document.getElementById('nav-areas').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('areas');
        });
        document.getElementById('nav-cycles').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('cycles');
        });
        document.getElementById('nav-users').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('users');
        });
        document.getElementById('nav-evaluations').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('evaluations');
        });
        document.getElementById('nav-ranking').addEventListener('click', (e) => {
            e.preventDefault();
            this.showScreen('ranking');
        });

        // Form events
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('areaForm').addEventListener('submit', (e) => this.handleAreaForm(e));
        document.getElementById('evaluationForm').addEventListener('submit', (e) => this.handleEvaluationForm(e));
        
        // Button events
        document.getElementById('draw-areas-btn').addEventListener('click', () => this.drawAreas());
        
        // Modal events - Limpar formulário ao abrir modal de nova área
        const areaModal = document.getElementById('areaModal');
        areaModal.addEventListener('show.bs.modal', (event) => {
            // Verificar se o modal foi aberto pelo botão "Nova Área" (não pelo editArea)
            const button = event.relatedTarget;
            if (button && button.getAttribute('data-bs-target') === '#areaModal') {
                // Limpar o formulário para novo cadastro
                document.getElementById('areaForm').reset();
                document.getElementById('area-id').value = '';
                document.getElementById('area-modal-title').textContent = 'Nova Área';
                document.getElementById('area-error').style.display = 'none';
            }
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check-auth');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                this.updateUI();
                this.showScreen('dashboard');
            } else {
                this.showScreen('welcome');
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            this.showScreen('welcome');
        }
    }

    showLoginModal() {
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                this.updateUI();
                this.showScreen('dashboard');
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                this.showAlert('Login realizado com sucesso!', 'success');
            } else {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro no login:', error);
            errorDiv.textContent = 'Erro interno do servidor';
            errorDiv.style.display = 'block';
        }
    }

async logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });

        // Zerar estado do usuário
        this.currentUser = null;

        // Resetar navegação ativa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Esconder TODAS as telas
        const screens = [
            'welcome-screen',
            'dashboard-screen',
            'areas-screen',
            'cycles-screen',
            'users-screen',
            'evaluations-screen',
            'ranking-screen'
        ];
        screens.forEach(screen => {
            document.getElementById(screen).style.display = 'none';
        });

        // Atualizar interface
        this.updateUI();

        // Mostrar tela inicial
        document.getElementById('welcome-screen').style.display = 'block';
        this.currentScreen = 'welcome';

        this.showAlert('Logout realizado com sucesso!', 'info');
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}


    updateUI() {
        const loginSection = document.getElementById('login-section');
        const userMenu = document.getElementById('user-menu');
        const usernameDisplay = document.getElementById('username-display');
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const auditorOnlyElements = document.querySelectorAll('.auditor-only');

        if (this.currentUser) {
            loginSection.style.display = 'none';
            userMenu.style.display = 'block';
            usernameDisplay.textContent = this.currentUser.username;

            // Show/hide menu items based on user type
            if (this.currentUser.user_type === 'admin') {
                adminOnlyElements.forEach(el => el.style.display = 'block');
                auditorOnlyElements.forEach(el => el.style.display = 'none');
                document.getElementById('nav-dashboard').parentElement.style.display = 'block';
                document.getElementById('nav-ranking').parentElement.style.display = 'block';
            } else {
                adminOnlyElements.forEach(el => el.style.display = 'none');
                auditorOnlyElements.forEach(el => el.style.display = 'block');
                document.getElementById('nav-dashboard').parentElement.style.display = 'block';
                document.getElementById('nav-ranking').parentElement.style.display = 'block';
            }
        } else {
            loginSection.style.display = 'block';
            userMenu.style.display = 'none';

            adminOnlyElements.forEach(el => el.style.display = 'none');
            auditorOnlyElements.forEach(el => el.style.display = 'none');

            document.querySelectorAll('.nav-item').forEach(item => {
                item.style.display = 'none';
            });
        }
    }

    showScreen(screenName) {
        // Hide all screens
        const screens = ['welcome-screen', 'dashboard-screen', 'areas-screen', 'cycles-screen', 'users-screen', 'evaluations-screen', 'ranking-screen'];
        screens.forEach(screen => {
            document.getElementById(screen).style.display = 'none';
        });

        // Show selected screen
        document.getElementById(screenName + '-screen').style.display = 'block';
        this.currentScreen = screenName;

        // Load screen data
        switch (screenName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'areas':
                this.loadAreas();
                break;
            case 'cycles':
                this.loadCycles();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'evaluations':
                this.loadEvaluations();
                break;
            case 'ranking':
                this.loadRanking();
                break;
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeNav = document.getElementById('nav-' + screenName);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }

    async loadDashboard() {
        try {
            // Load dashboard cards
            const cardsContainer = document.getElementById('dashboard-cards');
            
            if (this.currentUser.user_type === 'admin') {
                // Admin dashboard
                const [areasResponse, cycleResponse] = await Promise.all([
                    fetch('/api/areas/'),
                    fetch('/api/cycles/active')
                ]);

                const areas = await areasResponse.json();
                const cycleData = cycleResponse.ok ? await cycleResponse.json() : null;

                cardsContainer.innerHTML = `
                    <div class="col-md-3">
                        <div class="card dashboard-card">
                            <div class="card-body text-center">
                                <i class="bi bi-building display-6 text-primary mb-2"></i>
                                <h3 class="fw-bold">${areas.length}</h3>
                                <p class="text-muted mb-0">Áreas Cadastradas</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card dashboard-card ${cycleData ? 'success' : 'warning'}">
                            <div class="card-body text-center">
                                <i class="bi bi-calendar display-6 ${cycleData ? 'text-success' : 'text-warning'} mb-2"></i>
                                <h3 class="fw-bold">${cycleData ? '1' : '0'}</h3>
                                <p class="text-muted mb-0">Ciclo Ativo</p>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Auditor dashboard
                const assignmentsResponse = await fetch('/api/evaluations/my-assignments');
                const assignments = await assignmentsResponse.json();

                cardsContainer.innerHTML = `
                    <div class="col-md-4">
                        <div class="card dashboard-card info">
                            <div class="card-body text-center">
                                <i class="bi bi-clipboard-data display-6 text-info mb-2"></i>
                                <h3 class="fw-bold">${assignments.total_assignments || 0}</h3>
                                <p class="text-muted mb-0">Áreas Atribuídas</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card dashboard-card success">
                            <div class="card-body text-center">
                                <i class="bi bi-check-circle display-6 text-success mb-2"></i>
                                <h3 class="fw-bold">${assignments.completed_evaluations || 0}</h3>
                                <p class="text-muted mb-0">Avaliações Concluídas</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card dashboard-card warning">
                            <div class="card-body text-center">
                                <i class="bi bi-clock display-6 text-warning mb-2"></i>
                                <h3 class="fw-bold">${(assignments.total_assignments || 0) - (assignments.completed_evaluations || 0)}</h3>
                                <p class="text-muted mb-0">Pendentes</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            
            this.loadCurrentCycleInfo();
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    async loadCurrentCycleInfo() {
        try {
            const response = await fetch('/api/cycles/active');
            const cycleInfo = document.getElementById('current-cycle-info');
            
            if (response.ok) {
                const cycle = await response.json();
                cycleInfo.innerHTML = `
                    <h6 class="fw-bold text-success">${cycle.name}</h6>
                    <p class="text-muted mb-2">
                        <i class="bi bi-calendar-event me-1"></i>
                        ${new Date(cycle.start_date).toLocaleDateString('pt-BR')} - 
                        ${new Date(cycle.end_date).toLocaleDateString('pt-BR')}
                    </p>
                    <div class="d-flex align-items-center">
                        <span class="status-indicator status-completed"></span>
                        <small>Ciclo Ativo</small>
                    </div>
                `;
            } else {
                cycleInfo.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="bi bi-calendar-x display-6 mb-2"></i>
                        <p>Nenhum ciclo ativo</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar informações do ciclo:', error);
        }
    }

    async loadAreas() {
        try {
            const response = await fetch('/api/areas/');
            const areas = await response.json();
            const tbody = document.querySelector('#areas-table tbody');
            
            tbody.innerHTML = areas.map(area => `
                <tr>
                    <td class="fw-bold">${area.name}</td>
                    <td>${area.description || '-'}</td>
                    <td>${new Date(area.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="app.editArea(${area.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteArea(${area.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            // Carregar resultado do sorteio
            await this.loadDrawResults();
        } catch (error) {
            console.error('Erro ao carregar áreas:', error);
        }
    }

    async handleAreaForm(e) {
        e.preventDefault();
        
        const id = document.getElementById('area-id').value;
        const name = document.getElementById('area-name').value;
        const description = document.getElementById('area-description').value;
        const errorDiv = document.getElementById('area-error');
        
        try {
            const url = id ? `/api/areas/${id}` : '/api/areas/';
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('areaModal')).hide();
                this.loadAreas();
                this.showAlert(data.message, 'success');
                document.getElementById('areaForm').reset();
            } else {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao salvar área:', error);
            errorDiv.textContent = 'Erro interno do servidor';
            errorDiv.style.display = 'block';
        }
    }

    editArea(id) {
        
        fetch(`/api/areas/${id}`)
            .then(response => response.json())
            .then(area => {
                document.getElementById('area-id').value = area.id;
                document.getElementById('area-name').value = area.name;
                document.getElementById('area-description').value = area.description || '';
                document.getElementById('area-modal-title').textContent = 'Editar Área';
                
                const modal = new bootstrap.Modal(document.getElementById('areaModal'));
                modal.show();
            })
            .catch(error => console.error('Erro ao carregar área:', error));
    }

    async deleteArea(id) {
        const confirmed = window.confirm('Tem certeza que deseja excluir esta área?');
        if (confirmed) {
            try {
                const response = await fetch(`/api/areas/${id}`, { method: 'DELETE' });
                const data = await response.json();
                
                if (response.ok) {
                    this.loadAreas();
                    this.showAlert(data.message, 'success');
                } else {
                    this.showAlert(data.error, 'danger');
                }
            } catch (error) {
                console.error('Erro ao excluir área:', error);
                this.showAlert('Erro interno do servidor', 'danger');
            }
        }
    }

    drawAreas() {
        this.showDrawAreasModal();
    }



    showDrawAreasModal() {
    const modalHtml = `
        <div class="modal fade" id="drawAreasModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="bi bi-shuffle me-2"></i>Confirmar Sorteio de Áreas
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            Tem certeza que deseja <strong>realizar o sorteio das áreas</strong>?
                        </p>

                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Esta ação <strong>não pode ser desfeita</strong> e irá:
                            <ul class="mb-0 mt-2">
                                <li>Distribuir automaticamente as áreas entre os auditores</li>
                                <li>Bloquear novos sorteios neste ciclo</li>
                            </ul>
                        </div>

                        <p class="text-muted mb-0">
                            Certifique-se de que todas as áreas e auditores já foram cadastrados.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button class="btn btn-warning" onclick="app.confirmDrawAreas()">
                            <i class="bi bi-check-circle me-1"></i>Sim, realizar sorteio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('drawAreasModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('drawAreasModal')).show();
}


async confirmDrawAreas() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('drawAreasModal'));
    if (modal) modal.hide();

    try {
        const response = await fetch('/api/areas/draw', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            this.showAlert(data.message, 'success');
            await this.loadDrawResults();
        } else {
            this.showAlert(data.error || 'Erro ao realizar sorteio', 'danger');
        }
    } catch (error) {
        console.error('Erro ao realizar sorteio:', error);
        this.showAlert('Erro interno do servidor', 'danger');
    }
}



    async loadDrawResults() {
        const container = document.getElementById('draw-results-container');
        if (!container) return;
        
        try {
            // Buscar ciclo ativo
            const cycleResponse = await fetch('/api/cycles/active');
            if (!cycleResponse.ok) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-info-circle fs-1 mb-3 d-block"></i>
                        <p class="mb-0">Nenhum ciclo ativo. Crie um ciclo para realizar sorteios.</p>
                    </div>
                `;
                return;
            }
            
            const cycle = await cycleResponse.json();
            
            // Buscar atribuições do ciclo ativo
            const assignmentsResponse = await fetch(`/api/areas/assignments/${cycle.id}`);
            const assignments = await assignmentsResponse.json();
            
            if (!assignments || assignments.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-shuffle fs-1 mb-3 d-block"></i>
                        <p class="mb-2">Nenhum sorteio feito até o momento.</p>
                        <small>Clique em 'Realizar Sorteio' para sortear os auditores.</small>
                    </div>
                `;
                return;
            }
            
            // Renderizar tabela com resultados
            const tableRows = assignments.map((assignment, index) => `
                <tr>
                    <td>
                        <span class="badge rounded-pill bg-secondary">${index + 1}</span>
                    </td>
                    <td class="fw-bold">${assignment.area_name}</td>
                    <td>
                        <span class="badge bg-primary">
                            <i class="bi bi-person-fill me-1"></i>${assignment.auditor_name}
                        </span>
                    </td>
                </tr>
            `).join('');
            
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>Área</th>
                                <th>Auditor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="mt-2 text-center text-muted">
                    <small>Total: ${assignments.length} atribuição${assignments.length !== 1 ? 'ões' : ''}</small>
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar resultado do sorteio:', error);
            container.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
                    <p class="mb-0">Erro ao carregar resultado do sorteio.</p>
                </div>
            `;
        }
    }

    async loadEvaluations() {
        try {
            const response = await fetch('/api/evaluations/my-assignments');
            const data = await response.json();
            const container = document.getElementById('assignments-container');
            
            if (data.assignments && data.assignments.length > 0) {
                container.innerHTML = data.assignments.map(assignment => `
                    <div class="card assignment-card ${assignment.is_evaluated ? 'evaluated' : ''} mb-3">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <h5 class="card-title mb-1">
                                        <i class="bi bi-building me-2"></i>
                                        ${assignment.area.name}
                                    </h5>
                                    <p class="text-muted mb-0">${assignment.area.description || 'Sem descrição'}</p>
                                </div>
                                <div class="col-md-3 text-center">
                                    ${assignment.is_evaluated ? 
                                        `<div class="score-display score-${this.getScoreClass(assignment.evaluation_score)}">
                                            ${assignment.evaluation_score.toFixed(1)}
                                        </div>
                                        <small class="text-muted">Avaliado em ${new Date(assignment.evaluation_date).toLocaleDateString('pt-BR')}</small>` :
                                        `<span class="badge bg-warning">Pendente</span>`
                                    }
                                </div>
                                <div class="col-md-3 text-end">
                                    ${assignment.is_evaluated ? 
                                        `<button class="btn btn-outline-info btn-sm me-2" onclick="app.viewEvaluation(${assignment.evaluation_id})">
                                            <i class="bi bi-eye me-1"></i>Ver Detalhes
                                        </button>` :
                                        `<button class="btn btn-primary btn-sm me-2" onclick="app.startEvaluation(${assignment.area.id}, '${assignment.area.name}')">
                                            <i class="bi bi-clipboard-data me-1"></i>Avaliar
                                        </button>`
                                    }

                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-clipboard-x display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">Nenhuma área atribuída</h4>
                        <p class="text-muted">Aguarde o administrador realizar o sorteio de áreas.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
        }
    }

    getScoreClass(score) {
        if (score >= 4.5) return 'excellent';
        if (score >= 3.5) return 'good';
        if (score >= 2.5) return 'regular';
        if (score >= 1.5) return 'poor';
        return 'bad';
    }

    getSensoBadgeStyle(score) {
    score = Number(score); // <<< ESSENCIAL

    if (score <= 2) {
        return 'background-color:#dc3545; color:#fff;';
    }
    if (score === 3) {
        return 'background-color:#ffc107; color:#000;';
    }
    if (score === 4) {
        return 'background-color:#198754; color:#fff;';
    }
    return 'background-color:#0d6efd; color:#fff;';
    }




    startEvaluation(areaId, areaName) {
        document.getElementById('eval-area-id').value = areaId;
        document.getElementById('eval-area-name').textContent = areaName;
        
        // Reset form
        document.getElementById('evaluationForm').reset();
        document.getElementById('evaluation-error').style.display = 'none';
        
        const modal = new bootstrap.Modal(document.getElementById('evaluationModal'));
        modal.show();
    }

    async handleEvaluationForm(e) {
        e.preventDefault();
        
        const formData = {
            area_id: parseInt(document.getElementById('eval-area-id').value),
            senso1_score: parseInt(document.getElementById('senso1-score').value),
            senso1_justification: document.getElementById('senso1-justification').value,
            senso2_score: parseInt(document.getElementById('senso2-score').value),
            senso2_justification: document.getElementById('senso2-justification').value,
            senso3_score: parseInt(document.getElementById('senso3-score').value),
            senso3_justification: document.getElementById('senso3-justification').value,
            senso4_score: parseInt(document.getElementById('senso4-score').value),
            senso4_justification: document.getElementById('senso4-justification').value,
            senso5_score: parseInt(document.getElementById('senso5-score').value),
            senso5_justification: document.getElementById('senso5-justification').value
        };
        
        const errorDiv = document.getElementById('evaluation-error');
        
        try {
            const response = await fetch('/api/evaluations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('evaluationModal')).hide();
                this.loadEvaluations();
                this.showAlert(data.message, 'success');
            } else {
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            errorDiv.textContent = 'Erro interno do servidor';
            errorDiv.style.display = 'block';
        }
    }

    async loadRanking() {
        try {
            // Buscar todos os ciclos ao invés de apenas o ativo
            const cyclesResponse = await fetch('/api/cycles/');
            const cycles = await cyclesResponse.json();
            
            if (!cycles || cycles.length === 0) {
                document.getElementById('ranking-content').innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-calendar-x display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">Nenhum ciclo encontrado</h4>
                        <p class="text-muted">Crie um ciclo para visualizar rankings.</p>
                    </div>
                `;
                return;
            }
            
            // Ordenar ciclos por data de início (mais recente primeiro)
            cycles.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
            
            // Usar o ciclo ativo ou o mais recente
            const activeCycle = cycles.find(c => c.is_active);
            const defaultCycle = activeCycle || cycles[0];
            
            // Buscar o ranking do ciclo padrão
            const rankingResponse = await fetch(`/api/cycles/${defaultCycle.id}/ranking`);
            const rankingData = await rankingResponse.json();
            
            const content = document.getElementById('ranking-content');
            
            if (rankingData.ranking && rankingData.ranking.length > 0) {
                content.innerHTML = `
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5><i class="bi bi-calendar me-2"></i>Ranking</h5>
                                <p class="text-muted mb-0">Total de avaliações: ${rankingData.ranking ? rankingData.ranking.length : 0}</p>
                            </div>
                            <div>
                                <label class="form-label mb-1">Selecionar Ciclo:</label>
                                <select class="form-select" id="cycle-selector" onchange="app.changeRankingCycle(this.value)">
                                    ${cycles.map(c => `
                                        <option value="${c.id}" ${c.id === defaultCycle.id ? 'selected' : ''}>
                                            ${c.name} ${c.is_active ? '(Ativo)' : c.is_completed ? '(Concluído)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        ${rankingData.ranking.map((item, index) => `
                            <div class="col-12 mb-3">
                                <div class="card ranking-item">
                                    <div class="card-body">
                                        <div class="row align-items-center">
                                            <div class="col-auto">
                                                <div class="ranking-position ${this.getRankingClass(item.position)}">
                                                    ${item.position}
                                                </div>
                                            </div>
                                            <div class="col">
                                                <h6 class="mb-1 fw-bold">${item.area_name}</h6>
                                                <small class="text-muted">Avaliado por: ${item.auditor_name}</small>
                                            </div>
                                            <div class="col-auto text-center">
                                                <div class="score-display score-${this.getScoreClass(item.total_score)}">
                                                    ${item.total_score.toFixed(1)}
                                                </div>
                                                <small class="text-muted">Pontuação</small>
                                            </div>

                                            ${this.currentUser && this.currentUser.user_type === 'admin'  ? `
                                            <div class="col-auto">
                                                <button class="btn btn-outline-info btn-sm" onclick="app.viewEvaluation(${item.evaluation_id})" title="Ver detalhes da avaliação">
                                                    <i class="bi bi-eye"></i> Ver Detalhes
                                                </button>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5><i class="bi bi-calendar me-2"></i>Ranking</h5>
                            </div>
                            <div>
                                <label class="form-label mb-1">Selecionar Ciclo:</label>
                                <select class="form-select" id="cycle-selector" onchange="app.changeRankingCycle(this.value)">
                                    ${cycles.map(c => `
                                        <option value="${c.id}" ${c.id === defaultCycle.id ? 'selected' : ''}>
                                            ${c.name} ${c.is_active ? '(Ativo)' : c.is_completed ? '(Concluído)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="text-center py-5">
                        <i class="bi bi-trophy display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">Nenhuma avaliação encontrada</h4>
                        <p class="text-muted">O ranking será exibido quando houver avaliações neste ciclo.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
        }
    }

    getRankingClass(position) {
        if (position === 1) return 'gold';
        if (position === 2) return 'silver';
        if (position === 3) return 'bronze';
        return 'other';
    }


async loadCycles() {
    try {
        const response = await fetch('/api/cycles/');
        const cycles = await response.json();
        
        const content = document.getElementById('cycles-content');
        
        if (cycles.length > 0) {
            content.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 class="mb-1">Ciclos Mensais</h5>
                        <p class="text-muted mb-0">Gerencie os ciclos de auditoria 5S</p>
                    </div>
                    <button class="btn btn-primary" onclick="app.showCreateCycleModal()">
                        <i class="bi bi-plus-circle me-2"></i>Novo Ciclo
                    </button>
                </div>
                
                <div class="row">
                    ${cycles.map(cycle => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card cycle-card ${cycle.is_active ? 'border-success' : ''}">
                                ${!cycle.is_active ? `
                                    <button class="btn btn-icon btn-delete-cycle"
                                            onclick="app.showDeleteCycleModal(${cycle.id}, '${cycle.name}')"
                                            title="Excluir Ciclo">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                ` : ''}
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h6 class="card-title mb-0">${cycle.name}</h6>
                                        <span class="badge ${cycle.is_active ? 'bg-success' : cycle.is_completed ? 'bg-secondary' : 'bg-warning'}">
                                            ${cycle.is_active ? 'Ativo' : cycle.is_completed ? 'Concluído' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p class="text-muted small mb-2">
                                        <i class="bi bi-calendar-event me-1"></i>
                                        ${new Date(cycle.start_date).toLocaleDateString('pt-BR')} - 
                                        ${new Date(cycle.end_date).toLocaleDateString('pt-BR')}
                                    </p>
                                    <div class="d-flex gap-2">
                                        ${cycle.is_active ? `
                                            <button class="btn btn-sm btn-outline-danger" onclick="app.completeCycle(${cycle.id})">
                                                <i class="bi bi-check-circle me-1"></i>Finalizar
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-outline-primary" onclick="app.viewCycleRanking(${cycle.id}, '${cycle.name}', ${cycle.is_completed})">
                                            <i class="bi bi-trophy me-1"></i>Ranking
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-calendar-x display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">Nenhum ciclo encontrado</h4>
                    <p class="text-muted mb-4">Crie o primeiro ciclo mensal para começar as auditorias.</p>
                    <button class="btn btn-primary" onclick="app.showCreateCycleModal()">
                        <i class="bi bi-plus-circle me-2"></i>Criar Primeiro Ciclo
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar ciclos:', error);
    }
}



showDeleteCycleModal(cycleId, cycleName) {
    const modalHtml = `
        <div class="modal fade" id="deleteCycleModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-exclamation-triangle me-2"></i>Excluir Ciclo
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>
                            Tem certeza que deseja excluir o ciclo
                            <strong>"${cycleName}"</strong>?
                        </p>

                        <div class="alert alert-danger">
                            <strong>Atenção:</strong><br>
                            Todas as avaliações e rankings associados a este ciclo
                            serão <strong>permanentemente apagados</strong>.
                        </div>

                        <p class="mb-0 text-muted">
                            Esta ação <strong>não pode ser desfeita</strong>.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger"
                                onclick="app.confirmDeleteCycle(${cycleId})">
                            <i class="bi bi-trash me-1"></i>Excluir Ciclo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('deleteCycleModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('deleteCycleModal'));
    modal.show();
}

async confirmDeleteCycle(cycleId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCycleModal'));
    if (modal) modal.hide();

    try {
        const response = await fetch(`/api/cycles/${cycleId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            this.showAlert(result.message, 'success');
            this.loadCycles();
            this.loadDashboard();
        } else {
            this.showAlert(result.error || 'Erro ao excluir ciclo', 'danger');
        }
    } catch (error) {
        console.error('Erro ao excluir ciclo:', error);
        this.showAlert('Erro interno do servidor ao tentar excluir o ciclo.', 'danger');
    }
}









    showCreateCycleModal() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        const modalHtml = `
            <div class="modal fade" id="createCycleModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-plus me-2"></i>Criar Novo Ciclo
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createCycleForm">
                                <div class="mb-3">
                                    <label class="form-label">Ano</label>
                                    <input type="number" class="form-control" id="cycleYear" value="${currentYear}" min="2020" max="2030" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Mês</label>
                                    <select class="form-select" id="cycleMonth" required>
                                        <option value="1" ${currentMonth === 1 ? 'selected' : ''}>Janeiro</option>
                                        <option value="2" ${currentMonth === 2 ? 'selected' : ''}>Fevereiro</option>
                                        <option value="3" ${currentMonth === 3 ? 'selected' : ''}>Março</option>
                                        <option value="4" ${currentMonth === 4 ? 'selected' : ''}>Abril</option>
                                        <option value="5" ${currentMonth === 5 ? 'selected' : ''}>Maio</option>
                                        <option value="6" ${currentMonth === 6 ? 'selected' : ''}>Junho</option>
                                        <option value="7" ${currentMonth === 7 ? 'selected' : ''}>Julho</option>
                                        <option value="8" ${currentMonth === 8 ? 'selected' : ''}>Agosto</option>
                                        <option value="9" ${currentMonth === 9 ? 'selected' : ''}>Setembro</option>
                                        <option value="10" ${currentMonth === 10 ? 'selected' : ''}>Outubro</option>
                                        <option value="11" ${currentMonth === 11 ? 'selected' : ''}>Novembro</option>
                                        <option value="12" ${currentMonth === 12 ? 'selected' : ''}>Dezembro</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="app.createCycle()">
                                <i class="bi bi-check-circle me-1"></i>Criar Ciclo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        

        const existingModal = document.getElementById('createCycleModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('createCycleModal'));
        modal.show();
    }

    async createCycle() {
        try {
            const year = document.getElementById('cycleYear').value;
            const month = document.getElementById('cycleMonth').value;
            
            const response = await fetch('/api/cycles/create-monthly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('createCycleModal')).hide();
                this.loadCycles();
                this.loadDashboard(); 
            } else {
                this.showAlert(result.error || 'Erro ao criar ciclo', 'danger');
            }
        } catch (error) {
            console.error('Erro ao criar ciclo:', error);
            this.showAlert('Erro interno do servidor', 'danger');
        }
    }

    async completeCycle(cycleId) {
        try {
            // Verificar quantas avaliações existem para este ciclo
            const evaluationsResponse = await fetch(`/api/cycles/${cycleId}/ranking`);
            const rankingData = await evaluationsResponse.json();
            
            const hasEvaluations = rankingData.ranking && rankingData.ranking.length > 0;
            const totalEvaluations = rankingData.total_evaluations || 0;
            
            // Mostrar modal de confirmação apropriado
            if (hasEvaluations) {
                // Modal padrão quando há avaliações
                const confirmed = window.confirm(`Tem certeza que deseja finalizar este ciclo?\n\nTotal de avaliações: ${totalEvaluations}\n\nEsta ação não pode ser desfeita.`);
                if (!confirmed) {
                    return;
                }
            } else {
                // Modal de aviso quando NÃO há avaliações
                this.showCompleteCycleWarningModal(cycleId);
                return;
            }
            
            // Prosseguir com a finalização
            await this.finalizeCycle(cycleId);
            
        } catch (error) {
            console.error('Erro ao verificar avaliações:', error);
            this.showAlert('Erro ao verificar avaliações do ciclo', 'danger');
        }
    }
    
    showCompleteCycleWarningModal(cycleId) {
        const modalHtml = `
            <div class="modal fade" id="completeCycleWarningModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle me-2"></i>Atenção: Nenhuma Avaliação Encontrada
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning mb-3">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>Este ciclo não possui nenhuma avaliação registrada.</strong>
                            </div>
                            <p class="mb-3">
                                Ao finalizar este ciclo sem avaliações:
                            </p>
                            <ul class="mb-3">
                                <li>Os auditores não poderão mais enviar avaliações</li>
                                <li>O ranking ficará vazio para este período</li>
                                <li>Esta ação <strong>não pode ser desfeita</strong></li>
                            </ul>
                            <p class="text-muted mb-0">
                                <i class="bi bi-question-circle me-1"></i>
                                Tem certeza que deseja finalizar este ciclo mesmo sem as auditorias terem sido concluídas?
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-1"></i>Cancelar
                            </button>
                            <button type="button" class="btn btn-warning" onclick="app.confirmCompleteCycle(${cycleId})">
                                <i class="bi bi-check-circle me-1"></i>Sim, Finalizar Mesmo Assim
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente se houver
        const existingModal = document.getElementById('completeCycleWarningModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('completeCycleWarningModal'));
        modal.show();
    }
    
    async confirmCompleteCycle(cycleId) {
        // Fechar o modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('completeCycleWarningModal'));
        if (modal) {
            modal.hide();
        }
        
        // Prosseguir com a finalização
        await this.finalizeCycle(cycleId);
    }
    
    async finalizeCycle(cycleId) {
        try {
            const response = await fetch(`/api/cycles/${cycleId}/complete`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                this.loadCycles();
                this.loadDashboard();
            } else {
                this.showAlert(result.error || 'Erro ao finalizar ciclo', 'danger');
            }
        } catch (error) {
            console.error('Erro ao finalizar ciclo:', error);
            this.showAlert('Erro interno do servidor', 'danger');
        }
    }

    async viewCycleRanking(cycleId) {
        try {
            const content = document.getElementById('ranking-content');
            
            // 1. Muda para a tela de ranking e exibe uma mensagem de "Carregando"
            this.showScreen('ranking');
            content.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <h4 class="text-muted mt-3">Carregando ranking...</h4>
                </div>
            `;

            // 2. Chama a rota UNIFICADA de ranking, que funciona para ciclos ativos e concluídos
            const response = await fetch(`/api/cycles/${cycleId}/ranking`);
            const result = await response.json();

            // 3. Se a resposta da API não for bem-sucedida, lança um erro
            if (!response.ok) {
                throw new Error(result.error || 'Não foi possível carregar o ranking.');
            }

            // 4. Define se o ranking é histórico para exibir uma tag informativa
            const isHistorical = result.is_historical || false;
            
            // 5. Monta o HTML do cabeçalho da página de ranking
            let rankingHtml = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 class="mb-1">Ranking - ${result.cycle.name}</h5>
                        <p class="text-muted mb-0">
                            ${isHistorical ? '<span class="badge bg-info ms-2">Histórico Salvo</span>' : '<span class="badge bg-success ms-2">Atual</span>'}
                        </p>
                    </div>
                    <button class="btn btn-outline-secondary" onclick="app.showScreen('cycles')">
                        <i class="bi bi-arrow-left me-1"></i>Voltar aos Ciclos
                    </button>
                </div>
            `;
            
            // 6. Verifica se há dados de ranking para exibir
            if (result.ranking && result.ranking.length > 0) {
                rankingHtml += `<div class="row">
                    ${result.ranking.map(item => `
                        <div class="col-12 mb-3">
                            <div class="card ranking-item">
                                <div class="card-body">
                                    <div class="row align-items-center">
                                        <div class="col-auto">
                                            <div class="ranking-position ${this.getRankingClass(item.position)}">
                                                ${item.position}
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h6 class="mb-1 fw-bold">${item.area_name}</h6>
                                            <small class="text-muted">Avaliado por: ${item.auditor_name}</small>
                                        </div>
                                        <div class="col-auto text-center">
                                            <div class="score-display score-${this.getScoreClass(item.total_score)}">
                                                ${item.total_score.toFixed(1)}
                                            </div>
                                            <small class="text-muted">Pontuação</small>
                                        </div>

                                        ${this.currentUser && this.currentUser.user_type === 'admin' && item.evaluation_id ? `
                                        <div class="col-auto">
                                            <button class="btn btn-outline-info btn-sm" onclick="app.viewEvaluation(${item.evaluation_id})" title="Ver detalhes da avaliação">
                                                <i class="bi bi-eye"></i> Detalhes
                                            </button>
                                        </div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
            } else {
                // 7. Se não houver ranking, exibe a mensagem retornada pela API
                rankingHtml += `
                    <div class="text-center py-5">
                        <i class="bi bi-trophy display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">${result.message || 'Nenhuma avaliação encontrada'}</h4>
                        <p class="text-muted">Este ciclo ainda não possui avaliações para exibir no ranking.</p>
                    </div>
                `;
            }
            
            // 8. Insere o HTML final na página
            content.innerHTML = rankingHtml;

        } catch (error) {
            console.error('Erro ao carregar ranking do ciclo:', error);
            // 9. Em caso de erro, exibe uma mensagem clara na tela
            document.getElementById('ranking-content').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle-fill display-1 text-danger mb-3"></i>
                    <h4 class="text-danger">Erro ao Carregar Ranking</h4>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary" onclick="app.showScreen('cycles')">Voltar aos Ciclos</button>
                </div>
            `;
        }
    }
    
    async loadUsers() {
        try {
            const response = await fetch('/api/auth/users');
            const users = await response.json();
            
            const content = document.getElementById('users-content');
            
            if (users.length > 0) {
                content.innerHTML = `
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Nome de Usuário</th>
                                    <th>Email</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th>Data de Criação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(user => `
                                    <tr>
                                        <td>
                                            <i class="bi bi-person-circle me-2"></i>
                                            ${user.username}
                                        </td>
                                        <td>${user.email}</td>
                                        <td>
                                            <span class="badge ${user.user_type === 'admin' ? 'bg-danger' : 'bg-primary'}">
                                                ${user.user_type === 'admin' ? 'Administrador' : 'Auditor'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${user.is_active ? 'bg-success' : 'bg-secondary'}">
                                                ${user.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>${new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-warning me-1" onclick="app.toggleUserStatus(${user.id}, ${user.is_active})" title="${user.is_active ? 'Desativar' : 'Ativar'}">
                                                <i class="bi bi-${user.is_active ? 'pause' : 'play'}-circle"></i>
                                            </button>
                                            ${user.username !== 'admin' ? `
                                                <button class="btn btn-sm btn-outline-danger" onclick="app.deleteUser(${user.id})" title="Excluir">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-people display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">Nenhum usuário encontrado</h4>
                        <p class="text-muted mb-4">Cadastre o primeiro usuário para começar.</p>
                        <button class="btn btn-primary" onclick="app.showCreateUserModal()">
                            <i class="bi bi-person-plus me-2"></i>Cadastrar Primeiro Usuário
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    showCreateUserModal() {
        const modalHtml = `
            <div class="modal fade" id="createUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-person-plus me-2"></i>Cadastrar Novo Usuário
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createUserForm">
                                <div class="mb-3">
                                    <label class="form-label">Nome de Usuário</label>
                                    <input type="text" class="form-control" id="newUsername" required>
                                    <div class="form-text">Use apenas letras, números e pontos. Ex: joao.silva</div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="newEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Senha</label>
                                    <input type="password" class="form-control" id="newPassword" required>
                                    <div class="form-text">Mínimo 6 caracteres</div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Usuário</label>
                                    <select class="form-select" id="newUserType" required>
                                        <option value="">Selecione o tipo</option>
                                        <option value="auditor">Auditor</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div class="alert alert-danger" id="user-error" style="display: none;"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="app.createUser()">
                                <i class="bi bi-check-circle me-1"></i>Cadastrar Usuário
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        

        const existingModal = document.getElementById('createUserModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

    async createUser() {
        try {
            const username = document.getElementById('newUsername').value.trim();
            const email = document.getElementById('newEmail').value.trim();
            const password = document.getElementById('newPassword').value;
            const userType = document.getElementById('newUserType').value;
            const errorDiv = document.getElementById('user-error');
            
            // Validações
            if (!username || !email || !password || !userType) {
                errorDiv.textContent = 'Todos os campos são obrigatórios';
                errorDiv.style.display = 'block';
                return;
            }
            
            if (password.length < 6) {
                errorDiv.textContent = 'A senha deve ter pelo menos 6 caracteres';
                errorDiv.style.display = 'block';
                return;
            }
            
            if (!/^[a-zA-Z0-9._]+$/.test(username)) {
                errorDiv.textContent = 'Nome de usuário deve conter apenas letras, números, pontos e underscores';
                errorDiv.style.display = 'block';
                return;
            }
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    user_type: userType
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(`Usuário ${username} cadastrado com sucesso!`, 'success');
                bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
                this.loadUsers();
            } else {
                errorDiv.textContent = result.error || 'Erro ao cadastrar usuário';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            const errorDiv = document.getElementById('user-error');
            errorDiv.textContent = 'Erro interno do servidor';
            errorDiv.style.display = 'block';
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            const action = currentStatus ? 'desativar' : 'ativar';
            const confirmed = window.confirm(`Tem certeza que deseja ${action} este usuário?`);
            if (!confirmed) {
                return;
            }
            
            const response = await fetch(`/api/auth/users/${userId}/toggle-status`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                this.loadUsers();
            } else {
                this.showAlert(result.error || 'Erro ao alterar status do usuário', 'danger');
            }
        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            this.showAlert('Erro interno do servidor', 'danger');
        }
    }

    async deleteUser(userId) {
        try {
            // Usar window.confirm para garantir compatibilidade
            const confirmed = window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.');
            if (!confirmed) {
                return;
            }
            
            const response = await fetch(`/api/auth/users/${userId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(result.message, 'success');
                this.loadUsers();
            } else {
                this.showAlert(result.error || 'Erro ao excluir usuário', 'danger');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showAlert('Erro interno do servidor', 'danger');
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    async viewEvaluation(evaluationId) {
        try {
            const response = await fetch(`/api/evaluations/${evaluationId}/details`);
            const data = await response.json();
            
            if (response.ok) {
                this.showEvaluationDetailsModal(data);
            } else {
                this.showAlert(data.error || 'Erro ao carregar detalhes da avaliação', 'danger');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes da avaliação:', error);
            this.showAlert('Erro interno do servidor', 'danger');
        }
    }

    showEvaluationDetailsModal(evaluation) {
        const modalHtml = `
            <div class="modal fade" id="evaluationDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-eye me-2"></i>Detalhes da Avaliação
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6><i class="bi bi-building me-2"></i>Área Avaliada</h6>
                                    <p class="mb-1"><strong>${evaluation.area_name}</strong></p>
                                    <p class="text-muted small">${evaluation.area_description || 'Sem descrição'}</p>
                                </div>
                                <div class="col-md-3">
                                    <h6><i class="bi bi-person me-2"></i>Auditor</h6>
                                    <p class="mb-0">${evaluation.auditor_name}</p>
                                </div>
                                <div class="col-md-3">
                                    <h6><i class="bi bi-calendar me-2"></i>Data</h6>
                                    <p class="mb-0">${new Date(evaluation.evaluation_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-12 text-center">
                                    <div class="score-display score-${this.getScoreClass(evaluation.total_score)} mb-2" style="font-size: 2rem;">
                                        ${evaluation.total_score.toFixed(1)}
                                    </div>
                                    <h6 class="text-muted">Pontuação Total</h6>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-12">
                                    <h6 class="mb-3"><i class="bi bi-list-check me-2"></i>Avaliação por Senso</h6>
                                    
                                    <div class="accordion" id="sensosAccordion">
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#senso1">
                                                    <div class="d-flex align-items-center w-100">
                                                        <span class="me-3">1º Senso - Seiri (Utilização)</span>
                                                        <span class="badge ms-auto me-3" style="${this.getSensoBadgeStyle(evaluation.senso1_score)}">${evaluation.senso5_score}/5</span>
                                                    </div>
                                                </button>
                                            </h2>
                                            <div id="senso1" class="accordion-collapse collapse show" data-bs-parent="#sensosAccordion">
                                                <div class="accordion-body">
                                                    <strong>Justificativa:</strong>
                                                    <p class="mb-0 mt-2">${evaluation.senso1_justification}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#senso2">
                                                    <div class="d-flex align-items-center w-100">
                                                        <span class="me-3">2º Senso - Seiton (Organização)</span>
                                                        <span class="badge ms-auto me-3" style="${this.getSensoBadgeStyle(evaluation.senso2_score)}">${evaluation.senso2_score}/5</span>
                                                    </div>
                                                </button>
                                            </h2>
                                            <div id="senso2" class="accordion-collapse collapse" data-bs-parent="#sensosAccordion">
                                                <div class="accordion-body">
                                                    <strong>Justificativa:</strong>
                                                    <p class="mb-0 mt-2">${evaluation.senso2_justification}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#senso3">
                                                    <div class="d-flex align-items-center w-100">
                                                        <span class="me-3">3º Senso - Seiso (Limpeza)</span>
                                                        <span class="badge ms-auto me-3" style="${this.getSensoBadgeStyle(evaluation.senso3_score)}">${evaluation.senso3_score}/5</span>
                                                    </div>
                                                </button>
                                            </h2>
                                            <div id="senso3" class="accordion-collapse collapse" data-bs-parent="#sensosAccordion">
                                                <div class="accordion-body">
                                                    <strong>Justificativa:</strong>
                                                    <p class="mb-0 mt-2">${evaluation.senso3_justification}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#senso4">
                                                    <div class="d-flex align-items-center w-100">
                                                        <span class="me-3">4º Senso - Seiketsu (Padronização)</span>
                                                        <span class="badge ms-auto me-3" style="${this.getSensoBadgeStyle(evaluation.senso4_score)}">${evaluation.senso4_score}/5</span>
                                                    </div>
                                                </button>
                                            </h2>
                                            <div id="senso4" class="accordion-collapse collapse" data-bs-parent="#sensosAccordion">
                                                <div class="accordion-body">
                                                    <strong>Justificativa:</strong>
                                                    <p class="mb-0 mt-2">${evaluation.senso4_justification}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#senso5">
                                                    <div class="d-flex align-items-center w-100">
                                                        <span class="me-3">5º Senso - Shitsuke (Disciplina)</span>
                                                        <span class="badge ms-auto me-3" style="${this.getSensoBadgeStyle(evaluation.senso5_score)}">${evaluation.senso5_score}/5</span>

                                                    </div>
                                                </button>
                                            </h2>
                                            <div id="senso5" class="accordion-collapse collapse" data-bs-parent="#sensosAccordion">
                                                <div class="accordion-body">
                                                    <strong>Justificativa:</strong>
                                                    <p class="mb-0 mt-2">${evaluation.senso5_justification}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        

        const existingModal = document.getElementById('evaluationDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('evaluationDetailsModal'));
        modal.show();
    }

    async changeRankingCycle(cycleId) {
        try {
            const rankingResponse = await fetch(`/api/cycles/${cycleId}/ranking`);
            const rankingData = await rankingResponse.json();
            
            // Buscar todos os ciclos novamente para manter o dropdown atualizado
            const cyclesResponse = await fetch('/api/cycles/');
            const cycles = await cyclesResponse.json();
            cycles.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
            
            const selectedCycle = cycles.find(c => c.id == cycleId);
            
            const content = document.getElementById('ranking-content');
            
            if (rankingData.ranking && rankingData.ranking.length > 0) {
                content.innerHTML = `
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5><i class="bi bi-calendar me-2"></i>Ranking</h5>
                                <p class="text-muted mb-0">Total de avaliações: ${rankingData.ranking ? rankingData.ranking.length : 0}</p>
                            </div>
                            <div>
                                <label class="form-label mb-1">Selecionar Ciclo:</label>
                                <select class="form-select" id="cycle-selector" onchange="app.changeRankingCycle(this.value)">
                                    ${cycles.map(c => `
                                        <option value="${c.id}" ${c.id == cycleId ? 'selected' : ''}>
                                            ${c.name} ${c.is_active ? '(Ativo)' : c.is_completed ? '(Concluído)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        ${rankingData.ranking.map((item, index) => `
                            <div class="col-12 mb-3">
                                <div class="card ranking-item">
                                    <div class="card-body">
                                        <div class="row align-items-center">
                                            <div class="col-auto">
                                                <div class="ranking-position ${this.getRankingClass(item.position)}">
                                                    ${item.position}
                                                </div>
                                            </div>
                                            <div class="col">
                                                <h6 class="mb-1 fw-bold">${item.area_name}</h6>
                                                <small class="text-muted">Avaliado por: ${item.auditor_name}</small>
                                            </div>
                                            <div class="col-auto text-center">
                                                <div class="score-display score-${this.getScoreClass(item.total_score)}">
                                                    ${item.total_score.toFixed(1)}
                                                </div>
                                                <small class="text-muted">Pontuação</small>
                                            </div>

                                            ${this.currentUser && this.currentUser.user_type === 'admin'  ? `
                                            <div class="col-auto">
                                                <button class="btn btn-outline-info btn-sm" onclick="app.viewEvaluation(${item.evaluation_id})" title="Ver detalhes da avaliação">
                                                    <i class="bi bi-eye"></i> Ver Detalhes
                                                </button>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5><i class="bi bi-calendar me-2"></i>Ranking</h5>
                            </div>
                            <div>
                                <label class="form-label mb-1">Selecionar Ciclo:</label>
                                <select class="form-select" id="cycle-selector" onchange="app.changeRankingCycle(this.value)">
                                    ${cycles.map(c => `
                                        <option value="${c.id}" ${c.id == cycleId ? 'selected' : ''}>
                                            ${c.name} ${c.is_active ? '(Ativo)' : c.is_completed ? '(Concluído)' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="text-center py-5">
                        <i class="bi bi-trophy display-1 text-muted mb-3"></i>
                        <h4 class="text-muted">Nenhuma avaliação encontrada</h4>
                        <p class="text-muted">O ranking será exibido quando houver avaliações neste ciclo.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao mudar ciclo do ranking:', error);
            this.showAlert('Erro ao carregar ranking do ciclo selecionado', 'danger');
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

