"use client"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import { buildApiBaseUrl } from "@/lib/api-base";
import type { DocumentCategory, DocumentUpload } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import { deleteDocument, formatBytes, formatDate, uploadDocument } from "@/lib/clinic-utils";
import { downloadWithAuth, openWithAuth } from "@/lib/download-with-auth";
import { AlertTriangle, Download, Eye, FileText, Trash, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "laporan-barang-masuk", label: "Laporan Barang Masuk" },
  { value: "berita-surat-masuk", label: "Berita Surat Masuk" },
  { value: "komunikasi-antar-unit", label: "Komunikasi Antar Unit" },
  { value: "lainnya", label: "Lainnya" },
]

const ALL_CATEGORY_FILTER_VALUE = "semua-kategori"

const DOCUMENT_API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

const formatCategoryLabel = (value: DocumentCategory) =>
  DOCUMENT_CATEGORIES.find((item) => item.value === value)?.label ?? value

const allowedRoles = ["admin"]

export default function UnggahanPage() {
  const router = useRouter()
  const { toast } = useToast()
  const user = getCurrentUser()
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | typeof ALL_CATEGORY_FILTER_VALUE>(
    ALL_CATEGORY_FILTER_VALUE,
  )
  const { data: documents = [], loading, error, refetch: loadDocuments } = useClinicData<DocumentUpload>(
    filterCategory === ALL_CATEGORY_FILTER_VALUE ? "documents" : `documents?category=${filterCategory}`,
    filterCategory
  )

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [patientId, setPatientId] = useState("")
  const [medicalRecordId, setMedicalRecordId] = useState("")
  const [labOrderId, setLabOrderId] = useState("")
  const [insuranceClaimId, setInsuranceClaimId] = useState("")
  const [category, setCategory] = useState<DocumentCategory>(DOCUMENT_CATEGORIES[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("unggah-dokumen")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<DocumentUpload | null>(null)
  const documentPagination = useDataPagination(documents)

  const downloadUrl = (id: string) => `${DOCUMENT_API_BASE}/documents/${id}/download`
  const viewUrl = (id: string) => `${DOCUMENT_API_BASE}/documents/${id}/view`
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!user || !allowedRoles.includes(user.role)) {
      router.push("/dashboard")
    }
  }, [router, user])

  const openDeleteDialog = (document: DocumentUpload) => {
    setDocumentToDelete(document)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteDocument = useCallback(async () => {
    if (!documentToDelete) return
    try {
      await deleteDocument(documentToDelete.id)
      toast({
        title: "Unggahan dihapus",
        description: "Dokumen telah dihapus dan tidak lagi tersedia.",
      })
      await loadDocuments()
      setActiveTab("hasil-unggah")
    } catch (err) {
      console.error("Gagal menghapus unggahan:", err)
      toast({
        title: "Gagal menghapus unggahan",
        description: "Dokumen belum dapat dihapus. Muat ulang daftar lalu coba lagi.",
        variant: "destructive",
      })
    } finally {
      // Selalu tutup dialog setelah operasi selesai
      setIsDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }, [loadDocuments, toast, documentToDelete])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPatientId("")
    setMedicalRecordId("")
    setLabOrderId("")
    setInsuranceClaimId("")
    setCategory(DOCUMENT_CATEGORIES[0].value)
    setFile(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setUploadError("Pilih file terlebih dahulu")
      return
    }

    setUploadError(null)
    setIsUploading(true)
    try {
      await uploadDocument({
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        patientId: patientId.trim() || undefined,
        medicalRecordId: medicalRecordId.trim() || undefined,
        labOrderId: labOrderId.trim() || undefined,
        insuranceClaimId: insuranceClaimId.trim() || undefined,
        file,
        uploader: user?.name ?? user?.username,
      })

      resetForm()
      toast({
        title: "Dokumen berhasil diunggah",
        description: "File bisa diunduh dan dilihat kembali dari daftar di bawah.",
      })
      await loadDocuments()
    } catch (err) {
      console.error("Gagal mengunggah dokumen:", err)
      setUploadError("Dokumen belum dapat diunggah. Pastikan file sesuai ketentuan lalu coba lagi.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Unggahan Dokumen</h1>
        <p className="text-muted-foreground text-sm">
          Kelola berkas laporan barang masuk, berita surat masuk antar unit, dan dokumen lain dalam format PDF, Word,
          atau CSV. Setelah diunggah, file langsung tersedia untuk ditinjau atau diunduh.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="unggah-dokumen"          >
            <UploadCloud className="h-4 w-4" />
            Unggah Dokumen
          </TabsTrigger>
          <TabsTrigger
            value="hasil-unggah"          >
            <Download className="h-4 w-4" />
            Hasil Unggah
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unggah-dokumen">
          <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UploadCloud className="size-4" />
            Unggah Dokumen Baru
          </CardTitle>
          <CardDescription>Unggah file maksimal 25 MB dengan metadata yang jelas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="document_title">Judul Dokumen</Label>
              <Input
                id="document_title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Laporan Barang Masuk Februari 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_category">Kategori</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="document_description">Deskripsi singkat (opsional)</Label>
              <Textarea
                id="document_description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Misal: Dokumen diterima dari gudang pusat pada 14 Februari 2026."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_patient_id">ID Pasien (opsional)</Label>
              <Input id="document_patient_id" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="patient-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_medical_record_id">ID Rekam Medis (opsional)</Label>
              <Input id="document_medical_record_id" value={medicalRecordId} onChange={(event) => setMedicalRecordId(event.target.value)} placeholder="medical-record-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_lab_order_id">ID Order Lab (opsional)</Label>
              <Input id="document_lab_order_id" value={labOrderId} onChange={(event) => setLabOrderId(event.target.value)} placeholder="lab-order-..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_insurance_claim_id">ID Klaim Asuransi (opsional)</Label>
              <Input id="document_insurance_claim_id" value={insuranceClaimId} onChange={(event) => setInsuranceClaimId(event.target.value)} placeholder="claim-..." />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="document_file">Pilih berkas</Label>
              <input
                id="document_file"
                type="file"
                accept=".pdf,.doc,.docx,.csv"
                className="w-full text-sm text-muted-foreground"
                ref={fileInputRef}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Format PDF, Word, dan CSV didukung. Pastikan nama file deskriptif agar mudah dicari.
              </p>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Mengunggah..." : "Unggah Dokumen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hasil-unggah">
          <Card className="space-y-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" />
            Daftar Unggahan
          </CardTitle>
          <CardDescription>
            Pilih kategori untuk memperkecil hasil atau lihat seluruh dokumen yang tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="filter_category" className="text-sm">
                Filter kategori
              </Label>
      <Select
        value={filterCategory}
        onValueChange={(value) => {
          setFilterCategory(value as DocumentCategory | typeof ALL_CATEGORY_FILTER_VALUE)
          documentPagination.resetPage()
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Semua kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORY_FILTER_VALUE}>Semua kategori</SelectItem>
                  {DOCUMENT_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Gunakan tombol aksi untuk melihat pratinjau, mengunduh, atau menghapus dokumen.
            </p>
          </div>

          {loading && <DataLoading message="Memuat daftar dokumen..." />}
          {error && <DataError error={error} onRetry={loadDocuments} />}

          {!loading && !error && (
            <TooltipProvider>
              <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Pengunggah</TableHead>
                    <TableHead>Tanggal Unggah</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Belum ada unggahan untuk kategori ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentPagination.paginatedItems.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            {document.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatCategoryLabel(document.category)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{document.uploader ?? "Sistem"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(document.uploadedAt)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatBytes(document.size)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() =>
                                    openWithAuth(viewUrl(document.id)).catch((error) => {
                                      console.error("Gagal membuka dokumen:", error)
                                      toast({
                                        title: "Gagal membuka dokumen",
                                        description: "Dokumen belum dapat dibuka. Coba unduh atau muat ulang daftar dokumen.",
                                        variant: "destructive",
                                      })
                                    })
                                  }
                                >
                                  <Eye className="size-4" />
                                  <span className="sr-only">Lihat dokumen</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Lihat dokumen</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Separator orientation="vertical" className="h-6" />
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    downloadWithAuth(downloadUrl(document.id), document.originalName).catch(
                                      (error) => {
                                        console.error("Gagal mengunduh dokumen:", error)
                                        toast({
                                          title: "Gagal mengunduh dokumen",
                                          description: "Dokumen belum dapat diunduh. Muat ulang daftar lalu coba lagi.",
                                          variant: "destructive",
                                        })
                                      }
                                    )
                                  }
                                >
                                  <Download className="size-4" />
                                  <span className="sr-only">Unduh dokumen</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Unduh dokumen</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Separator orientation="vertical" className="h-6" />
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!!documentToDelete}
                                  onClick={() => openDeleteDialog(document)}
                                >
                                  <Trash className="size-4 text-destructive" />
                                  <span className="sr-only">
                                    Hapus dokumen
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hapus dokumen</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
              <DataPagination page={documentPagination.page} totalItems={documentPagination.totalItems} totalPages={documentPagination.totalPages} onPageChange={documentPagination.setPage} itemLabel="dokumen" />
            </TooltipProvider>
          )}
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus Unggahan
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus dokumen{" "}
              <span className="font-semibold text-foreground">{documentToDelete?.title}</span>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={!!documentToDelete && documentToDelete.id === documentToDelete?.id}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteDocument} disabled={!documentToDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
