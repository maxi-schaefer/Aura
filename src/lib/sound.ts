const context = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playTick = () => {
    // Resume context in case the browser suspended it (common after inactivity)
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "triangle"; 
    
    osc.frequency.setValueAtTime(600, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, context.currentTime + 0.008);

    gain.gain.setValueAtTime(0.02, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.008);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start();
    osc.stop(context.currentTime + 0.01);
};

export const playSuccess = () => {
    if (context.state === 'suspended') context.resume();
    
    [0, 0.05].forEach(delay => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, context.currentTime + delay);
        gain.gain.setValueAtTime(0.01, context.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + delay + 0.02);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(context.currentTime + delay);
        osc.stop(context.currentTime + delay + 0.02);
    });
};