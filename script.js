document.addEventListener('DOMContentLoaded', async () => {
    const audioPlayer = document.getElementById('audio-player');
    const lyricsContainer = document.getElementById('lyrics-container');
    const songTitleElement = document.querySelector('.song-title');
    const loadingElement = document.getElementById('loading');
    const loadingMessage = loadingElement.querySelector('p');
    const mainContent = document.getElementById('main-content');

    const MUSIC_AI_API_KEY = 'b6c6aae5-652a-441f-af78-c1d2c69f045a'; 

    async function processAudioFile() {
        try {
            // First, get upload URL
            const uploadResponse = await fetch('https://api.music.ai/api/upload', {
                method: 'GET',
                headers: {
                    'Authorization': MUSIC_AI_API_KEY
                }
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to get upload URL');
            }
            
            const { uploadUrl, downloadUrl } = await uploadResponse.json();
            console.log('Got upload URL:', uploadUrl);
            console.log('Got download URL:', downloadUrl);

            // Upload the audio file
            const audioUrl = chrome.runtime.getURL('example_civil_war.mp3');
            const audioResponse = await fetch(audioUrl);
            const audioBlob = await audioResponse.blob();
            
            const uploadResult = await fetch(uploadUrl, {
                method: 'PUT',
                body: audioBlob,
                headers: {
                    'Content-Type': 'audio/mpeg'
                }
            });

            if (!uploadResult.ok) {
                throw new Error('Failed to upload audio file');
            }
            console.log('Successfully uploaded audio file');

            // Create a job to process the audio
            const jobResponse = await fetch('https://api.music.ai/api/job', {
                method: 'POST',
                headers: {
                    'Authorization': MUSIC_AI_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: "Process Audio for Lyrics",
                    workflow: "lyricstiming",
                    params: {
                        inputUrl: downloadUrl
                    }
                })
            });

            if (!jobResponse.ok) {
                throw new Error('Failed to create job');
            }

            const jobData = await jobResponse.json();
            console.log('Created job:', jobData);
            const jobId = jobData.id;

            // Poll for job completion
            while (true) {
                const statusResponse = await fetch(`https://api.music.ai/api/job/${jobId}/status`, {
                    headers: {
                        'Authorization': MUSIC_AI_API_KEY
                    }
                });
                
                const statusData = await statusResponse.json();
                console.log('Job status:', statusData);
                
                if (statusData.status === 'FAILED') {
                    throw new Error('Job processing failed');
                }
                
                if (statusData.status === 'SUCCEEDED') {
                    // Get the job results
                    const resultResponse = await fetch(`https://api.music.ai/api/job/${jobId}`, {
                        headers: {
                            'Authorization': MUSIC_AI_API_KEY
                        }
                    });
                    
                    const finalJobData = await resultResponse.json();
                    console.log('Final job data:', finalJobData);

                    // Fetch the lyrics from the result URL
                    if (finalJobData.result && finalJobData.result.lyrics) {
                        const lyricsResponse = await fetch(finalJobData.result.lyrics);
                        if (!lyricsResponse.ok) {
                            throw new Error('Failed to fetch lyrics data');
                        }
                        const lyricsData = await lyricsResponse.json();
                        console.log('Fetched lyrics data:', lyricsData);
                        return lyricsData;
                    } else {
                        throw new Error('No lyrics URL in job result');
                    }
                }
                
                // Wait 2 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            throw error;
        }
    }

    async function translateText(text) {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ZO2wrYPV2XQqCBDQjVvGDZ2Yb0414PpN'
            },
            body: JSON.stringify({
                model: "mistral-tiny",
                messages: [
                    {
                        role: "system",
                        content: "Return a suitable title for the following text. Approximately three words. Do not add quotees or write 'title:' or anything like that."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
    
    try {
        // Show loading state
        loadingElement.classList.add('active');
        mainContent.classList.add('loading');
        if (loadingMessage) {
            loadingMessage.textContent = 'Processing audio...';
        }

        // Process the audio file and get lyrics
        const lyricsData = await processAudioFile();
        console.log('Processing complete, lyrics data:', lyricsData);
        
        // Create lyrics elements with timing data
        if (lyricsData) {
            // Convert the lyrics data into an array of lines
            let lines = [];
            if (Array.isArray(lyricsData)) {
                lines = lyricsData;
            } else if (typeof lyricsData === 'object' && Array.isArray(lyricsData.lines)) {
                lines = lyricsData.lines;
            }

            console.log('Processed lines:', lines);

            if (lines.length === 0) {
                throw new Error('No lyrics found in the response');
            }

            lines.forEach((line) => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'lyrics-line';
                
                if (typeof line === 'object' && line.words && Array.isArray(line.words)) {
                    line.words.forEach((wordData) => {
                        const wordSpan = document.createElement('span');
                        wordSpan.className = 'word';
                        wordSpan.textContent = wordData.word;
                        wordSpan.dataset.start = wordData.start;
                        wordSpan.dataset.end = wordData.end;
                        
                        wordSpan.addEventListener('click', () => {
                            const startTime = parseFloat(wordData.start);
                            // Update highlighting for all words
                            const allWords = document.querySelectorAll('.word');
                            allWords.forEach(w => {
                                const wordStart = parseFloat(w.dataset.start);
                                if (wordStart <= startTime) {
                                    w.classList.add('sung');
                                } else {
                                    w.classList.remove('sung');
                                }
                                w.classList.remove('active');
                            });
                            // Set this word as active
                            wordSpan.classList.add('active');
                            
                            // Start playing from this word
                            audioPlayer.currentTime = startTime;
                            setTimeout(() => {
                                audioPlayer.play().catch(e => console.error('Playback failed:', e));
                            }, 50);
                        });
                        
                        lineDiv.appendChild(wordSpan);
                    });
                } else if (typeof line === 'object' && line.text) {
                    lineDiv.textContent = line.text;
                } else if (typeof line === 'string') {
                    lineDiv.textContent = line;
                }
                
                lyricsContainer.appendChild(lineDiv);
            });
        } else {
            throw new Error('Invalid response format from API');
        }

        // Check if there's a selected song title from the context menu
        chrome.storage.local.get(['selectedSongTitle'], async (result) => {
            if (result.selectedSongTitle) {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Translating title...';
                }

                try {
                    // Translate the title
                    const translatedTitle = await translateText(result.selectedSongTitle);
                    
                    // Update the title
                    songTitleElement.textContent = translatedTitle;
                } catch (error) {
                    console.error('Translation error:', error);
                    // If translation fails, use original text
                    songTitleElement.textContent = result.selectedSongTitle;
                } finally {
                    // Clear the stored title after using it
                    chrome.storage.local.remove('selectedSongTitle');
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
        lyricsContainer.innerHTML = '<p class="error">Failed to load lyrics. Please try again later.</p>';
    } finally {
        // Hide loading state
        loadingElement.classList.remove('active');
        mainContent.classList.remove('loading');
    }

    // Add audio player event listeners for updating lyrics
    const words = document.querySelectorAll('.word');
    
    function updateLyrics(currentTime) {
        const words = document.querySelectorAll('.word');
        
        words.forEach(word => {
            const start = parseFloat(word.dataset.start);
            const end = parseFloat(word.dataset.end);
            
            if (currentTime >= start && currentTime <= end) {
                word.classList.add('active');
                // Add sung class to this word and all previous words
                words.forEach(w => {
                    const wordStart = parseFloat(w.dataset.start);
                    if (wordStart <= start) {
                        w.classList.add('sung');
                    } else {
                        w.classList.remove('sung');
                    }
                });
            } else {
                word.classList.remove('active');
            }
        });
    }

    audioPlayer.addEventListener('timeupdate', () => {
        updateLyrics(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener('seeking', () => {
        words.forEach(word => {
            word.classList.remove('active');
        });
    });
});
