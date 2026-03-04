// ═══════════════════════════════════════════════════════
// Audio Recorder — MediaRecorder API with waveform
// ═══════════════════════════════════════════════════════

const Recorder = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    analyser: null,
    animFrame: null,
    startTime: null,
    timerInterval: null,
    isRecording: false,

    initCanvas() {
        const canvas = document.getElementById('waveform-canvas');
        if (!canvas) return;
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#12121f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    async toggle(meetingId) {
        if (this.isRecording) {
            this.stop();
        } else {
            await this.start(meetingId);
        }
    },

    async start(meetingId) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];

            // Setup analyser for waveform
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(this.stream);
            this.analyser = audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            // Setup recorder
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };

            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.startTime = Date.now();

            // Update UI
            const btn = document.getElementById('rec-btn');
            if (btn) btn.classList.add('recording');
            const saveBtn = document.getElementById('rec-save');
            if (saveBtn) saveBtn.style.display = 'none';

            // Start timer
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);
            this.drawWaveform();

        } catch (err) {
            Utils.showToast('Microphone access denied. Please allow microphone access.', 'error');
        }
    },

    stop() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }
        this.isRecording = false;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.animFrame);

        const btn = document.getElementById('rec-btn');
        if (btn) btn.classList.remove('recording');
        const saveBtn = document.getElementById('rec-save');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    },

    async save(meetingId) {
        if (!this.audioChunks.length) return Utils.showToast('No audio recorded', 'error');

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, `recording_${Date.now()}.webm`);

        try {
            await API.upload(`/meetings/${meetingId}/audio`, formData);
            Utils.showToast('Audio saved!', 'success');
            // Refresh the meeting detail
            Meetings.showDetail(meetingId);
        } catch (err) {
            Utils.showToast('Failed to save audio: ' + err.message, 'error');
        }
    },

    startNew(meetingId) {
        const area = document.querySelector('.audio-player')?.parentElement;
        if (area) {
            area.innerHTML = `
        <label style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:8px;display:block">Audio Recording</label>
        <div class="recorder-container">
          <div class="recorder-waveform"><canvas id="waveform-canvas"></canvas></div>
          <div class="recorder-controls">
            <span class="recorder-timer" id="rec-timer">00:00</span>
            <button class="record-btn" id="rec-btn" onclick="Recorder.toggle('${meetingId}')"></button>
            <button class="btn btn-sm btn-secondary" id="rec-save" style="display:none" onclick="Recorder.save('${meetingId}')">Save Recording</button>
          </div>
        </div>
      `;
            setTimeout(() => this.initCanvas(), 100);
        }
    },

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        const timer = document.getElementById('rec-timer');
        if (timer) timer.textContent = `${mins}:${secs}`;
    },

    drawWaveform() {
        if (!this.isRecording || !this.analyser) return;

        const canvas = document.getElementById('waveform-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(18, 18, 31, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#818cf8');
        gradient.addColorStop(1, '#6366f1');

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }

        this.animFrame = requestAnimationFrame(() => this.drawWaveform());
    }
};
