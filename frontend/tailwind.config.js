/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'wedding-dark': '#000814',
				'wedding-navy': '#001233',
				'wedding-gray': '#808080',
			},
			fontFamily: {
				'display': ['Great Vibes', 'cursive'],
				'script': ['Pinyon Script', 'cursive'],
				'body': ['Playfair Display', 'serif'],
			},
			animation: {
				'sparkle': 'sparkle 2s linear infinite',
				'stars': 'animateStars 100s linear infinite',
				'stars-slow': 'animateStars 150s linear infinite',
				'twinkle': 'twinkle 3s linear infinite',
				'slide-up': 'slideUp 1s ease-out both',
				'fade-in': 'fadeIn 1.5s ease-in',
			},
			keyframes: {
				sparkle: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				animateStars: {
					'from': { transform: 'translateY(0)' },
					'to': { transform: 'translateY(-100%)' },
				},
				twinkle: {
					'0%, 100%': { opacity: '0' },
					'50%': { opacity: '1' },
				},
				slideUp: {
					'from': { opacity: '0', transform: 'translateY(30px)' },
					'to': { opacity: '1', transform: 'translateY(0)' },
				},
				fadeIn: {
					'from': { opacity: '0' },
					'to': { opacity: '1' },
				},
			},
			backdropBlur: {
				'card': '3px',
			},
		},
	},
	plugins: [],
};
