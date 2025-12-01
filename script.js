// ============================================
// 1. ДАННЫЕ И ПЕРЕМЕННЫЕ
// ============================================

let questions = [];
let currentQuestionIndex = 0;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let recognition;

// ============================================
// 2. ЭЛЕМЕНТЫ DOM (связь с HTML)
// ============================================

const hrQuestionEl = document.getElementById('hrQuestion');
const userAnswerEl = document.getElementById('userAnswer');
const submitBtn = document.getElementById('submitAnswer');
const hintBtn = document.getElementById('getHint');
const nextBtn = document.getElementById('nextQuestion');
const feedbackEl = document.getElementById('feedback');
const scoreValueEl = document.getElementById('scoreValue');
const feedbackTextEl = document.getElementById('feedbackText');
const tipsEl = document.getElementById('tips');
const progressBarEl = document.getElementById('progressBar');
const currentQuestionEl = document.getElementById('currentQuestion');
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');

// ============================================
// 3. ЗАГРУЗКА ВОПРОСОВ
// ============================================

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        console.log('✅ Загружено вопросов:', questions.length);
        updateQuestion();
    } catch (error) {
        console.error('❌ Ошибка загрузки вопросов:', error);
        // Резервные вопросы на случай ошибки
        questions = [
            {
                question: "Расскажите о себе",
                category: "soft skills",
                good_answer: "Я разработчик с опытом...",
                tips: ["Будь конкретным", "Свяжи с вакансией"]
            }
        ];
        updateQuestion();
    }
}

// ============================================
// 4. ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
// ============================================

function updateQuestion() {
    if (!questions.length) return;
    
    const question = questions[currentQuestionIndex];
    hrQuestionEl.innerHTML = `
        <strong>Вопрос ${currentQuestionIndex + 1}:</strong> ${question.question}
        <br><small>Категория: ${question.category}</small>
    `;
    
    // Сброс формы
    userAnswerEl.value = '';
    feedbackEl.classList.add('hidden');
    voiceStatus.textContent = 'Готов к записи';
    
    // Обновление прогресса
    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBarEl.style.width = `${progressPercent}%`;
    currentQuestionEl.textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = questions.length;
    
    // ИИ зачитывает вопрос голосом
    setTimeout(() => {
        speakText(`Вопрос номер ${currentQuestionIndex + 1}: ${question.question}`);
    }, 800);
}

// ============================================
// 5. РАСПОЗНАВАНИЕ РЕЧИ (Web Speech API)
// ============================================

function initSpeechRecognition() {
    // Проверяем поддержку браузера
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        console.warn('⚠️ Браузер не поддерживает распознавание речи');
        voiceStatus.textContent = 'Используйте текстовый ввод';
        voiceBtn.disabled = true;
        return;
    }
    
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        userAnswerEl.value = transcript;
        voiceStatus.textContent = '✅ Распознано: ' + transcript.substring(0, 50);
        console.log('🎤 Распознано:', transcript);
    };
    
    recognition.onerror = function(event) {
        console.error('❌ Ошибка распознавания:', event.error);
        voiceStatus.textContent = 'Ошибка, попробуйте снова';
    };
    
    recognition.onend = function() {
        isRecording = false;
        voiceBtn.textContent = '🎤 Говорить';
        voiceBtn.style.background = '#4299e1';
    };
}

// ============================================
// 6. ЗАПИСЬ ГОЛОСА
// ============================================

async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000
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
            voiceStatus.textContent = '⏳ Обработка...';
            
            // Используем Web Speech API для распознавания
            if (recognition) {
                recognition.start();
            }
            
            // Останавливаем микрофон
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        voiceBtn.textContent = '⏹ Остановить';
        voiceBtn.style.background = '#e53e3e';
        voiceStatus.textContent = '🎤 Записываю... ГОВОРИТЕ!';
        
    } catch (error) {
        console.error('❌ Ошибка микрофона:', error);
        voiceStatus.textContent = 'Разрешите доступ к микрофону';
        alert('Дайте доступ к микрофону для голосового ввода');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
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

// ============================================
// 7. СИНТЕЗ РЕЧИ (ИИ говорит)
// ============================================

function speakText(text, rate = 1.0) {
    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Браузер не поддерживает синтез речи');
        return;
    }
    
    // Останавливаем предыдущую речь
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = rate;
    utterance.volume = 1.0;
    
    // Ищем русский голос
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
        const russianVoice = voices.find(voice => 
            voice.lang.startsWith('ru') || 
            voice.name.toLowerCase().includes('russian')
        );
        if (russianVoice) {
            utterance.voice = russianVoice;
        }
    }
    
    // Анимация аватара
    const avatarImg = document.querySelector('.avatar-img');
    avatarImg.classList.add('talking');
    
    utterance.onstart = () => {
        console.log('🗣️ ИИ начинает говорить:', text.substring(0, 50));
    };
    
    utterance.onend = () => {
        console.log('✅ ИИ закончил говорить');
        avatarImg.classList.remove('talking');
    };
    
    utterance.onerror = (event) => {
        console.error('❌ Ошибка синтеза речи:', event);
        avatarImg.classList.remove('talking');
    };
    
    speechSynthesis.speak(utterance);
}

// ============================================
// 8. АНАЛИЗ ОТВЕТА
// ============================================

function analyzeAnswer(userAnswer) {
    const question = questions[currentQuestionIndex];
    let score = 5; // Средняя оценка
    
    // Простой анализ длины
    if (userAnswer.length < 30) score -= 2;
    if (userAnswer.length > 100) score += 1;
    if (userAnswer.length > 200) score += 1;
    
    // Ключевые слова для IT собеседований
    const positiveKeywords = [
        'опыт', 'проект', 'разработка', 'команда', 
        'результат', 'задачи', 'решил', 'улучшил',
        'оптимизировал', 'изучил', 'внедрил'
    ];
    
    positiveKeywords.forEach(keyword => {
        if (userAnswer.toLowerCase().includes(keyword)) {
            score += 0.5;
        }
    });
    
    // Ограничиваем оценку 1-10
    score = Math.max(1, Math.min(10, Math.round(score)));
    
    let feedback;
    if (score >= 8) {
        feedback = 'Отлично! Ответ структурированный и профессиональный.';
    } else if (score >= 6) {
        feedback = 'Хорошо, но можно добавить больше деталей.';
    } else {
        feedback = 'Нужно поработать над ответом. Попробуй следовать подсказкам ниже.';
    }
    
    return {
        score: score,
        feedback: feedback,
        tips: question.tips || ['Будь конкретнее', 'Приведи пример', 'Свяжи с вакансией']
    };
}

// ============================================
// 9. ОБРАБОТКА ОТВЕТА С ГОЛОСОВЫМ ФИДБЕКОМ
// ============================================

function analyzeAnswerWithVoice(userAnswer) {
    const analysis = analyzeAnswer(userAnswer);
    
    // Озвучиваем оценку
    const feedbackSpeech = `Ваша оценка: ${analysis.score} из 10. ${analysis.feedback}`;
    speakText(feedbackSpeech);
    
    // Через 3 секунды озвучиваем подсказки
    setTimeout(() => {
        const tipsSpeech = `Подсказки для улучшения: ${analysis.tips.join('. ')}`;
        speakText(tipsSpeech, 0.85);
    }, 3500);
    
    return analysis;
}

// ============================================
// 10. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

submitBtn.addEventListener('click', () => {
    const userAnswer = userAnswerEl.value.trim();
    if (!userAnswer) {
        speakText("Сначала ответьте на вопрос, пожалуйста.");
        return;
    }
    
    const analysis = analyzeAnswerWithVoice(userAnswer);
    
    // Показываем оценку в интерфейсе
    scoreValueEl.textContent = `${analysis.score}/10`;
    feedbackTextEl.textContent = analysis.feedback;
    tipsEl.innerHTML = `<strong>Подсказки:</strong><br>${analysis.tips.join('<br>')}`;
    
    feedbackEl.classList.remove('hidden');
    feedbackEl.scrollIntoView({ behavior: 'smooth' });
});

hintBtn.addEventListener('click', () => {
    const question = questions[currentQuestionIndex];
    const hintSpeech = `Пример ответа: ${question.good_answer.substring(0, 150)}`;
    speakText(hintSpeech, 0.8);
});

nextBtn.addEventListener('click', () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    updateQuestion();
});

// ============================================
// 11. КАМЕРА (дополнительно)
// ============================================

document.getElementById('startCameraBtn')?.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 }, 
            audio: false 
        });
        
        const videoBox = document.querySelector('.video-box');
        if (videoBox) {
            videoBox.innerHTML = '';
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.borderRadius = '10px';
            videoBox.appendChild(video);
        }
        
        const btn = document.getElementById('startCameraBtn');
        btn.textContent = '📹 Камера включена';
        btn.disabled = true;
        btn.style.background = '#48bb78';
        
    } catch (error) {
        console.error('Камера не доступна:', error);
        alert('Разрешите доступ к камере или используйте без видео');
    }
});

// ============================================
// 12. ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

async function main() {
    console.log('🚀 Запуск ИИ-HR тренера...');
    
    // Загружаем вопросы
    await loadQuestions();
    
    // Инициализируем распознавание речи
    initSpeechRecognition();
    
    // Приветствие
    setTimeout(() => {
        speakText("Привет! Я Анна, ваш HR-тренер. Отвечайте на вопросы голосом или текстом.");
    }, 1500);
    
    console.log('✅ Приложение готово');
}

// Запускаем когда страница загружена
document.addEventListener('DOMContentLoaded', main);

// Обновляем голоса при загрузке страницы
if (speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
        console.log('Голоса загружены:', speechSynthesis.getVoices().length);
    };
}
