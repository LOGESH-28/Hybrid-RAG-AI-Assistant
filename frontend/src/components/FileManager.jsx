import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { FileText, Trash2, Search, UploadCloud, RefreshCw, FileImage, FileCode, CheckCircle, Database, Eye, X, HelpCircle, HardDrive } from 'lucide-react'
import { listFiles, deleteFile, uploadFile } from '../services/api'
import { format } from 'date-fns'

const ACCEPT = { 
  'application/pdf': ['.pdf'], 
  'text/plain': ['.txt'],
  'image/png': ['.png'], 
  'image/jpeg': ['.jpg','.jpeg'],
  'image/webp': ['.webp'] 
}

export default function FileManager() {
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [previewContent, setPreviewContent] = useState(null)
  const [previewName, setPreviewName] = useState('')

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const data = await listFiles()
      setFiles(data.files || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleDelete = async (name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will trigger a knowledge base re-index.`)) return
    try {
      await deleteFile(name)
      setFiles(prev => prev.filter(f => f.name !== name))
    } catch (e) {
      console.error(e)
    }
  }

  const handlePreview = async (name) => {
    setPreviewName(name)
    setPreviewContent('Loading preview snippet...')
    try {
      const res = await fetch(`/stats`)
      if (res.ok) {
        const stats = await res.json()
        const content = stats.uploaded_contents?.[name] || 'No preview available. This file is parsed and stored inside the FAISS vector space.'
        setPreviewContent(content)
      } else {
        setPreviewContent('Preview not available.')
      }
    } catch {
      setPreviewContent('Failed to load preview.')
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    setUploadStatus(`Uploading ${acceptedFiles[0].name}...`)
    try {
      await uploadFile(acceptedFiles[0])
      setUploadStatus('Indexing knowledge base...')
      // Wait for indexing
      await new Promise(r => setTimeout(r, 1200))
      setUploadStatus('Done!')
      setTimeout(() => setUploadStatus(''), 2000)
      fetchFiles()
    } catch (e) {
      alert(`Upload failed: ${e.message}`)
      setUploadStatus('')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPT, multiple: false
  })

  // File metrics
  const totalSize = files.reduce((acc, f) => acc + (f.size_kb || 0), 0)
  const pdfCount = files.filter(f => f.type === '.pdf').length
  const txtCount = files.filter(f => f.type === '.txt').length
  const imgCount = files.filter(f => ['.png', '.jpg', '.jpeg', '.webp'].includes(f.type)).length

  // Filtered files
  const filtered = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const getIcon = (type) => {
    if (type === '.pdf') return <FileText size={16} className="text-red-400" />
    if (type === '.txt') return <FileCode size={16} className="text-indigo-400" />
    return <FileImage size={16} className="text-cyan-400" />
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-950 text-white p-6 md:p-8 space-y-8 relative select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display flex items-center gap-2.5">
            <Database className="text-brand" size={24} /> Document & File Repository
          </h1>
          <p className="text-xs text-white/40 mt-1 font-medium font-sans">Manage uploaded context documents, view parsed texts, and feed our vector storage index pipelines.</p>
        </div>
        <button
          onClick={fetchFiles}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Catalog
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Files', value: files.length, desc: 'Indexed knowledge tags', color: 'text-white' },
          { label: 'Storage Indexes', value: `${(totalSize / 1024).toFixed(2)} MB`, desc: 'Aggregate document weight', color: 'text-brand-cyan' },
          { label: 'PDF Documents', value: pdfCount, desc: 'Scanned papers & guides', color: 'text-red-400' },
          { label: 'Code & Graphics', value: txtCount + imgCount, desc: 'Raw text & image frames', color: 'text-brand-violet' },
        ].map((m, i) => (
          <div key={i} className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col justify-between cursor-default">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">{m.label}</span>
            <div className="mt-4">
              <h3 className={`text-2xl font-black font-display tracking-tight leading-none ${m.color}`}>{m.value}</h3>
              <p className="text-[10px] text-white/30 mt-1.5 font-medium">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div 
        {...getRootProps()} 
        className={`border border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
          isDragActive 
            ? 'border-brand bg-brand/5 shadow-glow-indigo' 
            : 'border-white/10 hover:border-brand/40 bg-white/[0.01]'
        }`}
      >
        <input {...getInputProps()} />
        
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand/3 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex flex-col items-center gap-4 relative z-10">
          {uploading ? (
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <RefreshCw size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/55 group-hover:text-brand group-hover:border-brand/35 group-hover:bg-brand/5 transition-all duration-300">
              <UploadCloud size={20} />
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-bold text-white/80">
              {uploading ? uploadStatus : 'Drag & drop a file here, or click to browse'}
            </h4>
            <p className="text-xs text-white/35 mt-1.5 font-medium">Supports PDF, TXT, PNG, JPEG, WEBP files (Max 15MB)</p>
          </div>
        </div>
      </div>

      {/* Repository search and List */}
      <div className="glass-card border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 bg-surface-900 border border-white/5 rounded-xl px-3.5 py-2 w-full max-w-sm">
            <Search size={14} className="text-white/30 flex-shrink-0" />
            <input
              type="text" 
              placeholder="Search documents by name..."
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white w-full outline-none placeholder-white/20 font-medium"
            />
          </div>
          <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
            Displaying {filtered.length} of {files.length} Indexes
          </span>
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/5 rounded-xl bg-white/[0.005]">
              <HardDrive size={24} className="text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/30 font-medium">No documents matching your search filter</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Filename</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Weight</th>
                  <th className="py-3 px-4 font-bold">Uploaded Date</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors group">
                    <td className="py-4 px-4 font-bold text-white/85 flex items-center gap-3 max-w-xs truncate">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                        {getIcon(f.type)}
                      </div>
                      <span className="truncate" title={f.name}>{f.name}</span>
                    </td>
                    <td className="py-4 px-4 text-white/40 font-semibold">{f.category || 'Document'}</td>
                    <td className="py-4 px-4 text-white/40 font-mono font-medium">{f.size_kb} KB</td>
                    <td className="py-4 px-4 text-white/40 font-medium">
                      {f.timestamp ? format(new Date(f.timestamp), 'MMM dd, yyyy · HH:mm') : 'Unknown'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handlePreview(f.name)}
                          className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                          title="Preview Content"
                        >
                          <Eye size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(f.name)}
                          className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/5"
                          title="Delete File"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md" onClick={() => setPreviewContent(null)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="bg-surface-900 border border-white/5 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 flex-shrink-0 bg-surface-900/50">
                <div className="min-w-0 pr-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Parsed Context Preview</h3>
                  <p className="text-[10px] text-white/35 font-mono truncate mt-0.5" title={previewName}>{previewName}</p>
                </div>
                <button 
                  onClick={() => setPreviewContent(null)} 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Parsed content body */}
              <div className="flex-1 overflow-y-auto bg-surface-950 px-6 py-5 font-mono text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap select-text">
                {previewContent}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
