import * as React from "react"

export function GoogleIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12s3.36-7.27 7.69-7.27c2.25 0 3.9.94 5.08 2.07l2.2-2.13C18.3 2.78 15.79 1 12.69 1 6.38 1 1.23 5.62 1.23 12s5.15 11 11.46 11c6.31 0 10.85-4.62 10.85-11.33 0-.76-.08-1.48-.19-2.13z"
        fill="#4285F4"
      />
      <path
        d="M3.15 7.26l2.52 1.93c.95-2.61 2.99-4.61 6.02-4.61 1.88 0 3.42.71 4.68 1.87l2.2-2.13C16.96 2.43 15.13 1.32 12.69 1.32 7.73 1.32 3.49 4.23 3.15 7.26z"
        fill="#EA4335"
      />
      <path
        d="M12 21.34c3.19 0 5.77-1.59 7.35-4.35l-2.2-1.93c-1.06.81-2.42 1.58-4.05 1.58-3.37 0-6.15-2.55-7.18-6.04l-2.52 1.93C4.34 16.12 7.75 21.34 12 21.34z"
        fill="#34A853"
      />
      <path
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44 3.19 0 5.77-1.59 7.35-4.35l2.2-1.93z"
        fill="#FBBC05"
      />
    </svg>
  )
}
