import confetti from 'canvas-confetti';

export function fireConfetti() {
  const defaults = {
    spread: 55,
    ticks: 100,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#8b9679', '#a8aaa3', '#ddc498', '#a8c0d0', '#ddb8be'],
  };
  confetti({ ...defaults, particleCount: 40, origin: { x: 0.1, y: 0.6 }, angle: 60 });
  confetti({ ...defaults, particleCount: 40, origin: { x: 0.9, y: 0.6 }, angle: 120 });
}
