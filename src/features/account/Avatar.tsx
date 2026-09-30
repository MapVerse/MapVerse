import { Icon } from '../../icons/Icon.tsx'
import { initials, type Profile } from './profile.ts'

type Props = { profile: Profile | null; size: number }

/** The profile photo, else initials on the brand yellow, else a person. */
export default function Avatar({ profile, size }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  if (profile?.photo) {
    return (
      <img className="mv-avatar" src={profile.photo} alt="" style={style} />
    )
  }
  if (profile) {
    return (
      <span className="mv-avatar mv-avatar-initials" style={style}>
        {initials(profile.name)}
      </span>
    )
  }
  return (
    <span className="mv-avatar mv-avatar-guest" style={style}>
      <Icon name="user" size={Math.round(size * 0.5)} />
    </span>
  )
}
