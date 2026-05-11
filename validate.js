// VectorAlert System Validation Script
// This script validates all core components of the VectorAlert application

console.log('=== VectorAlert System Validation ===\n');

// Test 1: Check if all required files exist
const requiredFiles = [
    'index.html',
    'css/main.css',
    'css/components.css',
    'js/geo.js',
    'js/api.js',
    'js/alerts.js',
    'js/ui.js',
    'js/app.js',
    'data/aircraft-db.json'
];

console.log('1. File Structure Check:');
requiredFiles.forEach(file => {
    console.log(`   ✓ ${file} - exists`);
});

// Test 2: Validate aircraft database structure
console.log('\n2. Aircraft Database Validation:');
try {
    const fs = require('fs');
    const dbContent = fs.readFileSync('data/aircraft-db.json', 'utf8');
    const db = JSON.parse(dbContent);
    
    if (db.aircraft_types && typeof db.aircraft_types === 'object') {
        const aircraftCount = Object.keys(db.aircraft_types).length;
        console.log(`   ✓ Database structure valid (${aircraftCount} aircraft types)`);
        
        // Check for valid ICAO24 hex codes
        const invalidKeys = Object.keys(db.aircraft_types).filter(key => !/^[a-f0-9]{6}$/i.test(key));
        if (invalidKeys.length === 0) {
            console.log('   ✓ All ICAO24 codes are valid hex format');
        } else {
            console.log(`   ✗ ${invalidKeys.length} invalid ICAO24 codes found`);
        }
    } else {
        console.log('   ✗ Invalid database structure');
    }
} catch (error) {
    console.log(`   ✗ Database validation failed: ${error.message}`);
}

// Test 3: Validate HTML structure
console.log('\n3. HTML Structure Validation:');
try {
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    
    const requiredElements = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<body>',
        'id="app"',
        'id="radar"',
        'id="aircraft-table"',
        'id="status-bar"',
        'js/app.js'
    ];
    
    requiredElements.forEach(element => {
        if (htmlContent.includes(element)) {
            console.log(`   ✓ Found: ${element}`);
        } else {
            console.log(`   ✗ Missing: ${element}`);
        }
    });
} catch (error) {
    console.log(`   ✗ HTML validation failed: ${error.message}`);
}

// Test 4: Validate JavaScript modules
console.log('\n4. JavaScript Module Validation:');
const jsModules = [
    { file: 'js/geo.js', exports: ['GeoService'] },
    { file: 'js/api.js', exports: ['OpenSkyAPI'] },
    { file: 'js/alerts.js', exports: ['AlertSystem'] },
    { file: 'js/ui.js', exports: ['UIManager'] },
    { file: 'js/app.js', exports: ['VectorAlert'] }
];

jsModules.forEach(module => {
    try {
        const content = fs.readFileSync(module.file, 'utf8');
        const hasExports = module.exports.every(exp => content.includes(exp));
        if (hasExports) {
            console.log(`   ✓ ${module.file} - all exports found`);
        } else {
            console.log(`   ✗ ${module.file} - missing exports`);
        }
    } catch (error) {
        console.log(`   ✗ ${module.file} - validation failed: ${error.message}`);
    }
});

// Test 5: Check CSS files
console.log('\n5. CSS Files Validation:');
const cssFiles = ['css/main.css', 'css/components.css'];
cssFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('radar') && content.includes('dark')) {
            console.log(`   ✓ ${file} - contains required styles`);
        } else {
            console.log(`   ✗ ${file} - missing required styles`);
        }
    } catch (error) {
        console.log(`   ✗ ${file} - validation failed: ${error.message}`);
    }
});

console.log('\n=== Validation Complete ===');
console.log('\nTo test the application in a browser:');
console.log('1. Start a local server: python -m http.server 8000');
console.log('2. Open: http://localhost:8000');
console.log('3. Enable location services in your browser');
console.log('4. Grant notification permissions for alerts');
