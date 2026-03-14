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
    
    // Add "Scanning..." animation to the main button
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.innerText = "Scanning...";
    analyzeBtn.classList.add('scanning');

    const formData = new FormData();
    formData.append('artifact', fileInput.files[0]);

    try {
        const res = await fetch('/analyze', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        // Populate the result page with detailed info
        currentArtifact = data;
        document.getElementById('resImg').src = data.imageUrl;
        document.getElementById('resTitle').innerText = data.title;
        document.getElementById('resInfo').innerText = data.info; // This will show detailed history
        
        document.getElementById('upload-page').classList.add('hidden');
        document.getElementById('result-page').classList.remove('hidden');
    } catch (err) { 
        console.error(err);
        alert("Error analyzing artifact. Check server logs."); 
    } finally {
        analyzeBtn.innerText = "Analyze Artifact";
        analyzeBtn.classList.remove('scanning');
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
    
    // Grid rendering for collection page, including the detail view and remove prompt
    grid.innerHTML = col.map((item, i) => `
        <div class="card">
            <div style="cursor:pointer" onclick="openDetail(${i})">
                <img src="${item.imageUrl}" style="width:100%; border-radius:12px; margin-bottom:15px;">
                <h4 style="color:#fff; font-size:0.9rem; font-weight:700;">${item.title}</h4>
            </div>
            <button onclick="confirmDeletePrompt(${i})" style="background:transparent; color:#555; width:100%; margin-top:15px; padding:8px; border:1px solid #333; cursor:pointer;">Remove</button>
        </div>
    `).join('');
}

// Modal handling for the detail view and delete prompt
function openDetail(i) {
    const col = JSON.parse(localStorage.getItem('artifacts'));
    const item = col[i];
    document.getElementById('detailTitle').innerText = item.title;
    document.getElementById('detailImage').src = item.imageUrl;
    document.getElementById('detailInfo').innerText = item.info;
    document.getElementById('detail-overlay').style.display = 'flex';
}

function closeDetail() { document.getElementById('detail-overlay').style.display = 'none'; }

function confirmDeletePrompt(i) {
    deleteIndex = i;
    // Fix: Show the confirmation prompt
    document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
    // Fix: Hide the confirmation prompt
    document.getElementById('delete-modal').style.display = 'none';
    deleteIndex = null;
}

// Ensure the "Remove" and "Detail" boxes are correctly initialized as hidden
window.onload = function() {
    document.getElementById('delete-modal').style.display = 'none';
    document.getElementById('detail-overlay').style.display = 'none';
};