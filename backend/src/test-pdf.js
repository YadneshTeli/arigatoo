const fs = require('fs');
const pdf = require('pdf-parse');

async function test() {
    try {
        // Create a dummy PDF buffer (or try to read a real one if we had it)
        // Since we don't have the user's file, we can't test their specific file.
        // But we can test if the library loads at all.

        console.log('Library loaded successfully');

        const dummyBuffer = fs.readFileSync(__dirname + '/../../package.json'); // Intentionally bad file to test error handling

        await pdf(dummyBuffer);
    } catch (e) {
        console.log('Error caught as expected:', e.message);
    }
}

test();
