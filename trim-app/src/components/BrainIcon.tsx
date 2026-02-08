interface BrainIconProps {
  isExpanded: boolean;
  className?: string;
}

export default function BrainIcon({ isExpanded, className = '' }: BrainIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        opacity: isExpanded ? 1 : 0.6,
        transition: 'opacity 180ms ease-in-out',
      }}
    >
      {/* Left hemisphere outline */}
      <path d="M12 3C10.5 3 9 2.5 7.5 3.5C6 4.5 5.5 6 6 7C4.5 7.5 3.5 9 3.5 10.5C3.5 12 4 13 5 13.5C4 14.5 3.5 16 4 17.5C4.5 19 6 20 7.5 20C8.5 21 10 21.5 12 21" />

      {/* Right hemisphere outline */}
      <path d="M12 3C13.5 3 15 2.5 16.5 3.5C18 4.5 18.5 6 18 7C19.5 7.5 20.5 9 20.5 10.5C20.5 12 20 13 19 13.5C20 14.5 20.5 16 20 17.5C19.5 19 18 20 16.5 20C15.5 21 14 21.5 12 21" />

      {/* Internal details — fade in when expanded */}
      <g
        style={{
          opacity: isExpanded ? 0.55 : 0,
          transition: 'opacity 180ms ease-in-out',
        }}
      >
        {/* Central fissure */}
        <path d="M12 5V19" strokeWidth="1" />

        {/* Left hemisphere connections */}
        <path d="M6 7C7.5 7.5 10 8 12 9" strokeWidth="1" />
        <path d="M5 13.5C7 13 9.5 13 12 13.5" strokeWidth="1" />
        <path d="M7.5 20C8 18 10 17 12 17" strokeWidth="1" />

        {/* Right hemisphere connections */}
        <path d="M18 7C16.5 7.5 14 8 12 9" strokeWidth="1" />
        <path d="M19 13.5C17 13 14.5 13 12 13.5" strokeWidth="1" />
        <path d="M16.5 20C16 18 14 17 12 17" strokeWidth="1" />

        {/* Neural nodes */}
        <circle cx="7" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="17" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="17" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="17" r="0.7" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
