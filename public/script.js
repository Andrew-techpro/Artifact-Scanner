let currentArtifact = null;
let deleteIndex = null;

function updateFileName() {
    const input = document.getElementById('artifactInput');
    const label = document.getElementById('file-chosen');
    label.innerText = input.files[0] ? input.files[0].name : "No file selected";
}

function resetUI() {
    document.getElementById('artifactInput').value = "";
    document.getElementById('file-chosen').innerText = "No file selected";
}

async function analyzeArtifact() {
    const fileInput = document.getElementById('artifactInput');
    if (!fileInput.files[0]) return;
    const btn = document.querySelector('.btn-primary');
    btn.innerText = "Scanning...";
    btn.classList.add('scanning');

    const formData = new FormData();
    formData.append('artifact', fileInput.files[0]);

    try {
        const res = await fetch('/analyze', { method: 'POST', body: formData });
        const data = await res.json();
        currentArtifact = data;
        document.getElementById('resImg').src = data.imageUrl;
        document.getElementById('resTitle').innerText = data.title;
        document.getElementById('resInfo').innerText = data.info;
        document.getElementById('upload-page').classList.add('hidden');
        document.getElementById('result-page').classList.remove('hidden');
    } catch (err) { alert("Error."); }
    finally {
        btn.innerText = "Analyze Artifact";
        btn.classList.remove('scanning');
    }
}

function goBack() {
    document.getElementById('result-page').classList.add('hidden');
    document.getElementById('collection-page').classList.add('hidden');
    document.getElementById('upload-page').classList.remove('hidden');
    resetUI();
}

function saveToCollection() {
    const col = JSON.parse(localStorage.getItem('artifacts')) || [];
    col.push(currentArtifact);
    localStorage.setItem('artifacts', JSON.stringify(col));
    goBack();
}

function showCollection() {
    document.getElementById('upload-page').classList.add('hidden');
    document.getElementById('collection-page').classList.remove('hidden');
    const grid = document.getElementById('collection-grid');
    const col = JSON.parse(localStorage.getItem('artifacts')) || [];
    grid.innerHTML = col.map((item, i) => `
        <div class="card">
            <div style="cursor:pointer" onclick="openDetail(${i})">
                <img src="${item.imageUrl}" style="width:100%; border-radius:12px; margin-bottom:15px;">
                <h4 style="color:#fff; font-size:0.9rem;">${item.title}</h4>
            </div>
            <button onclick="confirmDeletePrompt(${i})" style="background:transparent; color:#555; width:100%; margin-top:15px; padding:8px; border:1px solid #333; cursor:pointer;">Remove</button>
        </div>
    `).join('');
}

function openDetail(i) {
    const item = JSON.parse(localStorage.getItem('artifacts'))[i];
    document.getElementById('detailTitle').innerText = item.title;
    document.getElementById('detailImage').src = item.imageUrl;
    document.getElementById('detailInfo').innerText = item.info;
    document.getElementById('detail-overlay').classList.remove('hidden');
}

function closeDetail() { document.getElementById('detail-overlay').classList.add('hidden'); }

function confirmDeletePrompt(i) {
    deleteIndex = i;
    document.getElementById('delete-modal').classList.remove('hidden');
}

document.getElementById('confirmDelete').onclick = function() {
    let col = JSON.parse(localStorage.getItem('artifacts'));
    col.splice(deleteIndex, 1);
    localStorage.setItem('artifacts', JSON.stringify(col));
    document.getElementById('delete-modal').classList.add('hidden');
    showCollection();
};