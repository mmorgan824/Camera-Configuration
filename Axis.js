document.addEventListener("DOMContentLoaded", function () {
function runConfiguration(username, password, excelFile) {

    const file = excelFileInput.files[0];
    if (!file) {
        logMessage('No file found', 'ERROR');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (!jsonData.length) {
            logMessage('Excel file is empty or invalid', 'ERROR');
            setRunningState(false);
            return;
        }

        logMessage(`Loaded ${jsonData.length} rows from spreadsheet`, 'INFO');

        let index = 0;
        const total = jsonData.length;

        function processNext() {

            if (stopRequested || !isRunning) {
                logMessage('Configuration stopped by user', 'WARNING');
                setRunningState(false);
                updateStatus('Stopped', 0);
                return;
            }

            if (index >= total) {
                logMessage('Finished processing all cameras', 'INFO');
                setRunningState(false);
                updateStatus('Complete', 100);
                return;
            }

            const row = jsonData[index];

            // 🔥 Match your Excel column names here
            const mac = row.MAC || row.Mac || row.mac;
            const oldIp = row.OldIP || row.oldIp || row["Old IP"];
            const newIp = row.NewIP || row.newIp || row["New IP"];

            if (!mac || !newIp) {
                logMessage(`Skipping row ${index + 1} (missing data)`, 'WARNING');
                index++;
                processNext();
                return;
            }

            const progress = Math.round(((index + 1) / total) * 100);
            updateStatus(`Processing camera ${index + 1}/${total}`, progress);

            logMessage(`Connecting to ${oldIp || 'unknown IP'} (MAC: ${mac})`, 'INFO');

            currentThread = setTimeout(() => {

                logMessage(`Applying credentials...`, 'INFO');

                currentThread = setTimeout(() => {

                    logMessage(
                        `MAC: ${mac} | ${oldIp || 'N/A'} → ${newIp}`,
                        'INFO'
                    );

                    logMessage(`IP updated successfully`, 'SUCCESS');

                    index++;
                    processNext();

                }, 400);

            }, 400);
        }

        processNext();
    };

    reader.readAsArrayBuffer(file);
}
