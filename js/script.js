const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const uploadContent = document.getElementById('upload-content');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const convertBtn = document.getElementById('convert-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

let currentFile = null;
let currentTab = 'paste';

function hasFarsi(text) {
    const farsiChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return farsiChars.test(text);
}

function reshapeArabic(text) {
    if (typeof arabicReshaper !== 'undefined') {
        return arabicReshaper.reshape(text);
    }
    return text;
}

function fixLine(line) {
    const trimmed = line.trim();
    if (!trimmed || !hasFarsi(trimmed)) {
        return line;
    }

    const indent = line.slice(0, line.length - line.trimStart().length);
    const trailing = line.slice(line.trimEnd().length);
    const reshaped = reshapeArabic(trimmed);

    return indent + '\u202B' + reshaped + '\u202C' + trailing;
}

function fixSRT(content) {
    const lines = content.split(/\r?\n/);
    const fixed = [];
    const srtPattern = /^\d{1,4}$/;
    const timePattern = /^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '' || srtPattern.test(trimmed) || timePattern.test(trimmed)) {
            fixed.push(line);
            continue;
        }

        fixed.push(fixLine(line));
    }

    return fixed.join('\n');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function switchTab(tab) {
    currentTab = tab;
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });
}

function handleFile(file) {
    if (!file) return;

    const validTypes = ['text/plain', 'text/srt', 'application/octet-stream'];
    const validExts = ['.srt', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        showToast('لطفا فایل با فرمت SRT یا TXT انتخاب کنید', 'error');
        return;
    }

    if (file.size > 1 * 1024 * 1024) {
        showToast('حجم فایل نباید بیشتر از 5 مگابایت باشد', 'error');
        return;
    }

    currentFile = file;
    fileName.textContent = file.name;
    fileInfo.hidden = false;
    uploadArea.classList.add('hidden-upload');

    const reader = new FileReader();
    reader.onload = (e) => {
        inputText.value = e.target.result;
        showToast('فایل با موفقیت بارگذاری شد', 'success');
    };
    reader.onerror = () => {
        showToast('خطا در خواندن فایل', 'error');
        resetFile();
    };
    reader.readAsText(file, 'UTF-8');
}

function resetFile() {
    currentFile = null;
    fileInput.value = '';
    fileInfo.hidden = true;
    uploadArea.classList.remove('hidden-upload');
    inputText.value = '';
}

function getInputContent() {
    if (currentTab === 'upload' && currentFile) {
        return inputText.value;
    }
    return inputText.value;
}

function convert() {
    const content = getInputContent().trim();
    if (!content) {
        showToast('لطفا ابتدا متن SRT را وارد کنید', 'error');
        return;
    }

    try {
        const fixed = fixSRT(content);
        outputText.value = fixed;
        copyBtn.disabled = false;
        downloadBtn.disabled = false;
        showToast('تبدیل با موفقیت انجام شد', 'success');
    } catch (err) {
        console.error(err);
        showToast('خطا در پردازش فایل', 'error');
    }
}

function copyOutput() {
    const text = outputText.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        showToast('متن کپی شد', 'success');
    }).catch(() => {
        outputText.select();
        document.execCommand('copy');
        showToast('متن کپی شد', 'success');
    });
}

function downloadOutput() {
    const text = outputText.value;
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('فایل دانلود شد', 'success');
}

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// File input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

// Upload area click
uploadArea.addEventListener('click', () => fileInput.click());

// Remove file
removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
    inputText.value = '';
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Convert button
convertBtn.addEventListener('click', convert);

// Copy button
copyBtn.addEventListener('click', copyOutput);

// Download button
downloadBtn.addEventListener('click', downloadOutput);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        convert();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!downloadBtn.disabled) downloadOutput();
    }
});
