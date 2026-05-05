'use client'

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Camera,
  Upload,
  X,
  Loader2,
  Sparkles,
  Pill,
  FileText,
  Check,
  RefreshCcw,
  ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ==================== Types ====================

export interface ScannedMedicine {
  id: string
  name: string
  dosage: string
  quantity: number
  notes: string
}

interface PrescriptionScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete: (response: ScanResponse) => void
}

interface ScanResponse {
  success: boolean
  medicines: ScannedMedicine[]
  doctor_name?: string | null
  patient_name?: string | null
  prescription_date?: string | null
  raw?: string
  error?: string
}

// ==================== Component ====================

export function PrescriptionScanner({
  open,
  onOpenChange,
  onScanComplete,
}: PrescriptionScannerProps) {
  // File & preview state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Scan state
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Clean up preview URL
        if (preview) {
          URL.revokeObjectURL(preview)
        }
        setFile(null)
        setPreview(null)
        setScanResults(null)
        setSelectedIds(new Set())
        setIsDragging(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, preview]
  )

  // Handle file selection
  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.')
      return
    }

    // Clean up old preview
    if (preview) {
      URL.revokeObjectURL(preview)
    }

    setFile(selectedFile)
    setScanResults(null)
    setSelectedIds(new Set())

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }, [preview])

  // File input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) handleFile(selected)
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFile]
  )

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile) handleFile(droppedFile)
    },
    [handleFile]
  )

  // Scan prescription
  const handleScan = useCallback(async () => {
    if (!file) return

    setIsScanning(true)
    setScanResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ai/scan-prescription', {
        method: 'POST',
        body: formData,
      })

      const data: ScanResponse = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to scan prescription')
        setScanResults({ success: false, medicines: [], error: data.error })
        return
      }

      setScanResults(data)

      if (data.success && data.medicines.length > 0) {
        // Auto-select all medicines by default
        setSelectedIds(new Set(data.medicines.map((m) => m.id)))
        toast.success(`Found ${data.medicines.length} medicine${data.medicines.length > 1 ? 's' : ''}!`)
      } else if (data.error) {
        toast.error(data.error)
      } else {
        toast.info('No medicines detected in this image.')
      }
    } catch {
      toast.error('Network error. Please try again.')
      setScanResults({
        success: false,
        medicines: [],
        error: 'Network error. Please try again.',
      })
    } finally {
      setIsScanning(false)
    }
  }, [file])

  // Toggle medicine selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all / deselect all
  const toggleAll = useCallback(() => {
    if (!scanResults?.medicines) return
    const allIds = scanResults.medicines.map((m) => m.id)
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [scanResults, selectedIds])

  // Add selected medicines to bill
  const handleAddToBill = useCallback(() => {
    if (!scanResults?.medicines) return
    const selected = scanResults.medicines.filter((m) => selectedIds.has(m.id))
    if (selected.length === 0) {
      toast.error('Please select at least one medicine')
      return
    }
    
    onScanComplete({
      ...scanResults,
      medicines: selected
    })
    
    handleOpenChange(false)
    toast.success(`${selected.length} medicine${selected.length > 1 ? 's' : ''} added to bill!`)
  }, [scanResults, selectedIds, onScanComplete, handleOpenChange])

  // Retry scan (reset results but keep image)
  const handleRetry = useCallback(() => {
    setScanResults(null)
    setSelectedIds(new Set())
  }, [])

  // Remove image and start over
  const handleReset = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setFile(null)
    setPreview(null)
    setScanResults(null)
    setSelectedIds(new Set())
  }, [preview])

  const hasSelection = selectedIds.size > 0
  const allSelected =
    scanResults?.medicines && scanResults.medicines.length > 0 && selectedIds.size === scanResults.medicines.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 border-border/60">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-teal-50 via-emerald-50/50 to-transparent dark:from-teal-950/30 dark:via-emerald-950/10 dark:to-transparent border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">AI Prescription Scanner</h3>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Upload or capture a prescription image
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              AI-powered prescription scanner to extract medicines from prescription images
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!preview ? (
            /* Upload Area */
            <div className="flex-1 p-6">
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'relative flex flex-col items-center justify-center min-h-[280px] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group',
                  isDragging
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 scale-[1.01]'
                    : 'border-muted-foreground/25 hover:border-teal-400/50 hover:bg-teal-50/20 dark:hover:bg-teal-950/10'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 dark:from-teal-500/10 dark:to-emerald-500/10" />

                <div className="relative flex flex-col items-center gap-4 p-6">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300',
                      isDragging
                        ? 'bg-teal-100 dark:bg-teal-900/50 scale-110'
                        : 'bg-muted group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 group-hover:scale-105'
                    )}
                  >
                    <Upload
                      className={cn(
                        'h-8 w-8 transition-colors duration-300',
                        isDragging
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-muted-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400'
                      )}
                    />
                  </div>

                  <div className="text-center space-y-1.5">
                    <p className="font-medium text-sm">
                      {isDragging ? 'Drop your image here' : 'Upload Prescription Image'}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[260px]">
                      Drag & drop an image, or click to browse. Supports JPEG, PNG, GIF, WebP
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Browse Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        cameraInputRef.current?.click()
                      }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Take Photo
                    </Button>
                  </div>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            </div>
          ) : !scanResults ? (
            /* Preview + Scan Button */
            <div className="flex-1 p-6 flex flex-col gap-4">
              {/* Image preview */}
              <div className="relative flex-shrink-0 mx-auto w-full max-w-[320px]">
                <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-lg shadow-black/5">
                  <img
                    src={preview}
                    alt="Prescription preview"
                    className="w-full h-auto max-h-[300px] object-contain bg-white"
                  />
                </div>
                <button
                  onClick={handleReset}
                  className="absolute -top-2 -right-2 flex items-center justify-center w-7 h-7 rounded-full bg-destructive text-white shadow-lg hover:bg-destructive/90 transition-colors"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* File info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mx-auto">
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{file?.name}</span>
                {file && (
                  <span className="shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>

              {/* Scan button */}
              <div className="mt-auto">
                <Button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full h-12 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all duration-200"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Analyzing Prescription...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>Scan Prescription</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Scanning animation overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-2xl z-10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-teal-200 dark:border-teal-800" />
                      <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-teal-500 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        AI is analyzing your prescription
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Extracting medicine names, dosages & quantities
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Results View */
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Scan metadata */}
              {scanResults.doctor_name && (
                <div className="px-6 pt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Doctor: <strong className="text-foreground">{scanResults.doctor_name}</strong></span>
                  {scanResults.patient_name && (
                    <>
                      <span className="text-border">|</span>
                      <span>Patient: <strong className="text-foreground">{scanResults.patient_name}</strong></span>
                    </>
                  )}
                </div>
              )}

              {/* Medicine list */}
              <div className="flex-1 overflow-hidden px-4 py-3">
                {scanResults.success && scanResults.medicines.length > 0 ? (
                  <div className="space-y-1.5">
                    {/* Select all header */}
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <button
                        onClick={toggleAll}
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          className="size-3.5"
                        />
                        <span>Select All</span>
                      </button>
                      <Badge variant="secondary" className="text-[10px] h-5 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                        {selectedIds.size} / {scanResults.medicines.length} selected
                      </Badge>
                    </div>

                    <ScrollArea className="max-h-[280px] scroll-container">
                      <div className="space-y-1.5 pr-1">
                        {scanResults.medicines.map((med, index) => (
                          <div
                            key={med.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-1',
                              selectedIds.has(med.id)
                                ? 'border-teal-200 bg-teal-50/50 dark:border-teal-800/50 dark:bg-teal-950/20 shadow-sm'
                                : 'border-border/50 hover:border-border hover:bg-muted/30'
                            )}
                            onClick={() => toggleSelection(med.id)}
                          >
                            <Checkbox
                              checked={selectedIds.has(med.id)}
                              onCheckedChange={() => toggleSelection(med.id)}
                              className="mt-0.5 size-4 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Pill className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                                <p className="font-medium text-sm truncate">{med.name}</p>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                                {med.dosage && (
                                  <span className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                                      {med.dosage}
                                    </Badge>
                                  </span>
                                )}
                                <span>Qty: <strong className="text-foreground">{med.quantity}</strong></span>
                              </div>
                              {med.notes && (
                                <p className="text-[11px] text-muted-foreground mt-1 truncate italic">
                                  {med.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                              #{index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  /* No results or error */
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        {scanResults.error || 'No medicines detected'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                        Try uploading a clearer image or a different prescription.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 bg-muted/20 px-6 py-4 rounded-b-2xl">
          {!scanResults ? (
            /* Footer when no results yet */
            <div className="flex justify-between items-center">
              {preview ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-muted-foreground text-xs"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                    Different Image
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    AI-powered analysis
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Powered by AI Vision
                </div>
              )}
            </div>
          ) : (
            /* Footer with actions */
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="flex-1"
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                Re-scan
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                New Image
              </Button>
              {scanResults.success && scanResults.medicines.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAddToBill}
                  disabled={!hasSelection}
                  className="flex-[2] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Add {hasSelection ? selectedIds.size : 0} to Bill
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
