// ═══════════════════════════════════════════════════════
// Transcriber — Web Speech API real-time transcription
// ═══════════════════════════════════════════════════════

const Transcriber = {
    recognition: null,
    isTranscribing: false,
    currentMeetingId: null,
    fullTranscript: '',

    isSupported() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    },

    toggle(meetingId) {
        if (this.isTranscribing) {
            this.stop(meetingId);
        } else {
            this.start(meetingId);
        }
    },

    start(meetingId) {
        if (!this.isSupported()) {
            Utils.showToast('Speech recognition is not supported in this browser. Please use Chrome.', 'error');
            return;
        }

        this.currentMeetingId = meetingId;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        const box = document.getElementById('transcript-box');
        if (box) {
            this.fullTranscript = box.textContent.includes('No transcript') ? '' : box.textContent;
        }

        this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript + '. ';
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                this.fullTranscript += final;
            }

            if (box) {
                box.innerHTML = this.fullTranscript + (interim ? `<span class="highlight">${interim}</span>` : '');
                box.scrollTop = box.scrollHeight;
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'no-speech') return; // Ignore no-speech errors
            console.error('Speech recognition error:', event.error);
            Utils.showToast('Transcription error: ' + event.error, 'error');
        };

        this.recognition.onend = () => {
            // Auto-restart if still transcribing
            if (this.isTranscribing) {
                try { this.recognition.start(); } catch (e) { /* ignore */ }
            }
        };

        this.recognition.start();
        this.isTranscribing = true;

        const btnText = document.getElementById('transcribe-btn-text');
        if (btnText) btnText.textContent = '⏹ Stop Transcribing';

        Utils.showToast('Transcription started — speak clearly', 'info');
    },

    async stop(meetingId) {
        this.isTranscribing = false;
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }

        const btnText = document.getElementById('transcribe-btn-text');
        if (btnText) btnText.textContent = '🎤 Start Transcribing';

        // Save transcript
        if (this.fullTranscript && meetingId) {
            try {
                await API.put(`/meetings/${meetingId}`, { transcript: this.fullTranscript });
                Utils.showToast('Transcript saved!', 'success');
            } catch (err) {
                Utils.showToast('Failed to save transcript', 'error');
            }
        }
    }
};
