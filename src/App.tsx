import ErrorBoundary from './app/ErrorBoundary.tsx'
import MapView from './map/MapView.tsx'

export default function App() {
  return (
    <ErrorBoundary>
      <MapView />
    </ErrorBoundary>
  )
}
