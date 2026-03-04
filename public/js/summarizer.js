// ═══════════════════════════════════════════════════════
// Summarizer — Client-side extractive AI summarization
// ═══════════════════════════════════════════════════════

const Summarizer = {
    // Stop words to filter out common words
    stopWords: new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'not', 'no', 'so', 'if', 'then', 'than', 'very', 'just', 'about', 'also', 'much', 'more', 'some', 'any', 'each', 'every', 'all', 'both', 'few', 'most', 'other', 'into', 'from', 'up', 'out', 'as']),

    async generate(meetingId) {
        const notesEl = document.getElementById('detail-notes');
        const transcriptEl = document.getElementById('transcript-box');
        const summaryEl = document.getElementById('summary-box');

        const notes = notesEl ? notesEl.textContent.trim() : '';
        const transcript = transcriptEl ? transcriptEl.textContent.trim() : '';
        const combined = (notes + ' ' + transcript).trim();

        if (!combined || combined.length < 20 || combined.includes('No transcript') && combined.includes('Start writing')) {
            Utils.showToast('Add meeting notes or transcript first before generating a summary', 'warning');
            return;
        }

        if (summaryEl) {
            summaryEl.innerHTML = '<p style="color:var(--text-muted)">🤖 Generating summary...</p>';
        }

        // Small delay for UX
        await new Promise(r => setTimeout(r, 800));

        try {
            const summary = this.extractiveSummary(combined);
            const topics = this.extractTopics(combined);
            const actionItems = this.extractActionItems(combined);

            let html = `<h4>🤖 AI Meeting Summary</h4>`;
            html += `<p>${summary}</p>`;

            if (topics.length) {
                html += `<h4 style="margin-top:16px">📌 Key Topics</h4><ul>${topics.map(t => `<li>${t}</li>`).join('')}</ul>`;
            }
            if (actionItems.length) {
                html += `<h4 style="margin-top:16px">✅ Action Items</h4><ul>${actionItems.map(a => `<li>${a}</li>`).join('')}</ul>`;
            }

            if (summaryEl) summaryEl.innerHTML = html;

            // Save to server
            await API.put(`/meetings/${meetingId}`, { summary: html });
            Utils.showToast('Summary generated & saved!', 'success');
        } catch (err) {
            Utils.showToast('Failed to generate summary', 'error');
        }
    },

    extractiveSummary(text, maxSentences = 5) {
        // Split into sentences
        const sentences = text.replace(/<[^>]*>/g, '').split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
        if (sentences.length <= maxSentences) return sentences.join('. ') + '.';

        // Calculate TF-IDF-like scores
        const wordFreq = {};
        sentences.forEach(s => {
            const words = s.toLowerCase().split(/\s+/);
            words.forEach(w => {
                if (!this.stopWords.has(w) && w.length > 2) {
                    wordFreq[w] = (wordFreq[w] || 0) + 1;
                }
            });
        });

        // Score sentences
        const scored = sentences.map((s, idx) => {
            const words = s.toLowerCase().split(/\s+/);
            let score = 0;
            words.forEach(w => { if (wordFreq[w]) score += wordFreq[w]; });
            score /= Math.max(words.length, 1);
            // Boost first sentences (topic sentences)
            if (idx < 3) score *= 1.5;
            return { sentence: s, score, idx };
        });

        // Pick top sentences, maintain order
        scored.sort((a, b) => b.score - a.score);
        const topSentences = scored.slice(0, maxSentences).sort((a, b) => a.idx - b.idx);
        return topSentences.map(s => s.sentence).join('. ') + '.';
    },

    extractTopics(text, maxTopics = 6) {
        const words = text.replace(/<[^>]*>/g, '').toLowerCase().split(/\s+/);
        const freq = {};
        words.forEach(w => {
            const clean = w.replace(/[^a-z]/g, '');
            if (!this.stopWords.has(clean) && clean.length > 3) {
                freq[clean] = (freq[clean] || 0) + 1;
            }
        });

        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTopics)
            .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    },

    extractActionItems(text) {
        const patterns = [
            /(?:need to|should|must|will|have to|going to|plan to|let'?s|action item[s]?:?)\s+(.+?)(?:\.|$)/gi,
            /(?:todo|to-do|follow[- ]?up|next step[s]?)[:\s]+(.+?)(?:\.|$)/gi,
            /(?:assign(?:ed)?|responsible)[:\s]+(.+?)(?:\.|$)/gi
        ];

        const items = new Set();
        const cleanText = text.replace(/<[^>]*>/g, '');

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(cleanText)) !== null) {
                const item = match[1].trim();
                if (item.length > 5 && item.length < 150) {
                    items.add(item.charAt(0).toUpperCase() + item.slice(1));
                }
            }
        });

        return Array.from(items).slice(0, 8);
    }
};
