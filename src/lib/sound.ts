const context = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playTick = () => {
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();

    const now = context.currentTime;

    // Pure, minimal tone
    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, now);

    // Very soft + tight envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.0015); // tiny attack
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start(now);
    osc.stop(now + 0.022);
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

export const playTimerDone = () => {
    if (context.state === 'suspended') context.resume();
    
    // A sophisticated, airy Major 7th sequence
    // Frequencies: G5, B5, D6, F#6
    const melody = [783.99, 987.77, 1174.66, 1479.98]; 
    const now = context.currentTime;

    melody.forEach((freq, i) => {
        const startTime = now + (i * 0.12); // Slightly slower stagger for "elegance"
        
        // 1. Primary Sine (The Body)
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        // 2. Harmonic Layer (The Shimmer)
        const harmonic = context.createOscillator();
        const hGain = context.createGain();
        harmonic.type = "triangle";
        // One octave up, very subtle
        harmonic.frequency.setValueAtTime(freq * 2, startTime); 

        // Envelope for Primary
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.exponentialRampToValueAtTime(0.02, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

        // Envelope for Harmonic (Quick sparkle)
        hGain.gain.setValueAtTime(0, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.02);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

        // Connections
        osc.connect(gain);
        gain.connect(context.destination);
        harmonic.connect(hGain);
        hGain.connect(context.destination);

        // Playback
        osc.start(startTime);
        osc.stop(startTime + 0.7);
        harmonic.start(startTime);
        harmonic.stop(startTime + 0.2);
    });
};