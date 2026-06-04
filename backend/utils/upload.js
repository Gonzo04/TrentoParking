const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')

const uploadDir = path.join(__dirname, '..', 'uploads')

// Creiamo la cartella uploads se non esiste
// Serve per evitare errori al primo caricamento foto su una macchina nuova
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = crypto.randomBytes(16).toString('hex')
    cb(null, `${name}${ext}`)
  },
})

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('Formato immagine non supportato'))
    return
  }

  cb(null, true)
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})