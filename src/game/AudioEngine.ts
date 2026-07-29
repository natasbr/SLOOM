export class AudioEngine {
    private ctx: AudioContext | null = null;
    private isPlaying = false;
    private nextNoteTime = 0;
    private step = 0;

    // A simple samba-inspired rhythm (16 steps)
    // 1: kick, 2: snare, 3: hi-hat
    private rhythm = [
        1, 3, 2, 3,
        3, 1, 2, 3,
        1, 3, 2, 3,
        3, 1, 2, 1
    ];

    // Heavy bassline (doom inspired)
    private bassline = [
        30, 30, 0, 30,
        33, 0, 36, 0,
        30, 30, 0, 30,
        28, 0, 26, 0
    ];

    init() {
        if (this.ctx) return;
        this.ctx = new AudioContext();
    }

    start() {
        if (!this.ctx) this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.nextNoteTime = this.ctx!.currentTime + 0.1;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
    }

    private scheduleNote(step: number, time: number) {
        if (!this.ctx) return;

        const beat = this.rhythm[step];
        const bass = this.bassline[step];

        // Drum synthesis
        if (beat === 1) { // Kick
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            
            osc.start(time);
            osc.stop(time + 0.1);
        } else if (beat === 2) { // Snare
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(250, time);
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            
            osc.start(time);
            osc.stop(time + 0.1);
        } else if (beat === 3) { // Hi-hat
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.setValueAtTime(800, time);
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            
            osc.start(time);
            osc.stop(time + 0.05);
        }

        // Bass synthesis (Doom style)
        if (bass > 0) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            
            // Fuzz/Distortion effect (simple gain overdrive)
            const dist = this.ctx.createWaveShaper();
            dist.curve = this.makeDistortionCurve(400);
            dist.oversample = '4x';
            
            osc.connect(dist);
            dist.connect(gain);
            gain.connect(this.ctx.destination);
            
            const freq = 440 * Math.pow(2, (bass - 69) / 12);
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.linearRampToValueAtTime(0, time + 0.2);
            
            osc.start(time);
            osc.stop(time + 0.2);
        }
    }

    private makeDistortionCurve(amount: number) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    private scheduler = () => {
        if (!this.isPlaying || !this.ctx) return;
        
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.scheduleNote(this.step, this.nextNoteTime);
            this.nextNoteTime += 0.15; // tempo ~ 100 BPM (16th notes)
            this.step = (this.step + 1) % 16;
        }
        
        requestAnimationFrame(this.scheduler);
    }
}

export const audioEngine = new AudioEngine();
