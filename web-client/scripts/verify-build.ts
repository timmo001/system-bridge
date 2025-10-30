import { readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function verifyBuild(): Promise<void> {
  const outDir = join(process.cwd(), 'out');
  // Next.js 16 moved CSS files to chunks directory
  const staticDir = join(outDir, '_next', 'static');

  try {
    // Check if out directory exists
    await stat(outDir);
    console.log('✓ Output directory exists');

    // Check if static directory exists
    await stat(staticDir);
    console.log('✓ Static directory exists');

    // Find CSS files in static directory (recursively check chunks)
    const chunksDir = join(staticDir, 'chunks');
    let cssFiles: string[] = [];

    try {
      await stat(chunksDir);
      const chunkFiles = await readdir(chunksDir);
      cssFiles = chunkFiles.filter(file => file.endsWith('.css'));
    } catch {
      // Fallback: check old css directory location for backwards compatibility
      try {
        const cssDir = join(staticDir, 'css');
        await stat(cssDir);
        const oldCssFiles = await readdir(cssDir);
        cssFiles = oldCssFiles.filter(file => file.endsWith('.css'));
      } catch {
        // No CSS files in either location
      }
    }

    if (cssFiles.length > 0) {
      console.log(`✓ Found ${cssFiles.length} CSS file(s):`, cssFiles);
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
        // Next.js 16 puts CSS in chunks or css directory
        if (content.includes('stylesheet') && (content.includes('_next/static/chunks/') || content.includes('_next/static/css/'))) {
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