<script lang="ts">
	import { onMount } from 'svelte';
	
	let starsContainer: HTMLDivElement;
	
	onMount(() => {
		// Create twinkling stars
		const createTwinklingStar = () => {
			const star = document.createElement('div');
			star.className = 'twinkling-star';
			star.style.left = Math.random() * 100 + '%';
			star.style.top = Math.random() * 100 + '%';
			star.style.animationDelay = Math.random() * 5 + 's';
			star.style.animationDuration = (2 + Math.random() * 3) + 's';
			starsContainer.appendChild(star);
			setTimeout(() => star.remove(), 5000);
		};
		
		// Initial batch
		for (let i = 0; i < 20; i++) {
			setTimeout(createTwinklingStar, i * 100);
		}
		
		// Continuous creation
		const interval = setInterval(createTwinklingStar, 300);
		return () => clearInterval(interval);
	});
</script>

<div class="stars-wrapper" bind:this={starsContainer}>
	<div class="stars"></div>
	<div class="stars2"></div>
</div>

<style>
	.stars-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}
	
	.stars, .stars2 {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
	
	.stars {
		background: transparent;
		animation: animateStars 100s linear infinite;
	}
	
	.stars::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: 
			radial-gradient(2px 2px at 20% 30%, white, transparent),
			radial-gradient(2px 2px at 40% 70%, white, transparent),
			radial-gradient(1px 1px at 60% 50%, white, transparent),
			radial-gradient(1px 1px at 80% 10%, white, transparent),
			radial-gradient(2px 2px at 90% 60%, white, transparent);
		background-size: 300px 300px;
		background-repeat: repeat;
		opacity: 0.8;
	}
	
	.stars2 {
		animation: animateStars 150s linear infinite;
		opacity: 0.5;
	}
	
	.stars2::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: 
			radial-gradient(1px 1px at 10% 20%, white, transparent),
			radial-gradient(1px 1px at 30% 40%, white, transparent),
			radial-gradient(2px 2px at 50% 60%, white, transparent);
		background-size: 400px 400px;
		background-repeat: repeat;
	}
	
	@keyframes animateStars {
		from { transform: translateY(0); }
		to { transform: translateY(-100%); }
	}
	
	:global(.twinkling-star) {
		position: fixed;
		width: 2px;
		height: 2px;
		background-color: #fff;
		border-radius: 50%;
		pointer-events: none;
		animation: twinkle linear infinite;
		box-shadow: 0 0 4px rgba(255,255,255,0.5);
	}
	
	@keyframes twinkle {
		0%, 100% { opacity: 0; }
		50% { opacity: 1; }
	}
</style>
