import ErrorBoundary from './app/ErrorBoundary.tsx'
import AboutDialog from './features/about/AboutDialog.tsx'
import MapView from './map/MapView.tsx'
import { useLocale } from './i18n/index.ts'
import UpdateToast from './pwa/UpdateToast.tsx'

export default function App() {
  // Everything draws again in another language as it is picked
  useLocale()
  return (
    <>
      <ErrorBoundary>
        <MapView />
      </ErrorBoundary>
      <AboutDialog />
      <UpdateToast />
    </>
  )
}
