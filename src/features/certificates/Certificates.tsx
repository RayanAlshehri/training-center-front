import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { ModalState } from '../../app/types'
import { certificateStatuses, type Certificate, type CertificateSettings, type GenerateCertificateRequest, type Trainee, type VerifyCertificateResult } from '../../types'
import { Alert, Combobox, DataTable, Field, Pagination, PanelHeader, RowActions, SearchInput, Select, StatusBadge } from '../../components/ui'
import { usePagedData, useReferenceData } from '../../shared/hooks'
import { certificatePageFrom, formatDate, normalizeCertificate, normalizeTrainees, numberField, personName, recordFrom, today } from '../../shared/helpers'
import { optionFromCode, optionFromName } from '../../shared/helpers'

export function CertificatesArea({
  onNavigate,
  path,
  onModal,
  refreshToken,
  onRefresh,
}: {
  onNavigate: (path: string) => void
  path: string
  onModal: (modal: ModalState) => void
  refreshToken: number
  onRefresh: () => void
}) {
  const normalizedPath = path.replace(/\/$/, '')
  const detailMatch = normalizedPath.match(/^\/certificates\/(\d+)$/)

  if (normalizedPath === '/certificates/new') {
    return <GenerateCertificatePage onNavigate={onNavigate} />
  }

  if (detailMatch) {
    return (
      <CertificateDetailsPage
        id={Number(detailMatch[1])}
        onNavigate={onNavigate}
        onModal={onModal}
        refreshToken={refreshToken}
      />
    )
  }

  return <CertificatesPage onNavigate={onNavigate} onModal={onModal} refreshToken={refreshToken} onRefresh={onRefresh} />
}

export function CertificatesPage({
  onNavigate,
  onModal,
  refreshToken,
  onRefresh,
}: {
  onNavigate: (path: string) => void
  onModal: (modal: ModalState) => void
  refreshToken: number
  onRefresh: () => void
}) {
  const refs = useReferenceData(refreshToken, true, ['courses', 'batches'])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [courseId, setCourseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState('')
  const { data, loading, error } = usePagedData<Certificate>(
    () => api.certificates.list({ search, status, courseId, batchId, page, pageSize: 20 }).then(certificatePageFrom),
    [search, status, courseId, batchId, page, refreshToken],
  )

  const resetPage = (work: () => void) => {
    work()
    setPage(1)
  }

  const download = async (item: Certificate) => {
    setActionError('')
    try {
      await downloadCertificate(item)
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const columns = ['Certificate number', 'Trainee name', 'Course name', 'Batch code', 'Issue date', 'Status', 'Actions']

  return (
    <section className="panel">
      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(value) => resetPage(() => setSearch(value))}
          placeholder="Certificate number or trainee name"
        />
        <Select
          value={status}
          onChange={(value) => resetPage(() => setStatus(value))}
          label="Status"
          options={certificateStatuses.map((item) => ({ value: item, label: item }))}
        />
        <Combobox
          value={courseId}
          onChange={(value) => resetPage(() => setCourseId(value))}
          label="Course"
          options={refs.courses.map(optionFromName)}
          allLabel="All courses"
        />
        <Combobox
          value={batchId}
          onChange={(value) => resetPage(() => setBatchId(value))}
          label="Batch"
          options={refs.batches.map(optionFromCode)}
          allLabel="All batches"
        />
      </div>
      {refs.error && <Alert tone="error" message={refs.error} />}
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      <DataTable
        loading={loading}
        emptyText={search || status || courseId || batchId ? 'No certificates match the current filters.' : 'No certificates issued yet.'}
        columns={columns}
        rows={data.items.map((item) => [
          <strong>{item.certificateNumber || '-'}</strong>,
          item.traineeName || '-',
          item.courseName || '-',
          item.batchCode || '-',
          formatDate(item.issueDate),
          <StatusBadge value={item.status} />,
          <RowActions
            actions={[
              { label: 'View details', onClick: () => onNavigate(`/certificates/${item.id}`) },
              { label: 'Download PDF', onClick: () => void download(item) },
              {
                label: 'Revoke',
                danger: true,
                disabled: item.status === 'Revoked',
                onClick: () => onModal({ type: 'revokeCertificate', item }),
              },
            ]}
          />,
        ])}
      />
      <Pagination data={data} onPage={setPage} />
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={() => onNavigate('/certificates/new')}>
          Generate certificate
        </button>
        <button className="ghost-button" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </section>
  )
}

export function GenerateCertificatePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const refs = useReferenceData('generate-certificate', true, ['batches', 'courses'])
  const [batchId, setBatchId] = useState('')
  const [traineeId, setTraineeId] = useState('')
  const [completionDate, setCompletionDate] = useState(today())
  const [trainingHours, setTrainingHours] = useState('')
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [traineesLoading, setTraineesLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<Certificate | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selectedBatch = refs.batches.find((item) => String(item.id) === batchId)
  const selectedCourse = selectedBatch ? refs.courses.find((item) => item.id === selectedBatch.courseId) : undefined

  useEffect(() => {
    setTraineeId('')
    setGenerated(null)
    if (!selectedBatch) {
      setTrainees([])
      setTrainingHours('')
      return
    }

    setTrainingHours(
      String(
        numberField(recordFrom(selectedBatch), 'trainingHours', 'TrainingHours', 'durationHours', 'DurationHours') ||
          selectedCourse?.durationHours ||
          '',
      ),
    )
    setTraineesLoading(true)
    setError('')
    api.batches
      .trainees(selectedBatch.id)
      .then((items) => setTrainees(normalizeTrainees(items)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setTraineesLoading(false))
  }, [selectedBatch?.id, selectedCourse?.durationHours])

  const canSubmit = Boolean(batchId && traineeId && completionDate) && !submitting

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setMessage('')
    setError('')
    setGenerated(null)
    try {
      const body: GenerateCertificateRequest = {
        batchId: Number(batchId),
        traineeId: Number(traineeId),
        completionDate,
        trainingHours: trainingHours ? Number(trainingHours) : undefined,
      }
      const result = normalizeCertificate(await api.certificates.generate(body))
      if (result) {
        setGenerated(result)
        setMessage('Certificate generated successfully.')
      } else {
        setMessage('Certificate generated successfully.')
      }
    } catch (err) {
      setError(certificateFriendlyError(err as Error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <PanelHeader title="Generate certificate" actionLabel="Back to certificates" onAction={() => onNavigate('/certificates')} />
      {refs.error && <Alert tone="error" message={refs.error} />}
      {message && <Alert tone="success" message={message} />}
      {error && <Alert tone="error" message={error} />}
      <form className="record-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Batch">
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)} required>
              <option value="" disabled>Select batch</option>
              {refs.batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code} - {batch.courseName || 'Course'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trainee">
            <select value={traineeId} onChange={(event) => setTraineeId(event.target.value)} required disabled={!batchId || traineesLoading}>
              <option value="" disabled>{traineesLoading ? 'Loading trainees...' : 'Select trainee'}</option>
              {trainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {personName(trainee)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Completion date">
            <input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} required />
          </Field>
          <Field label="Training hours">
            <input type="number" min="0" value={trainingHours} onChange={(event) => setTrainingHours(event.target.value)} />
          </Field>
        </div>
        {selectedBatch && (
          <dl className="detail-list">
            <div><dt>Course</dt><dd>{selectedBatch.courseName || '-'}</dd></div>
            <div><dt>Batch code</dt><dd>{selectedBatch.code}</dd></div>
            <div><dt>Default hours</dt><dd>{trainingHours || '-'}</dd></div>
          </dl>
        )}
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {submitting ? 'Generating...' : 'Generate certificate'}
          </button>
          {generated && (
            <>
              <button className="secondary-button" type="button" onClick={() => onNavigate(`/certificates/${generated.id}`)}>
                View details
              </button>
              <button className="ghost-button" type="button" onClick={() => void downloadCertificate(generated)}>
                Download PDF
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  )
}

export function CertificateDetailsPage({
  id,
  onNavigate,
  onModal,
  refreshToken,
}: {
  id: number
  onNavigate: (path: string) => void
  onModal: (modal: ModalState) => void
  refreshToken: number
}) {
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.certificates
      .get(id)
      .then((result) => setCertificate(normalizeCertificate(result)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, refreshToken])

  const verificationLink = certificate?.verificationUrl || (certificate?.verificationToken ? `${window.location.origin}/verify/${certificate.verificationToken}` : '')

  return (
    <section className="panel">
      <PanelHeader title="Certificate details" actionLabel="Back to certificates" onAction={() => onNavigate('/certificates')} />
      {loading && <div className="state-box">Loading certificate...</div>}
      {error && <Alert tone="error" message={error} />}
      {actionError && <Alert tone="error" message={actionError} />}
      {certificate && (
        <div className="profile-view">
          <div className="profile-heading">
            <span className="profile-avatar">CT</span>
            <div>
              <h3>{certificate.certificateNumber || '-'}</h3>
              <p>{certificate.traineeName || '-'}</p>
            </div>
            <StatusBadge value={certificate.status} />
          </div>
          <dl className="detail-list">
            <div><dt>Certificate number</dt><dd>{certificate.certificateNumber || '-'}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge value={certificate.status} /></dd></div>
            <div><dt>Trainee</dt><dd>{certificate.traineeName || '-'}</dd></div>
            <div><dt>Course</dt><dd>{certificate.courseName || '-'}</dd></div>
            <div><dt>Batch</dt><dd>{certificate.batchCode || '-'}</dd></div>
            <div><dt>Training hours</dt><dd>{certificate.trainingHours ?? '-'}</dd></div>
            <div><dt>Completion date</dt><dd>{formatDate(certificate.completionDate)}</dd></div>
            <div><dt>Issue date</dt><dd>{formatDate(certificate.issueDate)}</dd></div>
            <div><dt>Issued by</dt><dd>{certificate.issuedBy || '-'}</dd></div>
            <div><dt>Verification link</dt><dd>{verificationLink ? <a href={verificationLink}>{verificationLink}</a> : '-'}</dd></div>
          </dl>
          {certificate.qrCodeUrl && <img className="certificate-preview" src={certificate.qrCodeUrl} alt="Certificate verification QR code" />}
          {certificate.status === 'Revoked' && (
            <dl className="detail-list">
              <div><dt>Revoked at</dt><dd>{formatDate(certificate.revokedAt)}</dd></div>
              <div><dt>Revoked by</dt><dd>{certificate.revokedBy || '-'}</dd></div>
              <div><dt>Revocation reason</dt><dd>{certificate.revocationReason || '-'}</dd></div>
            </dl>
          )}
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void downloadCertificate(certificate).catch((err: Error) => setActionError(err.message))}
            >
              Download PDF
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={certificate.status !== 'Issued'}
              onClick={() => onModal({ type: 'revokeCertificate', item: certificate })}
            >
              Revoke
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export function CertificateSettingsPage() {
  const [settings, setSettings] = useState<CertificateSettings>({
    centerDisplayName: '',
    certificatePrefix: '',
    defaultCertificateTitle: '',
    signatoryName: '',
    signatoryTitle: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.certificateSettings
      .get()
      .then((result) => setSettings({ ...settings, ...result }))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (key: keyof CertificateSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  const upload = async (kind: 'logo' | 'stamp' | 'signature', file?: File) => {
    if (!file) return
    setMessage('')
    setError('')
    try {
      const result =
        kind === 'logo'
          ? await api.certificateSettings.uploadLogo(file)
          : kind === 'stamp'
            ? await api.certificateSettings.uploadStamp(file)
            : await api.certificateSettings.uploadSignature(file)
      setSettings((current) => ({ ...current, ...result }))
      setMessage(`${kind[0].toUpperCase()}${kind.slice(1)} uploaded.`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const result = await api.certificateSettings.update(settings)
      setSettings((current) => ({ ...current, ...result }))
      setMessage('Certificate settings saved.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <PanelHeader title="Certificate Settings" actionLabel="Reload" onAction={() => window.location.reload()} />
      {loading && <div className="state-box">Loading certificate settings...</div>}
      {message && <Alert tone="success" message={message} />}
      {error && <Alert tone="error" message={error} />}
      {!loading && (
        <form className="record-form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Center display name">
              <input value={settings.centerDisplayName} onChange={(event) => updateField('centerDisplayName', event.target.value)} />
            </Field>
            <Field label="Certificate prefix">
              <input value={settings.certificatePrefix} onChange={(event) => updateField('certificatePrefix', event.target.value)} />
            </Field>
            <Field label="Default certificate title">
              <input value={settings.defaultCertificateTitle} onChange={(event) => updateField('defaultCertificateTitle', event.target.value)} />
            </Field>
            <Field label="Signatory name">
              <input value={settings.signatoryName} onChange={(event) => updateField('signatoryName', event.target.value)} />
            </Field>
            <Field label="Signatory title">
              <input value={settings.signatoryTitle} onChange={(event) => updateField('signatoryTitle', event.target.value)} />
            </Field>
          </div>
          <div className="asset-grid">
            <AssetUpload label="Logo upload" imageUrl={settings.logoUrl} onUpload={(file) => void upload('logo', file)} />
            <AssetUpload label="Stamp upload" imageUrl={settings.stampUrl} onUpload={(file) => void upload('stamp', file)} />
            <AssetUpload label="Signature upload" imageUrl={settings.signatureUrl} onUpload={(file) => void upload('signature', file)} />
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export function AssetUpload({ label, imageUrl, onUpload }: { label: string; imageUrl?: string | null; onUpload: (file?: File) => void }) {
  return (
    <div className="asset-upload">
      <Field label={label}>
        <input type="file" accept="image/*" onChange={(event) => onUpload(event.target.files?.[0])} />
      </Field>
      {imageUrl ? <img src={imageUrl} alt={`${label} preview`} /> : <span className="muted">No image uploaded</span>}
    </div>
  )
}

export function PublicVerificationPage({ token }: { token: string }) {
  const [result, setResult] = useState<VerifyCertificateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    setNotFound(false)
    api.certificates
      .verifyPublic(token)
      .then((value) => {
        if (!value || value.status === 'NotFound') {
          setNotFound(true)
          return
        }
        setResult(value)
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 404) setNotFound(true)
        else setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [token])

  const centerName = result?.trainingCenterName || result?.centerDisplayName || '-'
  const isRevoked = result?.status === 'Revoked'

  return (
    <main className="verify-page">
      <section className="verify-card">
        <div className="brand">
          <span className="brand-mark">TC</span>
          <div>
            <strong>Certificate Verification</strong>
            <span>Training Ops</span>
          </div>
        </div>
        {loading && <div className="state-box">Verifying certificate...</div>}
        {notFound && <Alert tone="warning" message="Certificate not found." />}
        {error && <Alert tone="error" message={error} />}
        {result && (
          <div className="profile-view">
            <div className="profile-heading">
              <span className="profile-avatar">CT</span>
              <div>
                <h3>{result.certificateNumber || '-'}</h3>
                <p>{centerName}</p>
              </div>
              <StatusBadge value={result.status} />
            </div>
            {isRevoked && <Alert tone="warning" message="This certificate has been revoked." />}
            <dl className="detail-list">
              <div><dt>Certificate status</dt><dd><StatusBadge value={result.status} /></dd></div>
              <div><dt>Certificate number</dt><dd>{result.certificateNumber || '-'}</dd></div>
              <div><dt>Training center</dt><dd>{centerName}</dd></div>
              <div><dt>Trainee name</dt><dd>{result.traineeName || '-'}</dd></div>
              <div><dt>Course name</dt><dd>{result.courseName || '-'}</dd></div>
              <div><dt>Training hours</dt><dd>{result.trainingHours ?? '-'}</dd></div>
              <div><dt>Completion date</dt><dd>{formatDate(result.completionDate)}</dd></div>
              <div><dt>Issue date</dt><dd>{formatDate(result.issueDate)}</dd></div>
            </dl>
          </div>
        )}
      </section>
    </main>
  )
}

export function RevokeCertificateForm({ certificate, onSubmit }: { certificate: Certificate; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const trimmedReason = reason.trim()

  return (
    <form
      className="record-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!trimmedReason) return
        onSubmit(trimmedReason)
      }}
    >
      <Alert tone="warning" message={`Revoking ${certificate.certificateNumber || 'this certificate'} cannot be undone from this screen.`} />
      <Field label="Revocation reason">
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} required />
      </Field>
      <div className="form-actions">
        <button className="danger-button" type="submit" disabled={!trimmedReason}>
          Revoke certificate
        </button>
      </div>
    </form>
  )
}

export async function downloadCertificate(certificate: Certificate) {
  const blob = await api.certificates.download(certificate.id)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${certificate.certificateNumber || `certificate-${certificate.id}`}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

export function certificateFriendlyError(error: Error) {
  const text = error.message || 'Unable to generate certificate.'
  const normalized = text.toLowerCase()
  if (normalized.includes('duplicate') || normalized.includes('already')) {
    return 'A certificate already exists for this trainee and batch.'
  }
  if (normalized.includes('enrolled') || normalized.includes('enrol')) {
    return 'The selected trainee is not enrolled in this batch.'
  }
  if (normalized.includes('revoked')) {
    return 'This certificate has been revoked.'
  }
  return text
}

