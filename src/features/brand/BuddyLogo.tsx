interface BuddyLogoProps {
  className?: string;
}

export default function BuddyLogo({ className = "" }: BuddyLogoProps) {
  return (
    <span aria-label="Buddy" className={`buddy-logo ${className}`} role="img">
      <span aria-hidden="true" className="buddy-logo-mark" />
      <span aria-hidden="true" className="buddy-logo-checker" />
    </span>
  );
}
