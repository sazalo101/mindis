// ===================================
// Mindi - Mental Health App
// Main JavaScript with jQuery
// ===================================

$(document).ready(function () {
    // State management
    let selectedMood = null;
    let conversationHistory = [];

    // Initialize app
    init();

    function init() {
        loadDashboardData();
        setupEventListeners();
        updateCharCount();
    }

    // ===================================
    // Event Listeners
    // ===================================

    function setupEventListeners() {
        // Mood selection
        $('.mood-btn').on('click', function () {
            $('.mood-btn').removeClass('active');
            $(this).addClass('active');
            selectedMood = $(this).data('mood');
            $('#mood-details').slideDown(300);
        });

        // Intensity slider
        $('#mood-intensity').on('input', function () {
            $('#intensity-value').text($(this).val());
        });

        // Save mood
        $('#save-mood').on('click', saveMood);

        // Journal character count
        $('#journal-content').on('input', updateCharCount);

        // Save journal entry
        $('#save-journal').on('click', saveJournalEntry);

        // Generate insights
        $('#generate-insights').on('click', generateInsights);
    }

    // ===================================
    // Mood Tracking
    // ===================================

    function saveMood() {
        if (!selectedMood) {
            showNotification('Please select a mood first', 'warning');
            return;
        }

        const intensity = parseInt($('#mood-intensity').val());
        const notes = $('#mood-notes').val().trim();

        // Show loading state
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

                    // Reload dashboard
                    setTimeout(() => {
                        loadDashboardData();
                        $('#ai-suggestion').slideUp(300);
                    }, 5000);

                    showNotification('Mood saved successfully! 🎉', 'success');
                }
            },
            error: function (xhr) {
                showNotification('Failed to save mood. Please try again.', 'error');
                console.error('Error saving mood:', xhr);
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
            showNotification('Please write something before saving', 'warning');
            return;
        }

        // Show loading state
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
                        loadJournalEntries();
                        $('#ai-response').slideUp(300);
                    }, 5000);

                    showNotification('Journal entry saved! 📝', 'success');
                }
            },
            error: function (xhr) {
                showNotification('Failed to save journal entry. Please try again.', 'error');
                console.error('Error saving journal:', xhr);
            },
            complete: function () {
                toggleButtonLoading('#save-journal', false);
            }
        });
    }

    function loadJournalEntries() {
        $.ajax({
            url: '/api/journal?limit=5',
            method: 'GET',
            success: function (response) {
                const entries = response.entries || [];
                renderJournalEntries(entries);
            },
            error: function (xhr) {
                console.error('Error loading journal entries:', xhr);
            }
        });
    }

    function renderJournalEntries(entries) {
        const container = $('#entries-list');

        if (entries.length === 0) {
            container.html('<p class="empty-state">No journal entries yet. Start writing to see them here!</p>');
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
                if (response.success && response.insight) {
                    loadInsights();
                    showNotification('New insight generated! ✨', 'success');
                }
            },
            error: function (xhr) {
                showNotification('Failed to generate insight. Please try again.', 'error');
                console.error('Error generating insight:', xhr);
            },
            complete: function () {
                toggleButtonLoading('#generate-insights', false);
            }
        });
    }

    function loadInsights() {
        $.ajax({
            url: '/api/insights?limit=5',
            method: 'GET',
            success: function (response) {
                const insights = response.insights || [];
                renderInsights(insights);
            },
            error: function (xhr) {
                console.error('Error loading insights:', xhr);
            }
        });
    }

    function renderInsights(insights) {
        const container = $('#insights-container');

        if (insights.length === 0) {
            container.html('<p class="empty-state">Click "Generate New Insight" to receive personalized guidance based on your mood and journal data.</p>');
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

    // ===================================
    // Dashboard & Charts
    // ===================================

    function loadDashboardData() {
        $.ajax({
            url: '/api/dashboard',
            method: 'GET',
            success: function (response) {
                // Update stats
                $('#total-moods').text(response.moods.length);
                $('#total-entries').text(response.journal_entries.length);
                $('#total-insights').text(response.insights.length);

                // Render components
                renderJournalEntries(response.journal_entries);
                renderInsights(response.insights);
                renderMoodChart(response.moods);
                renderMoodStats(response.stats);
            },
            error: function (xhr) {
                console.error('Error loading dashboard:', xhr);
            }
        });
    }

    function renderMoodChart(moods) {
        if (moods.length === 0) return;

        // Prepare data for chart
        const labels = [];
        const data = [];
        const colors = [];

        // Get last 10 moods in chronological order
        const recentMoods = moods.slice(0, 10).reverse();

        recentMoods.forEach(mood => {
            labels.push(formatShortDate(mood.timestamp));
            data.push(mood.intensity);
            colors.push(getMoodColor(mood.mood_type));
        });

        // Create chart
        const ctx = document.getElementById('mood-chart');

        // Destroy existing chart if it exists
        if (window.moodChart) {
            window.moodChart.destroy();
        }

        window.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
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
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        borderColor: '#FF6B6B',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    function renderMoodStats(stats) {
        const container = $('#mood-stats');

        if (stats.length === 0) {
            container.html('<p class="empty-state">Start tracking your moods to see statistics here!</p>');
            return;
        }

        let html = '';
        stats.forEach(stat => {
            const emoji = getMoodEmoji(stat.mood_type);
            const avgIntensity = Math.round(stat.avg_intensity * 10) / 10;

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

    function showNotification(message, type = 'info') {
        // Simple notification using alert for now
        // In production, you'd use a toast library
        console.log(`[${type.toUpperCase()}] ${message}`);

        // You could implement a custom toast notification here
        // For now, we'll just log it
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: 'long',
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
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${month}/${day} ${hours}:${minutes.toString().padStart(2, '0')}`;
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

    // ===================================
    // Smooth Scroll
    // ===================================

    $('a[href^="#"]').on('click', function (e) {
        e.preventDefault();
        const target = $(this.getAttribute('href'));
        if (target.length) {
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 100
            }, 800);
        }
    });

    // ===================================
    // Auto-refresh dashboard periodically
    // ===================================

    // Refresh dashboard every 5 minutes
    setInterval(function () {
        loadDashboardData();
    }, 300000);
});
