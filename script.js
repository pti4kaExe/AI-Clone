// Добавляем эти переменные в начало script.js
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let recognition; // для распознавания речи

// Элементы для голосового управления
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');

// Функция для распознавания речи (Web Speech API)
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userAnswerEl.value = transcript;
            voiceStatus.textContent = '✅ Распознано: ' + transcript.substring(0, 50) + '...';
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            voiceStatus.textContent = '❌ Ошибка распознавания';
        };
        
        recognition.onend = function() {
            isRecording = false;
            voiceBtn.textContent = '🎤 Говорить';
            voiceBtn.style.background = '#4299e1';
        };
    } else {
        console.warn('Speech recognition not supported');
        voiceStatus.textContent = '⚠️ Браузер не поддерживает распознавание речи';
    }
}

// Запись голоса
async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                sampleSize: 16
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            // Здесь можно отправить аудио на сервер для распознавания
            // Но для простоты используем локальное распознавание
            if (recognition) {
                recognition.start();
            }
        };
        
        mediaRecorder.start();
        isRecording = true;
        voiceBtn.textContent = '⏹ Остановить запись';
        voiceBtn.style.background = '#e53e3e';
        voiceStatus.textContent = '🎤 Записываю... Говорите!';
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        voiceStatus.textContent = '❌ Нет доступа к микрофону';
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        // Останавливаем все треки микрофона
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

// Обработчик кнопки голоса
voiceBtn.addEventListener('click', () => {
    if (!isRecording) {
        startVoiceRecording();
    } else {
        stopVoiceRecording();
    }
});
