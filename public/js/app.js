// BossBot Web App JavaScript
let currentGuildId = null;
let refreshInterval = null;
let currentViewerIp = null;
let isBotOwner = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initializeApp();
    setupEventListeners();
    startStatusUpdates();
});

// Create snow particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (5 + Math.random() * 10) + 's';
        particle.style.width = (2 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        particle.style.opacity = 0.3 + Math.random() * 0.7;
        particlesContainer.appendChild(particle);
    }
}

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();

        if (data.authenticated && data.user) {
            showUserInfo(data.user);
        } else {
            showLoginButton();
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        showLoginButton();
    }
}

// Show user info
function showUserInfo(user) {
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('login-button').style.display = 'none';

    const avatar = document.getElementById('user-avatar');
    avatar.src = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;

    document.getElementById('user-name').textContent = user.username;
}

// Show login button
function showLoginButton() {
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-button').style.display = 'block';
}

// Logout function
function logout() {
    window.location.href = '/auth/logout';
}

// Initialize application
async function initializeApp() {
    try {
        // Check if user is authenticated first
        const userResponse = await fetch('/api/user');
        const userData = await userResponse.json();

        if (userData.authenticated) {
            isBotOwner = Boolean(userData.isBotOwner);
            toggleOwnerUi(isBotOwner);
            showUserInfo(userData.user);
            await loadGuilds();
            await updateDashboard();
        } else {
            showLoginButton();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showLoginButton();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });

    // Guild selector
    document.getElementById('guild-select').addEventListener('change', (e) => {
        currentGuildId = e.target.value;
        if (currentGuildId) {
            loadGuildData(currentGuildId);
        }
    });

    // Forms
    document.getElementById('bot-config-form').addEventListener('submit', handleBotConfig);
    document.getElementById('welcome-config-form').addEventListener('submit', handleWelcomeConfig);
    document.getElementById('ticket-config-form').addEventListener('submit', handleTicketConfig);
    document.getElementById('embed-form').addEventListener('submit', handleEmbedCreate);
    const ownerBlockForm = document.getElementById('owner-security-block-form');
    if (ownerBlockForm) {
        ownerBlockForm.addEventListener('submit', handleOwnerBlockCreate);
    }

    // Log filter
    document.getElementById('log-type-filter').addEventListener('change', refreshLogs);

    // Log search with debouncing
    let searchTimeout;
    const searchInputs = ['log-search-keyword', 'log-search-user', 'log-search-start-date', 'log-search-end-date'];
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(searchLogs, 300);
            });
        }
    });
}

// Show section
function showSection(sectionName) {
    if (sectionName === 'owner-security' && !isBotOwner) {
        showNotification('Owner access required.', 'error');
        return;
    }
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'bot-config': 'Bot Configuration',
        'welcome': 'Welcome System',
        'tickets': 'Ticket System',
        'embeds': 'Embed Creator',
        'logs': 'Server Logs',
        'servers': 'Server Management',
        'owner-security': 'Owner Security Console'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';

    // Load section-specific data
    if (currentGuildId) {
        loadSectionData(sectionName);
    }
}

// Load section-specific data
async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'welcome':
            await loadWelcomeConfig();
            break;
        case 'tickets':
            await loadTicketConfig();
            break;
        case 'logs':
            await refreshLogs();
            break;
        case 'owner-security':
            await loadOwnerSecurityOverview();
            break;
    }
}

function toggleOwnerUi(ownerEnabled) {
    const nav = document.getElementById('owner-security-nav');
    if (nav) {
        nav.style.display = ownerEnabled ? 'flex' : 'none';
    }
}

// Load guilds
async function loadGuilds() {
    try {
        const response = await fetch('/api/guilds');

        if (!response.ok) {
            if (response.status === 401) {
                console.log('User not authenticated, skipping guild load');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const guilds = await response.json();

        const select = document.getElementById('guild-select');
        select.innerHTML = '<option value="">Select a server...</option>';

        guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = guild.name;
            select.appendChild(option);
        });

        // Load servers list
        loadServersList(guilds);
    } catch (error) {
        console.error('Error loading guilds:', error);
    }
}

// Load servers list
function loadServersList(guilds) {
    const container = document.getElementById('servers-list');
    container.innerHTML = '';

    if (guilds.length === 0) {
        container.innerHTML = '<p class="no-data">No servers found</p>';
        return;
    }

    guilds.forEach(guild => {
        const item = document.createElement('div');
        item.className = 'server-item';
        item.innerHTML = `
            <div class="server-icon">
                ${guild.icon ? `<img src="${guild.icon}" alt="${guild.name}" style="width:100%;height:100%;border-radius:50%;">` : '<i class="fas fa-server"></i>'}
            </div>
            <div class="server-info">
                <h4>${guild.name}</h4>
                <p>${guild.memberCount} members</p>
            </div>
        `;
        item.addEventListener('click', () => {
            document.getElementById('guild-select').value = guild.id;
            currentGuildId = guild.id;
            loadGuildData(guild.id);
        });
        container.appendChild(item);
    });
}

// Load guild data
async function loadGuildData(guildId) {
    try {
        const response = await fetch(`/api/guild/${guildId}`);

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const guild = await response.json();

        // Update channel selects
        updateChannelSelects(guild.channels);

        showNotification(`Loaded data for ${guild.name}`, 'success');
    } catch (error) {
        console.error('Error loading guild data:', error);
        showNotification('Error loading guild data', 'error');
    }
}

// Update channel selects
function updateChannelSelects(channels) {
    const textChannels = channels.filter(ch => ch.type === 0); // GUILD_TEXT

    const selects = [
        'welcome-channel',
        'welcome-log-channel',
        'quit-log-channel',
        'ticket-log-channel',
        'embed-channel',
        'ticket-panel-channel'
    ];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select channel...</option>';
            textChannels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                select.appendChild(option);
            });
            select.value = currentValue;
        }
    });
}

// Update dashboard
async function updateDashboard() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        document.getElementById('stat-guilds').textContent = data.bot.guilds;
        document.getElementById('stat-users').textContent = data.bot.users;
        document.getElementById('stat-ping').textContent = `${data.bot.ping}ms`;
        document.getElementById('stat-uptime').textContent = formatUptime(data.bot.uptime);
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Start status updates
function startStatusUpdates() {
    updateDashboard();
    setInterval(updateDashboard, 30000); // Update every 30 seconds
}

// Handle bot config
async function handleBotConfig(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const config = {
        name: formData.get('name'),
        avatar: formData.get('avatar'),
        status: {
            activity: formData.get('status'),
            type: formData.get('statusType')
        }
    };

    try {
        const response = await fetch('/api/bot/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Bot configuration updated successfully', 'success');
        } else {
            showNotification(result.error || 'Error updating bot configuration', 'error');
        }
    } catch (error) {
        console.error('Error updating bot config:', error);
        showNotification('Error updating bot configuration', 'error');
    }
}

// Handle welcome config
async function handleWelcomeConfig(e) {
    e.preventDefault();

    if (!currentGuildId) {
        showNotification('Please select a server first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const config = {
        guildId: currentGuildId,
        welcomeChannel: formData.get('welcomeChannel'),
        welcomeLogChannel: formData.get('welcomeLogChannel'),
        quitLogChannel: formData.get('quitLogChannel'),
        welcomeImage: formData.get('welcomeImage'),
        welcomeMode: formData.get('welcomeMode'),
        welcomeText: formData.get('welcomeText'),
        textColor: formData.get('textColor'),
        textSize: formData.get('textSize'),
        avatarBorderColor: formData.get('avatarBorderColor'),
        avatarBorderWidth: formData.get('avatarBorderWidth'),
        showMemberCount: formData.get('showMemberCount') ? 1 : 0
    };

    try {
        const response = await fetch('/api/welcome/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Welcome configuration updated successfully', 'success');
        } else {
            showNotification(result.error || 'Error updating welcome configuration', 'error');
        }
    } catch (error) {
        console.error('Error updating welcome config:', error);
        showNotification('Error updating welcome configuration', 'error');
    }
}

// Load welcome config
async function loadWelcomeConfig() {
    if (!currentGuildId) return;

    try {
        const response = await fetch(`/api/welcome/config/${currentGuildId}`);

        if (!response.ok) {
            if (response.status === 401) {
                console.log('User not authenticated, skipping welcome config load');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.configured) {
            document.getElementById('welcome-channel').value = data.welcome_channel || '';
            document.getElementById('welcome-log-channel').value = data.welcome_log_channel || '';
            document.getElementById('quit-log-channel').value = data.quit_log_channel || '';
            document.getElementById('welcome-image').value = data.welcome_image || '';
            document.getElementById('welcome-mode').value = data.welcome_mode || 'image';
            document.getElementById('welcome-text').value = data.welcome_text || '';
            document.getElementById('text-color').value = data.text_color || '#FFFFFF';
            document.getElementById('text-size').value = data.text_size || 40;
            document.getElementById('avatar-border-color').value = data.avatar_border_color || '#FFFFFF';
            document.getElementById('avatar-border-width').value = data.avatar_border_width || 5;
            document.getElementById('show-member-count').checked = data.show_member_count ? true : false;
        }
    } catch (error) {
        console.error('Error loading welcome config:', error);
    }
}

// Handle ticket config
async function handleTicketConfig(e) {
    e.preventDefault();

    if (!currentGuildId) {
        showNotification('Please select a server first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const options = [];
    const optionLabels = formData.getAll('option[]');
    const optionEmojis = formData.getAll('optionEmoji[]');

    for (let i = 0; i < optionLabels.length; i++) {
        if (optionLabels[i]) {
            options.push({
                label: optionLabels[i],
                emoji: optionEmojis[i] || '🎫'
            });
        }
    }

    const config = {
        guildId: currentGuildId,
        logChannel: formData.get('logChannel'),
        title: formData.get('title'),
        description: formData.get('description'),
        color: formData.get('color'),
        image: formData.get('image'),
        footer: formData.get('footer'),
        showTimestamp: formData.get('showTimestamp') ? 1 : 0,
        options: options
    };

    try {
        const response = await fetch('/api/ticket/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Ticket configuration updated successfully', 'success');
        } else {
            showNotification(result.error || 'Error updating ticket configuration', 'error');
        }
    } catch (error) {
        console.error('Error updating ticket config:', error);
        showNotification('Error updating ticket configuration', 'error');
    }
}

// Load ticket config
async function loadTicketConfig() {
    if (!currentGuildId) return;

    try {
        const response = await fetch(`/api/ticket/config/${currentGuildId}`);

        if (!response.ok) {
            if (response.status === 401) {
                console.log('User not authenticated, skipping ticket config load');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.configured) {
            document.getElementById('ticket-log-channel').value = data.log_channel || '';
            document.getElementById('ticket-title').value = data.title || '';
            document.getElementById('ticket-description').value = data.description || '';
            document.getElementById('ticket-color').value = data.embed_color || '#5865F2';
            document.getElementById('ticket-image').value = data.panel_image || '';
            document.getElementById('ticket-footer').value = data.footer_text || '';
            document.getElementById('ticket-timestamp').checked = data.show_timestamp ? true : false;

            // Load options
            const container = document.getElementById('ticket-options-container');
            container.innerHTML = '';

            if (data.options && data.options.length > 0) {
                data.options.forEach(option => {
                    addTicketOption(option.label, option.emoji);
                });
            } else {
                addTicketOption();
            }
        }
    } catch (error) {
        console.error('Error loading ticket config:', error);
    }
}

// Add ticket option
function addTicketOption(label = '', emoji = '🎫') {
    const container = document.getElementById('ticket-options-container');
    const option = document.createElement('div');
    option.className = 'ticket-option';
    option.innerHTML = `
        <input type="text" name="option[]" placeholder="Option label" value="${label}">
        <input type="text" name="optionEmoji[]" placeholder="Emoji (e.g., 🎫)" value="${emoji}">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeTicketOption(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(option);
}

// Remove ticket option
function removeTicketOption(button) {
    button.parentElement.remove();
}

// Create ticket panel
async function createTicketPanel() {
    if (!currentGuildId) {
        showNotification('Please select a server first', 'error');
        return;
    }

    const channelId = document.getElementById('ticket-panel-channel').value;

    if (!channelId) {
        showNotification('Please select a target channel', 'error');
        return;
    }

    try {
        const response = await fetch('/api/ticket/create-panel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guildId: currentGuildId,
                channelId: channelId
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Ticket panel created successfully!', 'success');
        } else {
            showNotification(result.error || 'Error creating ticket panel', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket panel:', error);
        showNotification('Error creating ticket panel', 'error');
    }
}

// Handle embed create
async function handleEmbedCreate(e) {
    e.preventDefault();

    if (!currentGuildId) {
        showNotification('Please select a server first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const embed = {
        title: formData.get('title'),
        description: formData.get('description'),
        color: parseInt(formData.get('color').replace('#', ''), 16),
        thumbnail: formData.get('thumbnail'),
        image: formData.get('image'),
        footer: formData.get('footer')
    };

    try {
        const response = await fetch('/api/embed/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guildId: currentGuildId,
                channelId: formData.get('channelId'),
                embed: embed
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showNotification('Please login first', 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification('Embed sent successfully', 'success');
            e.target.reset();
        } else {
            showNotification(result.error || 'Error sending embed', 'error');
        }
    } catch (error) {
        console.error('Error sending embed:', error);
        showNotification('Error sending embed', 'error');
    }
}

// Refresh logs
async function refreshLogs() {
    if (!currentGuildId) {
        document.getElementById('logs-container').innerHTML = '<p class="no-data">Select a server to view logs</p>';
        return;
    }

    const logType = document.getElementById('log-type-filter').value;

    try {
        const response = await fetch(`/api/logs/${currentGuildId}?type=${logType}&limit=100`);

        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('logs-container').innerHTML = '<p class="no-data">Please login to view logs</p>';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payload = await response.json();
        const logs = Array.isArray(payload) ? payload : (payload.logs || []);
        currentViewerIp = payload.viewerIp || null;
        displayLogs(logs);
    } catch (error) {
        console.error('Error loading logs:', error);
        showNotification('Error loading logs', 'error');
    }
}

// Search logs
async function searchLogs() {
    if (!currentGuildId) {
        document.getElementById('logs-container').innerHTML = '<p class="no-data">Select a server to view logs</p>';
        return;
    }

    const keyword = document.getElementById('log-search-keyword').value;
    const userId = document.getElementById('log-search-user').value;
    const logType = document.getElementById('log-type-filter').value;
    const startDate = document.getElementById('log-search-start-date').value;
    const endDate = document.getElementById('log-search-end-date').value;

    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (userId) params.append('userId', userId);
    if (logType) params.append('type', logType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('limit', '100');

    try {
        const response = await fetch(`/api/logs/${currentGuildId}/search?${params.toString()}`);

        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('logs-container').innerHTML = '<p class="no-data">Please login to view logs</p>';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payload = await response.json();
        const logs = Array.isArray(payload) ? payload : (payload.logs || []);
        currentViewerIp = payload.viewerIp || null;
        displayLogs(logs);
    } catch (error) {
        console.error('Error searching logs:', error);
        showNotification('Error searching logs', 'error');
    }
}

// Clear log search
function clearLogSearch() {
    document.getElementById('log-search-keyword').value = '';
    document.getElementById('log-search-user').value = '';
    document.getElementById('log-type-filter').value = '';
    document.getElementById('log-search-start-date').value = '';
    document.getElementById('log-search-end-date').value = '';
    refreshLogs();
}

async function loadOwnerSecurityOverview() {
    if (!isBotOwner) return;
    if (!currentGuildId) {
        document.getElementById('owner-security-blocks').innerHTML = '<p class="no-data">Select a server first</p>';
        document.getElementById('owner-security-audit').innerHTML = '<p class="no-data">Select a server first</p>';
        return;
    }

    try {
        const response = await fetch(`/api/security/${currentGuildId}/overview`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        const data = await response.json();
        document.getElementById('owner-viewer-ip').value = data.viewerIp || 'N/A';
        document.getElementById('owner-viewer-fingerprint').value = data.viewerFingerprint || 'N/A';
        renderOwnerBlocks(data.blocks || []);
        renderOwnerAudit(data.recentAudit || []);
    } catch (error) {
        console.error('Error loading owner security overview:', error);
        showNotification('Failed to load owner security data', 'error');
    }
}

function renderOwnerBlocks(blocks) {
    const container = document.getElementById('owner-security-blocks');
    if (!blocks.length) {
        container.innerHTML = '<p class="no-data">No active blocks</p>';
        return;
    }
    container.innerHTML = blocks.map(block => `
        <div class="log-entry">
            <div class="log-header">
                <span class="log-type">${escapeHtml(block.block_type)}</span>
                <span class="log-time">${formatDate(block.created_at)}</span>
            </div>
            <div class="log-content"><strong>Value:</strong> ${escapeHtml(block.block_value)}</div>
            <div class="log-details"><strong>Reason:</strong> ${escapeHtml(block.reason || 'No reason')}</div>
            <div class="log-details"><strong>Expires:</strong> ${escapeHtml(block.expires_at || 'Permanent')}</div>
            <button class="btn btn-danger btn-sm" onclick="removeOwnerBlock('${escapeHtml(block.id)}')">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `).join('');
}

function renderOwnerAudit(rows) {
    const container = document.getElementById('owner-security-audit');
    if (!rows.length) {
        container.innerHTML = '<p class="no-data">No security audit entries</p>';
        return;
    }
    container.innerHTML = rows.map(row => `
        <div class="log-entry">
            <div class="log-header">
                <span class="log-type">${escapeHtml(row.action)}</span>
                <span class="log-time">${formatDate(row.created_at)}</span>
            </div>
            <div class="log-content">${escapeHtml(row.username || 'unknown')} | ${escapeHtml(row.ip || 'N/A')} | ${escapeHtml(row.method || 'N/A')} ${escapeHtml(row.endpoint || '')}</div>
            <div class="log-details"><strong>Status:</strong> ${escapeHtml(row.status_code || 'N/A')} | <strong>Details:</strong> ${escapeHtml(row.details || 'N/A')}</div>
        </div>
    `).join('');
}

async function handleOwnerBlockCreate(e) {
    e.preventDefault();
    if (!isBotOwner) return;
    if (!currentGuildId) {
        showNotification('Select a server first', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const payload = {
        blockType: formData.get('blockType'),
        value: formData.get('value'),
        reason: formData.get('reason'),
        durationMinutes: formData.get('durationMinutes') || undefined
    };

    try {
        const response = await fetch(`/api/security/${currentGuildId}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || 'Failed to create block');
        showNotification('Security block created', 'success');
        e.target.reset();
        await loadOwnerSecurityOverview();
    } catch (error) {
        console.error('Error creating security block:', error);
        showNotification(error.message || 'Failed to create block', 'error');
    }
}

async function removeOwnerBlock(blockId) {
    if (!isBotOwner || !currentGuildId) return;
    try {
        const response = await fetch(`/api/security/${currentGuildId}/block/${blockId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || 'Failed to remove block');
        showNotification('Security block removed', 'success');
        await loadOwnerSecurityOverview();
    } catch (error) {
        console.error('Error removing security block:', error);
        showNotification(error.message || 'Failed to remove block', 'error');
    }
}

// Display logs
function displayLogs(logs) {
    const container = document.getElementById('logs-container');

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="no-data">No logs found</p>';
        return;
    }

    const ipBanner = currentViewerIp
        ? `<div class="log-entry"><div class="log-content"><strong>Viewer IP:</strong> ${escapeHtml(currentViewerIp)}</div></div>`
        : '';

    container.innerHTML = `${ipBanner}` + logs.map(log => `
        <div class="log-entry ${log.log_type}">
            <div class="log-header">
                <span class="log-type ${log.log_type}">${log.log_type}</span>
                <span class="log-time">${formatDate(log.created_at)}</span>
            </div>
            <div class="log-content">${log.message}</div>
            ${log.details ? `<div class="log-details">${escapeHtml(log.details)}</div>` : ''}
            ${log.user_tag ? `<div class="log-details">User: ${escapeHtml(log.user_tag)} (${escapeHtml(log.user_id || 'N/A')})</div>` : ''}
            ${log.moderator_tag ? `<div class="log-details">Executor: ${escapeHtml(log.moderator_tag)} (${escapeHtml(log.moderator_id || 'N/A')})</div>` : ''}
        </div>
    `).join('');
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
