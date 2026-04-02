import confetti from 'canvas-confetti';

export const useCelebration = () => {
  const celebrate = () => {
    // Explosão central de confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2EF598', '#10B981', '#FFD700', '#22D3EE', '#A78BFA'],
      zIndex: 9999,
    });

    // Segunda explosão dos lados com delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#2EF598', '#10B981', '#FFD700'],
        zIndex: 9999,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#22D3EE', '#A78BFA', '#FFD700'],
        zIndex: 9999,
      });
    }, 150);
  };

  return { celebrate };
};
