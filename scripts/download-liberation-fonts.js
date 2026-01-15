const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('Downloading Liberation Sans fonts that have excellent INR symbol support...');

// Create fonts directory if it doesn't exist
const fontDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
    console.log(`Created fonts directory at: ${fontDir}`);
}

// Liberation fonts URLs (Open Font License - freely distributable)
const fontDownloads = [
    {
        url: 'https://github.com/liberationfonts/liberation-fonts/files/2579423/LiberationSans-Regular.ttf.gz',
        filename: 'LiberationSans-Regular.ttf.gz',
        finalName: 'LiberationSans-Regular.ttf'
    },
    {
        url: 'https://github.com/liberationfonts/liberation-fonts/files/2579423/LiberationSans-Bold.ttf.gz',
        filename: 'LiberationSans-Bold.ttf.gz',
        finalName: 'LiberationSans-Bold.ttf'
    },
    {
        url: 'https://github.com/liberationfonts/liberation-fonts/files/2579423/LiberationSans-Italic.ttf.gz',
        filename: 'LiberationSans-Italic.ttf.gz',
        finalName: 'LiberationSans-Italic.ttf'
    },
    {
        url: 'https://github.com/liberationfonts/liberation-fonts/files/2579423/LiberationSans-BoldItalic.ttf.gz',
        filename: 'LiberationSans-BoldItalic.ttf.gz',
        finalName: 'LiberationSans-BoldItalic.ttf'
    }
];

// Alternative direct URLs for Liberation fonts
const altFontUrls = [
    'https://github.com/liberationfonts/liberation-fonts/releases/download/v2.1.5/LiberationSans-Regular.ttf',
    'https://github.com/liberationfonts/liberation-fonts/releases/download/v2.1.5/LiberationSans-Bold.ttf',
    'https://github.com/liberationfonts/liberation-fonts/releases/download/v2.1.5/LiberationSans-Italic.ttf',
    'https://github.com/liberationfonts/liberation-fonts/releases/download/v2.1.5/LiberationSans-BoldItalic.ttf'
];

const altFontNames = [
    'LiberationSans-Regular.ttf',
    'LiberationSans-Bold.ttf',
    'LiberationSans-Italic.ttf',
    'LiberationSans-BoldItalic.ttf'
];

let completedDownloads = 0;
const totalDownloads = altFontNames.length;

// Try the alternative direct URLs
altFontUrls.forEach((url, index) => {
    const filename = altFontNames[index];
    const filePath = path.join(fontDir, filename);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
        console.log(`${filename} already exists, skipping download.`);
        completedDownloads++;
        
        if (completedDownloads === totalDownloads) {
            console.log('All Liberation font downloads completed.');
            createRobotoSymlinks();
        }
        return;
    }
    
    console.log(`Downloading ${filename}...`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            // Handle redirect
            https.get(response.headers.location, (res) => {
                res.pipe(file);
            });
        } else if (response.statusCode === 404) {
            // If the direct URL doesn't work, try to get from CDN
            const cdnUrl = `https://cdn.jsdelivr.net/npm/liberation-fonts@2.1.5/dist/${filename}`;
            console.log(`Direct URL failed, trying CDN: ${cdnUrl}`);
            https.get(cdnUrl, (cdnResponse) => {
                if (cdnResponse.statusCode === 200) {
                    cdnResponse.pipe(file);
                } else {
                    console.error(`${filename} download failed with status: ${cdnResponse.statusCode}`);
                    completedDownloads++;
                    
                    if (completedDownloads === totalDownloads) {
                        console.log('Download process completed with some failures.');
                        createRobotoSymlinks();
                    }
                }
            }).on('error', (err) => {
                console.error(`Error with CDN download for ${filename}:`, err.message);
                completedDownloads++;
                
                if (completedDownloads === totalDownloads) {
                    console.log('Download process completed with some failures.');
                    createRobotoSymlinks();
                }
            });
        } else {
            response.pipe(file);
        }
        
        file.on('finish', () => {
            file.close();
            console.log(`${filename} downloaded successfully.`);
            completedDownloads++;
            
            if (completedDownloads === totalDownloads) {
                console.log('All Liberation font downloads completed.');
                createRobotoSymlinks();
            }
        });
        
        file.on('error', (err) => {
            console.error(`Error downloading ${filename}:`, err.message);
            completedDownloads++;
            
            if (completedDownloads === totalDownloads) {
                console.log('Download process completed with errors.');
                createRobotoSymlinks();
            }
        });
    }).on('error', (err) => {
        console.error(`Error initiating download for ${filename}:`, err.message);
        completedDownloads++;
        
        if (completedDownloads === totalDownloads) {
            console.log('Download process completed with errors.');
            createRobotoSymlinks();
        }
    });
});

function createRobotoSymlinks() {
    // Create symlinks or copies to match expected filenames if they don't already exist
    const mappings = {
        'LiberationSans-Regular.ttf': 'Roboto-Regular.ttf',
        'LiberationSans-Bold.ttf': 'Roboto-Medium.ttf',
        'LiberationSans-Italic.ttf': 'Roboto-Italic.ttf',
        'LiberationSans-BoldItalic.ttf': 'Roboto-MediumItalic.ttf'
    };
    
    Object.entries(mappings).forEach(([source, target]) => {
        const sourcePath = path.join(fontDir, source);
        const targetPath = path.join(fontDir, target);
        
        if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
            try {
                // Create a copy (symlinks on Windows require elevated privileges)
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`Created ${target} from ${source}`);
            } catch (err) {
                console.error(`Error creating ${target}:`, err.message);
            }
        }
    });
    
    console.log('Liberation font setup completed! INR symbols should now render properly.');
}