/**
 * EMERGENCY CLEANUP SCRIPT
 * 
 * Run this in the browser console (F12) to immediately clear legacy localStorage
 * and fix the infinite loop issue.
 * 
 * HOW TO USE:
 * 1. Open your browser
 * 2. Press F12 to open DevTools
 * 3. Go to the "Console" tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Refresh the page (F5)
 * 7. Try logging in again
 */

(function () {
    console.log('🧹 Starting emergency localStorage cleanup...');

    const legacyKeys = [
        'pa_user_transactions',
        'pa_user_categories',
        'pa_user_goals',
        'pa_user_profile',
    ];

    let removedCount = 0;
    let foundKeys = [];

    // Check what exists first
    legacyKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            foundKeys.push(key);
        }
    });

    if (foundKeys.length === 0) {
        console.log('✅ No legacy data found. Your localStorage is clean!');
        console.log('📊 Current localStorage keys:', Object.keys(localStorage));
        return;
    }

    console.log(`⚠️  Found ${foundKeys.length} legacy keys:`, foundKeys);

    // Remove legacy keys
    legacyKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            removedCount++;
            console.log(`  ✓ Removed: ${key}`);
        }
    });

    // Mark migration as complete
    localStorage.setItem('pa_migration_v3_complete', 'true');
    console.log('  ✓ Marked migration as complete');

    console.log(`\n✅ Cleanup complete! Removed ${removedCount} legacy keys.`);
    console.log('📊 Remaining localStorage keys:', Object.keys(localStorage));
    console.log('\n🔄 Please refresh the page (F5) and try logging in again.');

    // Optional: Show a confirmation dialog
    if (confirm('Cleanup complete! Click OK to refresh the page now.')) {
        window.location.reload();
    }
})();
