import * as React from 'react';

export function BurgerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M14 13.5V12a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1.5" />
        <path d="M14 8.5V7a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1.5" />
        <path d="M2 12h20" />
        <path d="M6 17h.01" />
        <path d="M11 17h.01" />
        <path d="M16 17h.01" />
        <path d="M18 21a2 2 0 0 0 2-2v-4.5" />
        <path d="M4 21a2 2 0 0 1-2-2v-4.5" />
        </svg>
    )
}
