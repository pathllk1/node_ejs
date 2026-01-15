const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('Downloading DejaVu Sans fonts that support INR symbols...');

// Create fonts directory if it doesn't exist
const fontDir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
    console.log(`Created fonts directory at: ${fontDir}`);
}

// DejaVu fonts URLs (Open Font License - freely distributable)
const fontDownloads = [
    {
        url: 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf',
        filename: 'DejaVuSans.ttf'
    },
    {
        url: 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf',
        filename: 'DejaVuSans-Bold.ttf'
    },
    {
        url: 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Oblique.ttf',
        filename: 'DejaVuSans-Oblique.ttf'
    },
    {
        url: 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-BoldOblique.ttf',
        filename: 'DejaVuSans-BoldOblique.ttf'
    }
];

let completedDownloads = 0;
const totalDownloads = fontDownloads.length;

fontDownloads.forEach(({ url, filename }) => {
    const filePath = path.join(fontDir, filename);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
        console.log(`${filename} already exists, skipping download.`);
        completedDownloads++;
        
        if (completedDownloads === totalDownloads) {
            console.log('All font downloads completed.');
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
        } else {
            response.pipe(file);
        }
        
        file.on('finish', () => {
            file.close();
            console.log(`${filename} downloaded successfully.`);
            completedDownloads++;
            
            if (completedDownloads === totalDownloads) {
                console.log('All font downloads completed.');
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
    // Create symlinks or copies to match expected filenames
    const mappings = {
        'DejaVuSans.ttf': 'Roboto-Regular.ttf',
        'DejaVuSans-Bold.ttf': 'Roboto-Medium.ttf',
        'DejaVuSans-Oblique.ttf': 'Roboto-Italic.ttf',
        'DejaVuSans-BoldOblique.ttf': 'Roboto-MediumItalic.ttf'
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
    
    console.log('Font setup completed! INR symbols should now render properly.');
}