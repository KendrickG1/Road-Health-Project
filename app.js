import { db, storage, collection, addDoc, getDocs, query, orderBy, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

// Get form elements
const hazardForm = document.getElementById('hazardForm');
const statusMessage = document.getElementById('statusMessage');
const loadReportsBtn = document.getElementById('loadReports');
const reportsList = document.getElementById('reportsList');

// Function to show status messages
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = '';
    }, 5000);
}

// Function to upload image to Firebase Storage
async function uploadImage(file) {
    // Create a unique filename using timestamp
    const timestamp = Date.now();
    const filename = `hazards/${timestamp}_${file.name}`;
    
    // Create a storage reference
    const storageRef = ref(storage, filename);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
}

// Handle form submission
hazardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    showStatus('Uploading report...', 'loading');
    
    try {
        // Get form values
        const hazardType = document.getElementById('hazardType').value;
        const location = document.getElementById('location').value;
        const severity = document.getElementById('severity').value;
        const description = document.getElementById('description').value;
        const imageFile = document.getElementById('image').files[0];
        
        // Check file size (5MB max)
        if (imageFile.size > 5 * 1024 * 1024) {
            showStatus('Image is too large. Maximum size is 5MB.', 'error');
            return;
        }
        
        // Upload image first
        const imageURL = await uploadImage(imageFile);
        
        // Save to Firestore
        await addDoc(collection(db, 'hazards'), {
            type: hazardType,
            location: location,
            severity: severity,
            description: description,
            imageURL: imageURL,
            timestamp: new Date(),
            status: 'reported' // You can use this for tracking if it's been fixed
        });
        
        showStatus('✓ Hazard reported successfully!', 'success');
        hazardForm.reset();
        
    } catch (error) {
        console.error('Error adding document: ', error);
        showStatus('Error submitting report. Please try again.', 'error');
    }
});

// Function to load and display reports
async function loadReports() {
    showStatus('Loading reports...', 'loading');
    reportsList.innerHTML = '';
    
    try {
        // Query Firestore for all hazards, ordered by newest first
        const q = query(collection(db, 'hazards'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            reportsList.innerHTML = '<p style="text-align: center; color: #666;">No reports yet. Be the first to report a hazard!</p>';
            statusMessage.textContent = '';
            statusMessage.className = '';
            return;
        }
        
        // Display each report
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const reportCard = createReportCard(data);
            reportsList.appendChild(reportCard);
        });
        
        statusMessage.textContent = '';
        statusMessage.className = '';
        
    } catch (error) {
        console.error('Error loading reports: ', error);
        showStatus('Error loading reports. Please try again.', 'error');
    }
}

// Function to create a report card element
function createReportCard(data) {
    const card = document.createElement('div');
    card.className = 'report-card';
    
    const date = data.timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    card.innerHTML = `
        <img src="${data.imageURL}" alt="${data.type}">
        <div class="report-header">
            <span class="hazard-type">${data.type.replace('-', ' ').toUpperCase()}</span>
            <span class="severity severity-${data.severity}">${data.severity.toUpperCase()}</span>
        </div>
        <div class="report-location">📍 ${data.location}</div>
        <div class="report-description">${data.description || 'No additional description provided.'}</div>
        <div class="report-date">Reported on ${date}</div>
    `;
    
    return card;
}

// Load reports when button is clicked
loadReportsBtn.addEventListener('click', loadReports);

// Optional: Load reports automatically when page loads
// loadReports();
