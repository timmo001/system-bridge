#!/usr/bin/env bun

import { readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function verifyBuild(): Promise<void> {
  const outDir = join(process.cwd(), 'out');
  const cssDir = join(outDir, '_next', 'static', 'css');
  
  try {
    // Check if out directory exists
    await stat(outDir);
    console.log('✓ Output directory exists');
    
    // Check if CSS directory exists
    await stat(cssDir);
    console.log('✓ CSS directory exists');
    
    // Check for CSS files
    const cssFiles = await readdir(cssDir);
    const cssFileCount = cssFiles.filter(file => file.endsWith('.css')).length;
    
    if (cssFileCount > 0) {
      console.log(`✓ Found ${cssFileCount} CSS file(s):`, cssFiles.filter(file => file.endsWith('.css')));
    } else {
      console.log('✗ No CSS files found');
      process.exit(1);
    }
    
    // Check HTML files for CSS links
    const htmlFiles = await readdir(outDir);
    const htmlFileCount = htmlFiles.filter(file => file.endsWith('.html')).length;
    
    if (htmlFileCount > 0) {
      console.log(`✓ Found ${htmlFileCount} HTML file(s)`);
      
      // Check if index.html has CSS link
      const indexHtml = join(outDir, 'index.html');
      try {
        const content = readFileSync(indexHtml, 'utf8');
        if (content.includes('stylesheet') && content.includes('_next/static/css/')) {
          console.log('✓ HTML files contain CSS links');
        } else {
          console.log('✗ HTML files missing CSS links');
          process.exit(1);
        }
      } catch (error) {
        console.log('✗ Could not verify HTML files');
        process.exit(1);
      }
    }
    
    console.log('✓ Build verification passed');
    
  } catch (error) {
    console.log('✗ Build verification failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

verifyBuild();