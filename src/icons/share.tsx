// src/icons/share.tsx
export function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      class={`size-6`}
    >
      {/* Tray */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 14.25v4.5A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75v-4.5"
      />
      {/* Arrow up (share) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v11.25m0-11.25L7.5 7.5M12 3l4.5 4.5"
      />
    </svg>
  );
}

