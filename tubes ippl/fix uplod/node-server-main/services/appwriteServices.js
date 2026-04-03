const { Client, Storage, ID } = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');
const fs = require('fs');
require('dotenv').config();

// Inisialisasi Client
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);
const bucketId = process.env.APPWRITE_BUCKET_ID;
const projectId = process.env.APPWRITE_PROJECT_ID;
const endpoint = process.env.APPWRITE_ENDPOINT;

const uploadToAppwrite = async (file) => {
    try {
        // 1. Upload ke Bucket
        const uploadedFile = await storage.createFile(
            bucketId,
            ID.unique(),
            InputFile.fromPath(file.path, file.filename)
        );

        // 2. Hapus file lokal temp
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        // 3. FIX: Buat URL Manual (SDK Node tidak return URL Object)
        // Format: {endpoint}/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}
        const fileUrl = `${endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${projectId}&mode=admin`;

        return fileUrl;
    } catch (error) {
        console.error('Appwrite Upload Error:', error);
        throw error;
    }
};

module.exports = { uploadToAppwrite };