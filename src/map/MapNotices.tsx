import './MapNotices.css'

/**
 * Small notes over the bottom of the map, in the way of nothing: that the
 * browser is offline, or that the map's data could not be loaded.
 */
export default function MapNotices({
  online,
  dataFailed,
  onDismiss,
}: {
  online: boolean
  dataFailed: boolean
  onDismiss: () => void
}) {
  return (
    <div className="mv-notices" role="status" aria-live="polite">
      {!online ? (
        <p className="mv-notice mv-glass">
          <span className="mv-notice-dot is-offline" aria-hidden="true" />
          Çevrimdışısınız. Bağlantı gelince harita güncellenecek.
        </p>
      ) : (
        dataFailed && (
          <p className="mv-notice mv-glass">
            <span className="mv-notice-dot" aria-hidden="true" />
            Harita verileri yüklenemedi.
            <button type="button" onClick={onDismiss} aria-label="Kapat">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </p>
        )
      )}
    </div>
  )
}
