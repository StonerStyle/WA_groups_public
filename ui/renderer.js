// Keep monitoring-related code
ipcRenderer.on('monitoring-started', () => {
    startMonitoringBtn.disabled = false;
    stopMonitoringBtn.disabled = false;
    monitoringStatus.textContent = 'ניטור פעיל';
    monitoringStatus.className = 'text-success';
});

ipcRenderer.on('monitoring-stopped', () => {
    startMonitoringBtn.disabled = false;
    stopMonitoringBtn.disabled = true;
    monitoringStatus.textContent = 'ניטור מושבת';
    monitoringStatus.className = 'text-danger';
});

ipcRenderer.on('monitoring-error', (event, error) => {
    startMonitoringBtn.disabled = false;
    stopMonitoringBtn.disabled = true;
    monitoringStatus.textContent = 'שגיאה: ' + error;
    monitoringStatus.className = 'text-danger';
});

// Remove query bot-related event listeners 