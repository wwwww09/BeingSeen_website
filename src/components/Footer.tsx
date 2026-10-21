import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer">
      <span>
        Being Seen — a serious game about gravitational lensing and the things we
        nearly miss.
      </span>
      <span>
        <Link href="/lensing-supernovae">
          The Science
        </Link>
        {' · '}
        <Link href="/the-unseen">The Unseen</Link>
        {' · '}
        <Link href="/about">About</Link>
      </span>
    </footer>
  )
}
