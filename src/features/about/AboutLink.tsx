import { Icon } from '../../icons/Icon.tsx'
import { setAboutOpen } from './aboutOpen.ts'
import './About.css'

/** The profile menu's way into the about dialog. */
export default function AboutLink() {
  return (
    <div className="mv-settings-section">
      <button
        type="button"
        className="mv-about-link"
        aria-haspopup="dialog"
        onClick={() => setAboutOpen(true)}
      >
        <Icon name="info" size={18} />
        Hakkında ve gizlilik
      </button>
    </div>
  )
}
