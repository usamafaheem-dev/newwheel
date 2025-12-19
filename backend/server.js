import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import xlsx from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import connectDB from './config/database.js'
import SpinFile from './models/SpinFile.js'
import Password from './models/Password.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Connect to MongoDB
connectDB()

// Middleware - CORS configuration
app.use(cors({
  origin: '*', // Allow all origins (you can restrict this to specific domains)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}))

// Handle preflight requests
app.options('*', cors())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure multer for file uploads
// Use memory storage for Vercel compatibility (serverless functions)
const storage = multer.memoryStorage()

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Parse Excel file from buffer (for Vercel/serverless)
const parseExcelFile = (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(worksheet)
    return data
  } catch (error) {
    console.error('Error parsing Excel file:', error)
    throw new Error('Failed to parse Excel file: ' + error.message)
  }
}

// Convert image buffer to base64
const imageToBase64 = (buffer, mimetype) => {
  try {
    const base64 = buffer.toString('base64')
    return `data:${mimetype || 'image/png'};base64,${base64}`
  } catch (error) {
    console.error('Error converting image to base64:', error)
    return null
  }
}

// Helper function to convert MongoDB document to API format
const formatSpinFile = (doc) => {
  const file = doc.toObject ? doc.toObject() : doc
  return {
    id: file._id.toString(),
    filename: file.filename,
    json_content: file.json_content,
    picture: file.picture,
    ticketNumber: file.ticketNumber || '',
    active: file.active !== false,
    fixedWinnerTicket: file.fixedWinnerTicket || null,
    createdAt: file.createdAt || file.createdAt,
    updatedAt: file.updatedAt || file.updatedAt
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', database: 'MongoDB' })
})

// Get list of active spin files (for users)
app.get('/api/spins/list/', async (req, res) => {
  try {
    const files = await SpinFile.find({ active: { $ne: false } }).sort({ createdAt: -1 })
    const formattedFiles = files.map(formatSpinFile)
    res.json(formattedFiles)
  } catch (error) {
    console.error('Error getting spin files:', error)
    res.status(500).json({ error: 'Failed to get spin files' })
  }
})

// Get admin list of all spin files
app.get('/api/spins/admin-list/', async (req, res) => {
  try {
    const files = await SpinFile.find().sort({ createdAt: -1 })
    const formattedFiles = files.map(formatSpinFile)
    res.json(formattedFiles)
  } catch (error) {
    console.error('Error getting admin spin files:', error)
    res.status(500).json({ error: 'Failed to get admin spin files' })
  }
})

// Get filenames only
app.get('/api/spins/filenames/', async (req, res) => {
  try {
    const files = await SpinFile.find().select('filename').sort({ createdAt: -1 })
    const filenames = files.map(f => ({ id: f._id.toString(), filename: f.filename }))
    res.json(filenames)
  } catch (error) {
    console.error('Error getting filenames:', error)
    res.status(500).json({ error: 'Failed to get filenames' })
  }
})

// Upload a new spin file
app.post('/api/spins/upload/', upload.fields([
  { name: 'excel_file', maxCount: 1 },
  { name: 'picture', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.excel_file) {
      return res.status(400).json({ error: 'Excel file is required' })
    }

    const excelFile = req.files.excel_file[0]
    const pictureFile = req.files.picture ? req.files.picture[0] : null
    const filename = req.body.filename || excelFile.originalname.replace(/\.(xlsx|xls)$/i, '')
    const ticketNumber = req.body.ticket_number || ''

    // Parse Excel file from buffer (Vercel/serverless compatible)
    const jsonContent = parseExcelFile(excelFile.buffer)

    // Convert picture buffer to base64 if provided
    let pictureBase64 = null
    if (pictureFile && pictureFile.buffer) {
      pictureBase64 = imageToBase64(pictureFile.buffer, pictureFile.mimetype)
    }

    // Create file in MongoDB
    const spinFile = await SpinFile.create({
      filename: filename.trim(),
      json_content: jsonContent,
      picture: pictureBase64,
      ticketNumber: ticketNumber.trim(),
      active: true
    })

    res.json(formatSpinFile(spinFile))
  } catch (error) {
    console.error('Error uploading file:', error)
    res.status(500).json({ error: error.message || 'Failed to upload file' })
  }
})

// Spin the wheel and get winner
app.post('/api/spins/spin/:id/', async (req, res) => {
  try {
    const { id } = req.params
    const file = await SpinFile.findById(id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    if (!file.json_content || !Array.isArray(file.json_content) || file.json_content.length === 0) {
      return res.status(400).json({ error: 'No entries available' })
    }

    // Get random winner
    const randomIndex = Math.floor(Math.random() * file.json_content.length)
    const winner = file.json_content[randomIndex]

    res.json({ winner, index: randomIndex })
  } catch (error) {
    console.error('Error spinning wheel:', error)
    res.status(500).json({ error: 'Failed to spin wheel' })
  }
})

// Delete a spin file
app.delete('/api/spins/delete/:id/', async (req, res) => {
  try {
    const { id } = req.params
    const file = await SpinFile.findByIdAndDelete(id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    res.json({ success: true, message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error deleting file:', error)
    res.status(500).json({ error: 'Failed to delete file' })
  }
})

// Toggle active status of a spin file
app.patch('/api/spins/toggle-active/:id/', async (req, res) => {
  try {
    const { id } = req.params
    const file = await SpinFile.findById(id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    file.active = !(file.active !== false)
    await file.save()

    res.json(formatSpinFile(file))
  } catch (error) {
    console.error('Error toggling active status:', error)
    res.status(500).json({ error: 'Failed to toggle active status' })
  }
})

// Check password for admin operations
app.post('/api/spins/check-password/', async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    const passwordDoc = await Password.getPassword()
    const isValid = bcrypt.compareSync(password, passwordDoc.hash)

    res.json({ valid: isValid })
  } catch (error) {
    console.error('Error checking password:', error)
    res.status(500).json({ error: 'Failed to check password' })
  }
})

// Update password
app.post('/api/spins/update-password/', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' })
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' })
    }

    // Verify old password
    const passwordDoc = await Password.getPassword()
    const isValid = bcrypt.compareSync(oldPassword, passwordDoc.hash)

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Update password
    const newHash = bcrypt.hashSync(newPassword, 10)
    await Password.updatePassword(newHash)

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: 'Failed to update password' })
  }
})

// Set fixed winner for a spin file
app.post('/api/spins/set-fixed-winner/:id/', async (req, res) => {
  try {
    const { id } = req.params
    const { rigged_ticket } = req.body

    const file = await SpinFile.findById(id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    file.fixedWinnerTicket = rigged_ticket
    await file.save()

    res.json({ success: true, message: 'Fixed winner set' })
  } catch (error) {
    console.error('Error setting fixed winner:', error)
    res.status(500).json({ error: 'Failed to set fixed winner' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📦 Using MongoDB database`)
})
