document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-file');
    const fileNameDisplay = document.getElementById('file-name-display');
    const form = document.getElementById('report-form');

    const uploadPanel = document.getElementById('upload-panel');
    const loadingPanel = document.getElementById('loading-panel');
    const dashboardPanel = document.getElementById('dashboard-panel');
    const btnBack = document.getElementById('btn-back');
    const btnCopySlack = document.getElementById('btn-copy-slack');

    let currentData = null;

    // ── Drag & Drop ──
    dropZone.addEventListener('click', () => fileInput.click());
    ['dragenter','dragover','dragleave','drop'].forEach(e => {
        dropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false);
    });
    ['dragenter','dragover'].forEach(e => {
        dropZone.addEventListener(e, () => dropZone.classList.add('dragover'));
    });
    ['dragleave','drop'].forEach(e => {
        dropZone.addEventListener(e, () => dropZone.classList.remove('dragover'));
    });
    dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', function() { handleFiles(this.files); });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.csv')) {
                fileInput.files = files;
                const sizeKB = (file.size / 1024).toFixed(1);
                fileNameDisplay.innerHTML = `<i class='bx bx-check-circle'></i> ${file.name} (${sizeKB} KB)`;
            } else {
                showToast('Please select a valid CSV file.', 'error');
                fileNameDisplay.innerHTML = '';
                fileInput.value = '';
            }
        }
    }

    // ── Form Submit ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Please upload a CSV file first.', 'error');
            return;
        }

        const formData = new FormData(form);
        formData.append('file', fileInput.files[0]);

        uploadPanel.classList.add('hidden');
        loadingPanel.classList.remove('hidden');

        try {
            const response = await fetch('/api/generate', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Generation failed');

            currentData = result;
            renderDashboard(result);

            loadingPanel.classList.add('hidden');
            dashboardPanel.classList.remove('hidden');
            triggerStaggerAnimations();
            showToast('Report generated successfully!', 'success');
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message, 'error');
            loadingPanel.classList.add('hidden');
            uploadPanel.classList.remove('hidden');
        }
    });

    // Keyboard shortcut: Ctrl+Enter to submit
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && !uploadPanel.classList.contains('hidden')) {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });

    btnBack.addEventListener('click', () => {
        dashboardPanel.classList.add('hidden');
        uploadPanel.classList.remove('hidden');
        form.reset();
        fileNameDisplay.innerHTML = '';
        currentData = null;
    });

    // ── Render Dashboard ──
    function renderDashboard(data) {
        const ctx = data.context;
        const fmtMoney = v => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(v);
        const fmtNum = v => new Intl.NumberFormat('en-US').format(v);

        // Header
        document.getElementById('dash-week-label').textContent = ctx.week_label;

        // Download button
        const btnDownload = document.getElementById('btn-download');
        const downloadText = document.getElementById('download-text');
        
        if (data.report_filename) {
            console.log("Setting download link:", data.report_filename);
            btnDownload.href = `/api/download/${data.report_filename}`;
            btnDownload.setAttribute('download', data.report_filename);
            btnDownload.style.display = 'inline-flex';
            const isExcel = data.report_filename.endsWith('.xlsx');
            downloadText.textContent = isExcel ? 'DOWNLOAD .XLSX' : 'DOWNLOAD .DOCX';
        } else {
            btnDownload.style.display = 'none';
        }

        // Animated stat counters (Overall)
        animateCounter('val-revenue', ctx.totals_all.revenue, true);
        animateCounter('val-commission', ctx.totals_all.commission, true);
        animateCounter('val-conversions', ctx.totals_all.conversions, false);
        animateCounter('val-profit', ctx.totals_all.profit, true);

        // Animated stat counters (Without Top 1)
        document.getElementById('val-top1-name').textContent = data.top1_name || 'N/A';
        animateCounter('val-excl-revenue', ctx.totals_excl.revenue, true);
        animateCounter('val-excl-commission', ctx.totals_excl.commission, true);
        animateCounter('val-excl-conversions', ctx.totals_excl.conversions, false);
        animateCounter('val-excl-profit', ctx.totals_excl.profit, true);

        // Report footer
        document.getElementById('report-timestamp').textContent = `Generated: ${new Date().toLocaleString()}`;
        document.getElementById('report-source').textContent = `Source: ${ctx.csv_filename}`;
    }

    // ── Animated Counter ──
    function animateCounter(elementId, target, isCurrency) {
        const el = document.getElementById(elementId);
        const duration = 1200;
        const start = performance.now();
        const fmtMoney = v => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(v);
        const fmtNum = v => new Intl.NumberFormat('en-US').format(v);

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = target * eased;
            el.textContent = isCurrency ? fmtMoney(current) : fmtNum(Math.round(current));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ── Copy to Slack ──
    btnCopySlack.addEventListener('click', () => {
        if (!currentData) return;
        const ctx = currentData.context;
        const fmtM = v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const text = [
            `📊 *Weekly Affiliate Report — ${ctx.week_label}*`,
            ``,
            `📋 *Overall Totals*`,
            `💰 Revenue: ${fmtM(ctx.totals_all.revenue)}`,
            `📉 Commission: ${fmtM(ctx.totals_all.commission)}`,
            `🔄 Conversions: ${ctx.totals_all.conversions.toLocaleString()}`,
            `📈 Profit: ${fmtM(ctx.totals_all.profit)}`,
            ``,
            `📋 *Without Top 1 (${currentData.top1_name})*`,
            `💰 Revenue: ${fmtM(ctx.totals_excl.revenue)}`,
            `📉 Commission: ${fmtM(ctx.totals_excl.commission)}`,
            `🔄 Conversions: ${ctx.totals_excl.conversions.toLocaleString()}`,
            `📈 Profit: ${fmtM(ctx.totals_excl.profit)}`,
        ].filter(Boolean).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard — paste into Slack!', 'success');
        }).catch(() => {
            showToast('Copy failed. Try again.', 'error');
        });
    });

    // ── Stagger Animations ──
    function triggerStaggerAnimations() {
        const elements = dashboardPanel.querySelectorAll('.anim-stagger');
        elements.forEach((el, i) => {
            el.style.animationDelay = `${i * 0.08}s`;
            el.classList.add('visible');
        });
    }

    // ── Toast ──
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'bx-check-circle' : 'bx-error-circle';
        toast.innerHTML = `<i class='bx ${icon}'></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
});
