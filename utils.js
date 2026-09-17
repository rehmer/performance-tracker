window.Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Parses "MM:SS" or "HH:MM:SS" to total seconds
    parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return isNaN(Number(timeStr)) ? 0 : Number(timeStr);
    },

    // Formats seconds to "HH:MM:SS" or "MM:SS"
    formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null) return "0:00";
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    // Calculate percentage based on target, baseline, and whether higher is better
    calculateProgress(result, baseline, target, type) {
        if (baseline === target) return 100; // Prevent divide by zero if user sets them same

        let progress = 0;
        if (type === 'higher') {
            progress = ((result - baseline) / (target - baseline)) * 100;
        } else {
            // Lower is better (e.g. running time)
            progress = ((baseline - result) / (baseline - target)) * 100;
        }

        // Clamp between 0 and 100
        progress = Math.max(0, Math.min(100, progress));
        return Math.round(progress);
    },

    // Format date string 'YYYY-MM-DD' to "Sep 16, 2026"
    // Using UTC to prevent timezone shifts when parsing from YYYY-MM-DD
    formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString + 'T12:00:00Z');
        return d.toLocaleDateString('en-US', { 
            timeZone: 'UTC',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
};
