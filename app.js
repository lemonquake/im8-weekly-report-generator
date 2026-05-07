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
    const btnDownload = document.getElementById('btn-download');

    let currentReport = null;

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

    // ── Form Submit (Client-Side Logic) ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Please upload a CSV file first.', 'error');
            return;
        }

        const file = fileInput.files[0];
        const top1Input = document.getElementById('top1').value.trim();
        const format = document.getElementById('format').value;

        uploadPanel.classList.add('hidden');
        loadingPanel.classList.remove('hidden');

        try {
            // 1. Parse CSV
            const csvData = await parseCSV(file);
            
            // 2. Process Data
            const report = processReport(csvData, top1Input);
            report.format = format;
            report.csv_filename = file.name;
            currentReport = report;

            // 3. Render
            renderDashboard(report);

            loadingPanel.classList.add('hidden');
            dashboardPanel.classList.remove('hidden');
            triggerStaggerAnimations();
            showToast('Report generated successfully!', 'success');
        } catch (error) {
            console.error('Processing Error:', error);
            showToast(error.message, 'error');
            loadingPanel.classList.add('hidden');
            uploadPanel.classList.remove('hidden');
        }
    });

    // ── CSV Parsing ──
    function parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: results => resolve(results.data),
                error: err => reject(new Error('Failed to parse CSV: ' + err.message))
            });
        });
    }

    // ── Report Logic (Ported from Python) ──
    function processReport(data, top1NameInput) {
        if (!data || data.length === 0) throw new Error("CSV file is empty or could not be parsed.");

        // Normalize column keys: strip BOM, extra whitespace, and lowercase for matching
        data = data.map(row => {
            const cleaned = {};
            for (const key of Object.keys(row)) {
                const normalizedKey = key.replace(/^\uFEFF/, '').trim();
                cleaned[normalizedKey] = row[key];
            }
            return cleaned;
        });

        // Flexible column lookup: find the actual key that matches our expected name
        const sampleRow = data[0];
        const columnKeys = Object.keys(sampleRow);
        const findCol = (target) => {
            const lower = target.toLowerCase();
            return columnKeys.find(k => k.toLowerCase() === lower) || target;
        };

        const colFirstName = findCol('First Name');
        const colLastName = findCol('Last Name');
        const colDate = findCol('Conversion Date');
        const colRevenue = findCol('Revenue');
        const colCommission = findCol('Commission');

        // Robust date parser: handles "YYYY-MM-DD HH:MM:SS", ISO, and common variants
        function parseDate(val) {
            if (!val) return null;
            const s = String(val).trim();
            // Try ISO-ish with T separator first
            let d = new Date(s.replace(' ', 'T'));
            if (!isNaN(d)) return d;
            // Try native parse as fallback
            d = new Date(s);
            if (!isNaN(d)) return d;
            return null;
        }

        // Prepare names and dates
        data.forEach(row => {
            row.fullName = `${row[colFirstName] || ''} ${row[colLastName] || ''}`.trim();
            row.date = parseDate(row[colDate]);
        });

        // Filter to valid dated rows
        const validRows = data.filter(r => r.date !== null);

        if (validRows.length === 0) {
            const availableCols = columnKeys.join(', ');
            throw new Error(`No valid dates found. CSV columns detected: [${availableCols}]. Expected a "${colDate}" column with parseable dates.`);
        }

        // Date range
        const dates = validRows.map(r => r.date.getTime());
        const start = new Date(Math.min(...dates));
        const end = new Date(Math.max(...dates));

        // Final window (full days)
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        const filtered = validRows.filter(r => r.date >= start && r.date <= end);
        if (filtered.length === 0) throw new Error("No data found in the CSV after date filtering.");

        // Aggregate
        const aggMap = new Map();
        filtered.forEach(row => {
            const name = row.fullName;
            if (!aggMap.has(name)) {
                aggMap.set(name, { name, revenue: 0, commission: 0, conversions: 0 });
            }
            const item = aggMap.get(name);
            item.revenue += parseFloat(row[colRevenue]) || 0;
            item.commission += parseFloat(row[colCommission]) || 0;
            item.conversions += 1;
        });

        const aggList = Array.from(aggMap.values())
            .map(item => ({ ...item, profit: item.revenue - item.commission }))
            .sort((a, b) => b.revenue - a.revenue);

        // Determine Top 1
        let top1Name = top1NameInput;
        if (!top1Name) {
            const hasJames = aggList.find(a => a.name.toLowerCase().includes("james dinicolantonio"));
            top1Name = hasJames ? hasJames.name : (aggList[0]?.name || "N/A");
        } else {
            const exists = aggList.find(a => a.name.toLowerCase() === top1Name.toLowerCase());
            if (!exists) {
                const names = aggList.map(a => a.name).slice(0, 5).join(", ");
                throw new Error(`'${top1Name}' not found. Top affiliates: ${names}...`);
            }
            top1Name = exists.name;
        }

        const calculateTotals = (list) => ({
            revenue: list.reduce((s, i) => s + i.revenue, 0),
            commission: list.reduce((s, i) => s + i.commission, 0),
            conversions: list.reduce((s, i) => s + i.conversions, 0),
            profit: list.reduce((s, i) => s + i.profit, 0),
            active_affiliates: list.length
        });

        const totals_all = calculateTotals(aggList);
        const totals_excl = calculateTotals(aggList.filter(a => a.name !== top1Name));

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const weekLabel = `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;

        return {
            week_label: weekLabel,
            week_start: start.toISOString().split('T')[0],
            totals_all,
            totals_excl,
            top1_name: top1Name,
            aggList
        };
    }

    // ── Render Dashboard ──
    function renderDashboard(report) {
        const fmtMoney = v => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(v);
        const fmtNum = v => new Intl.NumberFormat('en-US').format(v);

        document.getElementById('dash-week-label').textContent = report.week_label;
        document.getElementById('download-text').textContent = report.format === 'excel' ? 'DOWNLOAD .XLSX' : 'DOWNLOAD .DOCX';
        document.getElementById('val-top1-name').textContent = report.top1_name;

        // Animated counters
        animateCounter('val-revenue', report.totals_all.revenue, true);
        animateCounter('val-commission', report.totals_all.commission, true);
        animateCounter('val-conversions', report.totals_all.conversions, false);
        animateCounter('val-profit', report.totals_all.profit, true);

        animateCounter('val-excl-revenue', report.totals_excl.revenue, true);
        animateCounter('val-excl-commission', report.totals_excl.commission, true);
        animateCounter('val-excl-conversions', report.totals_excl.conversions, false);
        animateCounter('val-excl-profit', report.totals_excl.profit, true);

        document.getElementById('report-timestamp').textContent = `Generated: ${new Date().toLocaleString()}`;
        document.getElementById('report-source').textContent = `Source: ${report.csv_filename}`;
    }

    // ── Download Handling ──
    btnDownload.addEventListener('click', async () => {
        if (!currentReport) return;
        
        try {
            if (currentReport.format === 'excel') {
                await generateExcel(currentReport);
            } else {
                await generateDocx(currentReport);
            }
            showToast('File generated and downloading!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Download failed: ' + err.message, 'error');
        }
    });

    // ── EXCEL GENERATION ──
    async function generateExcel(report) {
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Overall
        const s1 = workbook.addWorksheet('Overall Totals');
        s1.columns = [{ header: 'Metric', key: 'm', width: 20 }, { header: 'Value', key: 'v', width: 15 }];
        s1.addRows([
            ['Revenue', report.totals_all.revenue],
            ['Commission', report.totals_all.commission],
            ['Profit', report.totals_all.profit],
            ['Conversions', report.totals_all.conversions],
            ['Active Affiliates', report.totals_all.active_affiliates]
        ]);
        s1.getColumn(2).numFmt = '"$"#,##0.00;[Red]"$"#,##0.00';

        // Sheet 2: Excl Top 1
        const s2 = workbook.addWorksheet(`Without ${report.top1_name.substring(0, 20)}`);
        s2.columns = [{ header: 'Metric', key: 'm', width: 20 }, { header: 'Value', key: 'v', width: 15 }];
        s2.addRows([
            ['Revenue', report.totals_excl.revenue],
            ['Commission', report.totals_excl.commission],
            ['Profit', report.totals_excl.profit],
            ['Conversions', report.totals_excl.conversions],
            ['Active Affiliates', report.totals_excl.active_affiliates]
        ]);
        s2.getColumn(2).numFmt = '"$"#,##0.00;[Red]"$"#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Weekly_Report_${report.week_start}.xlsx`);
    }

    // ── DOCX GENERATION ──
    async function generateDocx(report) {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

        const fmtM = v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const fmtN = v => v.toLocaleString();

        const createMetricTable = (totals) => {
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    ["Revenue", fmtM(totals.revenue)],
                    ["Commission", fmtM(totals.commission)],
                    ["Profit", fmtM(totals.profit)],
                    ["Conversions", fmtN(totals.conversions)],
                    ["Active Affiliates", fmtN(totals.active_affiliates)]
                ].map(pair => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pair[0], bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ text: pair[1], alignment: AlignmentType.RIGHT })] })
                    ]
                }))
            });
        };

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: "Weekly Affiliate Report", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: report.week_label, italic: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "Overall Totals", heading: HeadingLevel.HEADING_1 }),
                    createMetricTable(report.totals_all),
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: `Without Top 1 (${report.top1_name})`, heading: HeadingLevel.HEADING_1 }),
                    createMetricTable(report.totals_excl),
                    new Paragraph({ text: "" }),
                    new Paragraph({ 
                        children: [new TextRun({ text: `Generated ${new Date().toLocaleString()}  •  Source: ${report.csv_filename}`, size: 16, color: "808080" })],
                        alignment: AlignmentType.CENTER
                    })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Weekly_Report_${report.week_start}.docx`);
    }

    // ── UI Helpers ──
    function animateCounter(elementId, target, isCurrency) {
        const el = document.getElementById(elementId);
        const duration = 1200;
        const start = performance.now();
        const fmtMoney = v => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(v);
        const fmtNum = v => new Intl.NumberFormat('en-US').format(v);

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = isCurrency ? fmtMoney(current) : fmtNum(Math.round(current));
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function triggerStaggerAnimations() {
        const elements = dashboardPanel.querySelectorAll('.anim-stagger');
        elements.forEach((el, i) => {
            el.style.animationDelay = `${i * 0.08}s`;
            el.classList.add('visible');
        });
    }

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

    btnBack.addEventListener('click', () => {
        dashboardPanel.classList.add('hidden');
        uploadPanel.classList.remove('hidden');
        form.reset();
        fileNameDisplay.innerHTML = '';
        currentReport = null;
    });

    // Copy to Slack
    btnCopySlack.addEventListener('click', () => {
        if (!currentReport) return;
        const r = currentReport;
        const fmtM = v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const text = [
            `📊 *Weekly Affiliate Report — ${r.week_label}*`,
            ``,
            `📋 *Overall Totals*`,
            `💰 Revenue: ${fmtM(r.totals_all.revenue)}`,
            `📉 Commission: ${fmtM(r.totals_all.commission)}`,
            `🔄 Conversions: ${r.totals_all.conversions.toLocaleString()}`,
            `📈 Profit: ${fmtM(r.totals_all.profit)}`,
            ``,
            `📋 *Without Top 1 (${r.top1_name})*`,
            `💰 Revenue: ${fmtM(r.totals_excl.revenue)}`,
            `📉 Commission: ${fmtM(r.totals_excl.commission)}`,
            `🔄 Conversions: ${r.totals_excl.conversions.toLocaleString()}`,
            `📈 Profit: ${fmtM(r.totals_excl.profit)}`,
        ].join('\n');

        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied for Slack!', 'success');
        });
    });
});
