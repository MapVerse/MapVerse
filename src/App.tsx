import ErrorBoundary from './app/ErrorBoundary.tsx'
import AboutDialog from './features/about/AboutDialog.tsx'
import MapView from './map/MapView.tsx'
import UpdateToast from './pwa/UpdateToast.tsx'

export default function App() {
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
