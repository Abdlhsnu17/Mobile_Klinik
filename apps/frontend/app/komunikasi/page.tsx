"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataPagination, useDataPagination } from "@/components/data-pagination"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data"
import { useToast } from "@/hooks/use-toast"
import {
  markNotificationAsSent,
  schedulePatientNotification,
  submitSatisfactionSurvey,
} from "@/lib/clinic-utils"
import type { Patient, PatientNotification, SatisfactionSurvey } from "@/lib/auth-types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, MessageSquareText } from "lucide-react"

export default function KomunikasiPage() {
  const { toast } = useToast()
  const {
    data: patients,
    loading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients,
  } = useClinicData<Patient>("patients")
  const {
    data: notifications,
    loading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useClinicData<PatientNotification>("patient-notifications")
  const {
    data: surveys,
    loading: surveysLoading,
    error: surveysError,
    refetch: refetchSurveys,
  } = useClinicData<SatisfactionSurvey>("satisfaction-surveys")

  const [notifForm, setNotifForm] = useState<Partial<PatientNotification>>({
    patientId: "",
    patientName: "",
    channel: "whatsapp",
    message: "",
    targetAt: new Date().toISOString().split("T")[0],
  })
  const [surveyForm, setSurveyForm] = useState<Partial<SatisfactionSurvey>>({
    patientId: "",
    patientName: "",
    rating: 5,
    comments: "",
  })
  const notificationPagination = useDataPagination(notifications)
  const surveyPagination = useDataPagination(surveys)

  const handleSchedule = async () => {
    try {
      await schedulePatientNotification({
        ...notifForm,
        patientName: notifForm.patientName ?? "Pasien",
        message: notifForm.message ?? "",
      })
      toast({
        title: "Berhasil Dijadwalkan",
        description: "Pengingat notifikasi pasien telah dijadwalkan.",
      })
      setNotifForm({
        patientId: "",
        patientName: "",
        channel: "whatsapp",
        message: "",
        targetAt: new Date().toISOString().split("T")[0],
      })
    } catch (error) {
      console.error("Gagal menjadwalkan notifikasi", error)
      toast({
        title: "Gagal Menjadwalkan Notifikasi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menjadwalkan notifikasi.",
        variant: "destructive",
      })
    }
    await refetchNotifications()
  }

  const handleMarkSent = async (id: string) => {
    try {
      await markNotificationAsSent(id)
      toast({
        title: "Notifikasi Terkirim",
        description: "Provider telah menerima notifikasi pasien.",
      })
    } catch (error) {
      console.error("Gagal menandai notifikasi terkirim", error)
      toast({
        title: "Gagal Memperbarui Notifikasi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui notifikasi.",
        variant: "destructive",
      })
    }
    await refetchNotifications()
  }

  const handleSurveySubmit = async () => {
    try {
      await submitSatisfactionSurvey({
        ...surveyForm,
        patientName: surveyForm.patientName ?? "Pasien",
        rating: surveyForm.rating ?? 5,
      })
      toast({
        title: "Berhasil Dikirim",
        description: "Survei kepuasan pasien telah tersimpan.",
      })
      setSurveyForm({ patientId: "", patientName: "", rating: 5, comments: "" })
    } catch (error) {
      console.error("Gagal mengirim survei kepuasan", error)
      toast({
        title: "Gagal Mengirim Survei",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim survei.",
        variant: "destructive",
      })
    }
    await refetchSurveys()
  }

  const loading = patientsLoading || notificationsLoading || surveysLoading
  const error = patientsError ?? notificationsError ?? surveysError
  const refetchAll = async () => {
    await Promise.all([refetchPatients(), refetchNotifications(), refetchSurveys()])
  }

  if (loading) return <DataLoading />
  if (error) return <DataError error={error} onRetry={refetchAll} />

  return (
    <div className="space-y-6">
      <Tabs defaultValue="notifications">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifikasi Pasien
          </TabsTrigger>
          <TabsTrigger value="surveys">
            <MessageSquareText className="mr-2 h-4 w-4" />
            Survei Kepuasan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifikasi Pengingat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pasien</Label>
              <Select
                value={notifForm.patientId}
                onValueChange={(value) => {
                  const patient = patients.find((item) => item.id === value)
                  setNotifForm({ ...notifForm, patientId: value, patientName: patient?.name ?? "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pasien" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.noRM})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                value={notifForm.channel}
                onValueChange={(value) => setNotifForm({ ...notifForm, channel: value as PatientNotification["channel"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pesan</Label>
              <Textarea
                rows={2}
                value={notifForm.message}
                onChange={(event) => setNotifForm({ ...notifForm, message: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Target Waktu</Label>
              <Input
                type="datetime-local"
                value={notifForm.targetAt}
                onChange={(event) => setNotifForm({ ...notifForm, targetAt: event.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSchedule}>Jadwalkan Pengingat</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Notifikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail pengiriman</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationPagination.paginatedItems.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>{notification.patientName}</TableCell>
                    <TableCell>{notification.channel}</TableCell>
                    <TableCell>{notification.targetAt}</TableCell>
                    <TableCell>{notification.status}</TableCell>
                    <TableCell className="max-w-xs text-xs">
                      {notification.sentAt
                        ? `Terkirim ${notification.sentAt}`
                        : notification.lastError ?? `Percobaan: ${notification.attempts ?? 0}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={notification.status === "sent" || notification.status === "processing"}
                        onClick={() => void handleMarkSent(notification.id)}
                      >
                        {notification.status === "failed" ? "Coba lagi" : "Kirim sekarang"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={notificationPagination.page} totalItems={notificationPagination.totalItems} totalPages={notificationPagination.totalPages} onPageChange={notificationPagination.setPage} itemLabel="notifikasi" />
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="surveys" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Survei Kepuasan Pasien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pasien</Label>
              <Select
                value={surveyForm.patientId}
                onValueChange={(value) => {
                  const patient = patients.find((item) => item.id === value)
                  setSurveyForm({ ...surveyForm, patientId: value, patientName: patient?.name ?? "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pasien" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.noRM})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rating</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={surveyForm.rating}
                onChange={(event) => setSurveyForm({ ...surveyForm, rating: Number(event.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Komentar</Label>
            <Textarea
              rows={2}
              value={surveyForm.comments}
              onChange={(event) => setSurveyForm({ ...surveyForm, comments: event.target.value })}
            />
          </div>
          <Button onClick={handleSurveySubmit}>Kirim Survei</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Survei</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Komentar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveyPagination.paginatedItems.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell>{survey.patientName}</TableCell>
                    <TableCell>{survey.rating}</TableCell>
                    <TableCell>{survey.comments ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={surveyPagination.page} totalItems={surveyPagination.totalItems} totalPages={surveyPagination.totalPages} onPageChange={surveyPagination.setPage} itemLabel="survei" />
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
