#!/usr/bin/env node

/**
 * Fix whitespace issues that cause "Unexpected text node" errors in React Native
 * 
 * This script finds and fixes extra whitespace between JSX elements that can cause
 * "Unexpected text node: . A text node cannot be a child of a <View>" errors.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const directories = ['src'];

// File extensions to process
const extensions = ['.tsx', '.jsx'];

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern to match: closing tag, optional whitespace including newlines, opening tag
    // This regex finds places where there's unnecessary whitespace between JSX elements
    const problematicPattern = /(<\/[^>]+>)\s*\n\s*\n\s*(<[^/>][^>]*>)/g;
    
    let hasChanges = false;
    const fixedContent = content.replace(problematicPattern, (match, closingTag, openingTag) => {
      hasChanges = true;
      return `${closingTag}\n        ${openingTag}`;
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`Fixed whitespace issues in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  let totalFixed = 0;
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (extensions.some(ext => file.endsWith(ext))) {
        if (processFile(fullPath)) {
          totalFixed++;
        }
      }
    }
  }
  
  walkDir(dir);
  return totalFixed;
}

function main() {
  console.log('🔍 Scanning for whitespace issues in React Native components...\n');
  
  let totalFiles = 0;
  
  for (const directory of directories) {
    if (fs.existsSync(directory)) {
      console.log(`📁 Processing directory: ${directory}`);
      const fixed = scanDirectory(directory);
      totalFiles += fixed;
    } else {
      console.log(`⚠️  Directory not found: ${directory}`);
    }
  }
  
  console.log(`\n✅ Completed! Fixed whitespace issues in ${totalFiles} file(s).`);
  
  if (totalFiles > 0) {
    console.log('\n📝 Note: This script fixed common whitespace patterns that cause');
    console.log('   "Unexpected text node" errors in React Native. You may need to');
    console.log('   manually review and adjust some fixes if needed.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, scanDirectory };
