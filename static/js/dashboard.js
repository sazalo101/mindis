// ===================================
// Mindi Dashboard - Main JavaScript
// ===================================

$(document).ready(function () {
    // State
    let selectedMood = null;
    let currentTab = 'overview';

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadDashboardData();
        updateCharCount();
    }

    // ===================================
    // Event Listeners
    // ===================================

    function setupEventListeners() {
        // Sidebar toggle
        $('#sidebar-toggle').on('click', toggleSidebar);

        // Tab navigation
        $('.nav-item').on('click', function () {
            const tab = $(this).data('tab');
            switchTab(tab);
        });

        // Logout
        $('#logout-btn').on('click', logout);

        // Mood tracking
        $('.mood-btn').on('click', function () {
            $('.mood-btn').removeClass('active');
            $(this).addClass('active');
            selectedMood = $(this).data('mood');
            $('#mood-details').slideDown(300);
        });

        $('#mood-intensity').on('input', function () {
            $('#intensity-value').text($(this).val());
        });

        $('#save-mood').on('click', saveMood);

        // Journal
        $('#journal-content').on('input', updateCharCount);
        $('#save-journal').on('click', saveJournalEntry);

        // Insights
        $('#generate-insights').on('click', generateInsights);
    }

    // ===================================
    // Sidebar & Navigation
    // ===================================

    function toggleSidebar() {
        $('#sidebar').toggleClass('collapsed');
    }

    function switchTab(tabName) {
        // Update active nav item
        $('.nav-item').removeClass('active');
        $(`.nav-item[data-tab="${tabName}"]`).addClass('active');

        // Show tab content
        $('.tab-content').removeClass('active');
        $(`#tab-${tabName}`).addClass('active');

        currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'analytics') {
            loadAnalytics();
        }
    }

    function logout() {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            success: function () {
                window.location.href = '/';
            },
            error: function () {
                alert('Logout failed. Please try again.');
            }
        });
    }

    // ===================================
    // Dashboard Data
    // ===================================

    function loadDashboardData() {
        $.ajax({
            url: '/api/dashboard',
            method: 'GET',
            success: function (response) {
                // Update overview stats
                $('#overview-moods').text(response.moods.length);
                $('#overview-entries').text(response.journal_entries.length);
                $('#overview-insights').text(response.insights.length);

                // Render components
                renderOverviewInsights(response.insights.slice(0, 2));
                renderOverviewChart(response.moods.slice(0, 10));
                renderJournalEntries(response.journal_entries);
                renderInsights(response.insights);
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    window.location.href = '/';
                }
                console.error('Error loading dashboard:', xhr);
            }
        });
    }

    // ===================================
    // Mood Tracking
    // ===================================

    function saveMood() {
        if (!selectedMood) {
            showNotification('Please select a mood first');
            return;
        }

        const intensity = parseInt($('#mood-intensity').val());
        const notes = $('#mood-notes').val().trim();

        toggleButtonLoading('#save-mood', true);

        $.ajax({
            url: '/api/mood',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                mood_type: selectedMood,
                intensity: intensity,
                notes: notes
            }),
            success: function (response) {
                if (response.success) {
                    // Show AI suggestion
                    if (response.suggestion) {
                        $('#suggestion-text').text(response.suggestion);
                        $('#ai-suggestion').slideDown(300);
                    }

                    // Reset form
                    $('.mood-btn').removeClass('active');
                    selectedMood = null;
                    $('#mood-intensity').val(5);
                    $('#intensity-value').text('5');
                    $('#mood-notes').val('');
                    $('#mood-details').slideUp(300);

                    // Reload data
                    setTimeout(() => {
                        loadDashboardData();
                        $('#ai-suggestion').slideUp(300);
                    }, 5000);

                    showNotification('Mood saved! 🎉');
                }
            },
            error: function (xhr) {
                showNotification('Failed to save mood');
                console.error('Error:', xhr);
            },
            complete: function () {
                toggleButtonLoading('#save-mood', false);
            }
        });
    }

    // ===================================
    // Journal
    // ===================================

    function updateCharCount() {
        const count = $('#journal-content').val().length;
        $('#char-count').text(count);
    }

    function saveJournalEntry() {
        const content = $('#journal-content').val().trim();

        if (!content) {
            showNotification('Please write something first');
            return;
        }

        toggleButtonLoading('#save-journal', true);

        $.ajax({
            url: '/api/journal',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                content: content,
                mood_tags: []
            }),
            success: function (response) {
                if (response.success) {
                    // Show AI response
                    if (response.ai_response) {
                        $('#response-text').text(response.ai_response);
                        $('#ai-response').slideDown(300);
                    }

                    // Clear journal
                    $('#journal-content').val('');
                    updateCharCount();

                    // Reload entries
                    setTimeout(() => {
                        loadDashboardData();
                        $('#ai-response').slideUp(300);
                    }, 5000);

                    showNotification('Journal entry saved! 📝');
                }
            },
            error: function (xhr) {
                showNotification('Failed to save entry');
                console.error('Error:', xhr);
            },
            complete: function () {
                toggleButtonLoading('#save-journal', false);
            }
        });
    }

    function renderJournalEntries(entries) {
        const container = $('#entries-list');

        if (entries.length === 0) {
            container.html('<p class="empty-state">No journal entries yet. Start writing!</p>');
            return;
        }

        let html = '';
        entries.forEach(entry => {
            const date = formatDate(entry.timestamp);
            const preview = entry.content.length > 200
                ? entry.content.substring(0, 200) + '...'
                : entry.content;

            html += `
                <div class="entry-card">
                    <div class="entry-date">${date}</div>
                    <div class="entry-content">${escapeHtml(preview)}</div>
                </div>
            `;
        });

        container.html(html);
    }

    // ===================================
    // Insights
    // ===================================

    function generateInsights() {
        toggleButtonLoading('#generate-insights', true);

        $.ajax({
            url: '/api/insights',
            method: 'POST',
            contentType: 'application/json',
            success: function (response) {
                if (response.success) {
                    loadDashboardData();
                    showNotification('New insight generated! ✨');
                }
            },
            error: function (xhr) {
                showNotification('Failed to generate insight');
                console.error('Error:', xhr);
            },
            complete: function () {
                toggleButtonLoading('#generate-insights', false);
            }
        });
    }

    function renderInsights(insights) {
        const container = $('#insights-container');

        if (insights.length === 0) {
            container.html('<p class="empty-state">Click "Generate New Insight" to receive personalized guidance.</p>');
            return;
        }

        let html = '';
        insights.forEach(insight => {
            const date = formatDate(insight.timestamp);

            html += `
                <div class="insight-card">
                    <div class="insight-header">
                        <span class="insight-icon">💡</span>
                        <span class="insight-date">${date}</span>
                    </div>
                    <div class="insight-text">${escapeHtml(insight.insight_text)}</div>
                </div>
            `;
        });

        container.html(html);
    }

    function renderOverviewInsights(insights) {
        const container = $('#overview-insights-list');

        if (insights.length === 0) {
            container.html('<p class="empty-state">No insights yet</p>');
            return;
        }

        let html = '';
        insights.forEach(insight => {
            const preview = insight.insight_text.length > 150
                ? insight.insight_text.substring(0, 150) + '...'
                : insight.insight_text;

            html += `
                <div class="insight-card">
                    <div class="insight-text">${escapeHtml(preview)}</div>
                </div>
            `;
        });

        container.html(html);
    }

    // ===================================
    // Analytics & Charts
    // ===================================

    function loadAnalytics() {
        $.ajax({
            url: '/api/mood',
            method: 'GET',
            data: { limit: 20 },
            success: function (response) {
                renderMoodChart(response.moods);
            }
        });

        $.ajax({
            url: '/api/mood/stats',
            method: 'GET',
            data: { days: 7 },
            success: function (response) {
                renderMoodStats(response.stats);
            }
        });
    }

    function renderOverviewChart(moods) {
        if (moods.length === 0) return;

        const ctx = document.getElementById('overview-chart');
        if (!ctx) return;

        const data = prepareMoodChartData(moods);

        if (window.overviewChart) {
            window.overviewChart.destroy();
        }

        window.overviewChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: getChartOptions()
        });
    }

    function renderMoodChart(moods) {
        if (moods.length === 0) return;

        const ctx = document.getElementById('mood-chart');
        if (!ctx) return;

        const data = prepareMoodChartData(moods);

        if (window.moodChart) {
            window.moodChart.destroy();
        }

        window.moodChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: getChartOptions()
        });
    }

    function prepareMoodChartData(moods) {
        const labels = [];
        const data = [];
        const colors = [];

        const recentMoods = moods.slice(0, 10).reverse();

        recentMoods.forEach(mood => {
            labels.push(formatShortDate(mood.timestamp));
            data.push(mood.intensity);
            colors.push(getMoodColor(mood.mood_type));
        });

        return {
            labels: labels,
            datasets: [{
                label: 'Mood Intensity',
                data: data,
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: colors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };
    }

    function getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(44, 62, 80, 0.9)',
                    padding: 12,
                    borderColor: '#FF6B6B',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { stepSize: 2 },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        };
    }

    function renderMoodStats(stats) {
        const container = $('#mood-stats');

        if (stats.length === 0) {
            container.html('<p class="empty-state">Start tracking moods to see statistics!</p>');
            return;
        }

        let html = '';
        stats.forEach(stat => {
            const emoji = getMoodEmoji(stat.mood_type);

            html += `
                <div class="mood-stat-card">
                    <div class="mood-stat-emoji">${emoji}</div>
                    <div class="mood-stat-label">${capitalizeFirst(stat.mood_type)}</div>
                    <div class="mood-stat-count">${stat.count}x</div>
                </div>
            `;
        });

        container.html(html);
    }

    // ===================================
    // Utility Functions
    // ===================================

    function toggleButtonLoading(selector, isLoading) {
        const btn = $(selector);
        if (isLoading) {
            btn.prop('disabled', true);
            btn.find('.btn-text').hide();
            btn.find('.btn-loader').show();
        } else {
            btn.prop('disabled', false);
            btn.find('.btn-text').show();
            btn.find('.btn-loader').hide();
        }
    }

    function showNotification(message) {
        console.log(`[NOTIFICATION] ${message}`);
        // You could implement a toast notification here
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const options = {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }

    function formatShortDate(timestamp) {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    }

    function getMoodColor(moodType) {
        const colors = {
            'happy': '#FFD93D',
            'calm': '#6BCB77',
            'energetic': '#FF6B6B',
            'sad': '#4D96A9',
            'anxious': '#FFB4A2',
            'angry': '#E85555',
            'tired': '#BDC3C7',
            'neutral': '#7F8C8D'
        };
        return colors[moodType] || '#7F8C8D';
    }

    function getMoodEmoji(moodType) {
        const emojis = {
            'happy': '😊',
            'calm': '😌',
            'energetic': '🤩',
            'sad': '😢',
            'anxious': '😰',
            'angry': '😠',
            'tired': '😴',
            'neutral': '😐'
        };
        return emojis[moodType] || '😐';
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Mobile sidebar handling
    if (window.innerWidth <= 768) {
        $('#sidebar-toggle').on('click', function () {
            $('#sidebar').toggleClass('mobile-open');
        });

        // Close sidebar when clicking nav items on mobile
        $('.nav-item').on('click', function () {
            if (window.innerWidth <= 768) {
                $('#sidebar').removeClass('mobile-open');
            }
        });
    }
});
