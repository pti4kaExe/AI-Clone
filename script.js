// ==================== КОНСТАНТЫ И ПЕРЕМЕННЫЕ ====================
let questions = []; // Все вопросы
let currentQuestionIndex = 0; // Текущий вопрос
let isRecording = false; // Идет запись?
let mediaRecorder = null; // Для записи аудио
let recognition = null; // Для распознавания речи
let userVideoStream = null; // Поток видео пользователя
let userAudioStream = null; // Поток аудио пользователя

// ==================== ЭЛЕМЕНТЫ HTML ====================
// Находим все нужные элементы на странице
const elements = {
    hrQuestion: document.getElementById('hrQuestion'),
    questionText: document.getElementById('questionText'),
    userAnswer: document.getElementById('userAnswer'),
    submitBtn: document.getElementById('submitAnswer'),
    hintBtn: document.getElementById('getHint'),
    nextBtn: document.getElementById('nextQuestion'),
    feedbackSection: document.getElementById('feedbackSection'),
    feedbackText: document.getElementById('feedbackText'),
    tipsList: document.getElementById('tipsList'),
    scoreBadge: document.getElementById('scoreBadge'),
    progressFill: document.getElementById('progressFill'),
    currentQuestionNum: document.getElementById('currentQuestionNum'),
    totalQuestions: document.getElementById('totalQuestions'),
    voiceBtn: document.getElementById('voiceBtn'),
    voiceStatus: document.getElementById('voiceStatus'),
    recordingIndicator: document.getElementById('recordingIndicator'),
    userVideoBox: document.getElementById('userVideoBox'),
    userVideo: document.getElementById('userVideo'),
    startCameraBtn: document.getElementById('startCameraBtn'),
    toggleMicBtn: document.getElementById('toggleMicBtn')
};

// ==================== ЗАГРУЗКА ВОПРОСОВ ====================
async function loadQuestions() {
    console.log('🔄 Загружаю вопросы...');
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error('Ошибка загрузки файла');
        
        questions = await response.json();
        console.log(`✅ Загружено ${questions.length} вопросов`);
        
        // Обновляем счетчик вопросов
        elements.totalQuestions.textContent = questions.length;
        
        // Показываем первый вопрос
        showQuestion();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки вопросов:', error);
        alert('Не удалось загрузить вопросы. Проверьте файл questions.json');
        
        // Создаем тестовый вопрос на случай ошибки
        questions = [{
            question: "Расскажите о себе",
            category: "soft skills",
            good_answer: "Я разработчик с 3 годами опыта...",
            tips: ["Будьте конкретны", "Свяжите с вакансией", "Упомяните достижения"]
        }];
        showQuestion();
    }
}

// ==================== ПОКАЗ ВОПРОСА ====================
function showQuestion() {
    if (!questions.length) return;
    
    const question = questions[currentQuestionIndex];
    
    // Обновляем интерфейс
    elements.questionText.innerHTML = `<strong>${question.question}</strong>`;
    elements.currentQuestionNum.textContent = currentQuestionIndex + 1;
    
    // Обновляем прогресс
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    
    // Сбрасываем предыдущий ответ
    elements.userAnswer.value = '';
    elements.feedbackSection.classList.add('hidden');
    elements.voiceStatus.textContent = 'Готов к записи. Нажмите кнопку и говорите.';
    
    // ИИ зачитывает вопрос
    setTimeout(() => {
        speakText(`Вопрос ${currentQuestionIndex + 1}. ${question.question}`);
    }, 1000);
    
    console.log(`📝 Показываю вопрос ${currentQuestionIndex + 1}: ${question.question}`);
}

// ==================== РАСПОЗНАВАНИЕ РЕЧИ ====================
function initSpeechRecognition() {
    console.log('🎤 Инициализирую распознавание речи...');
    
    // Проверяем поддержку браузером
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        console.warn('⚠️ Браузер не поддерживает распознавание речи');
        elements.voiceStatus.textContent = 'Голосовой ввод не поддерживается. Используйте текстовый ввод.';
        elements.voiceBtn.disabled = true;
        return;
    }
    
    // Создаем объект распознавания
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Настройки
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    // События
    recognition.onstart = () => {
        console.log('🎤 Начало распознавания...');
        elements.voiceStatus.textContent = 'Слушаю...';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('✅ Распознано:', transcript);
        
        // Показываем текст в поле
        elements.userAnswer.value = transcript;
        elements.voiceStatus.textContent = '✅ Речь распознана!';
        
        // Автоматически отправляем на оценку через 2 секунды
        setTimeout(() => {
            if (elements.userAnswer.value.trim()) {
                submitAnswer();
            }
        }, 2000);
    };
    
    recognition.onerror = (event) => {
        console.error('❌ Ошибка распознавания:', event.error);
        elements.voiceStatus.textContent = 'Ошибка. Попробуйте снова.';
        elements.recordingIndicator.classList.add('hidden');
    };
    
    recognition.onend = () => {
        console.log('🛑 Распознавание завершено');
        elements.voiceBtn.textContent = '🎤 Нажми и говори';
        elements.recordingIndicator.classList.add('hidden');
        isRecording = false;
    };
    
    console.log('✅ Распознавание речи инициализировано');
}

// ==================== ЗАПИСЬ АУДИО ====================
async function startVoiceRecording() {
    console.log('🔴 Начинаю запись...');
    
    try {
        // Запрашиваем доступ к микрофону
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        // Начинаем запись
        mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            console.log('🛑 Запись остановлена');
            // Запускаем распознавание
            if (recognition) {
                recognition.start();
            }
            // Освобождаем микрофон
            stream.getTracks().forEach(track => track.stop());
        };
        
        // Запускаем запись
        mediaRecorder.start();
        isRecording = true;
        
        // Обновляем интерфейс
        elements.voiceBtn.textContent = '⏹ Остановить запись';
        elements.voiceStatus.textContent = 'Идет запись...';
        elements.recordingIndicator.classList.remove('hidden');
        
        console.log('✅ Запись начата');
        
    } catch (error) {
        console.error('❌ Ошибка доступа к микрофону:', error);
        elements.voiceStatus.textContent = 'Разрешите доступ к микрофону';
        alert('Для голосового ввода необходим доступ к микрофону. Разрешите доступ в настройках браузера.');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        elements.voiceBtn.textContent = '🎤 Нажми и говори';
    }
}

// Обработчик кнопки голоса
elements.voiceBtn.addEventListener('click', () => {
    if (!isRecording) {
        startVoiceRecording();
    } else {
        stopVoiceRecording();
    }
});

// ==================== СИНТЕЗ РЕЧИ (ИИ говорит) ====================
function speakText(text, rate = 1.0) {
    console.log('🗣️ ИИ говорит:', text.substring(0, 50) + '...');
    
    if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Синтез речи не поддерживается');
        return;
    }
    
    // Останавливаем предыдущую речь
    speechSynthesis.cancel();
    
    // Создаем utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = rate;
    utterance.volume = 1.0;
    
    // Ищем русский голос
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
        const russianVoice = voices.find(voice => 
            voice.lang.startsWith('ru-RU') || 
            voice.lang.startsWith('ru')
        );
        if (russianVoice) {
            utterance.voice = russianVoice;
        }
    }
    
    // Анимация аватара
    const avatar = document.querySelector('.avatar-img');
    avatar.classList.add('talking');
    
    // События
    utterance.onstart = () => {
        console.log('▶️ Начало речи ИИ');
    };
    
    utterance.onend = () => {
        console.log('⏹️ Конец речи ИИ');
        avatar.classList.remove('talking');
    };
    
    utterance.onerror = (event) => {
        console.error('❌ Ошибка синтеза речи:', event);
        avatar.classList.remove('talking');
    };
    
    // Запускаем
    speechSynthesis.speak(utterance);
}

// ==================== АНАЛИЗ ОТВЕТА ====================
function analyzeAnswer(answerText) {
    console.log('🔍 Анализирую ответ...');
    
    const question = questions[currentQuestionIndex];
    let score = 5; // Средняя оценка
    
    // Простой анализ
    if (answerText.length < 30) score -= 2;
    if (answerText.length > 100) score += 1;
    if (answerText.length > 200) score += 1;
    
    // Проверка ключевых слов
    const keywords = ['опыт', 'проект', 'команда', 'результат', 'задачи', 'разработка'];
    let foundKeywords = 0;
    
    keywords.forEach(keyword => {
        if (answerText.toLowerCase().includes(keyword)) {
            foundKeywords++;
            score += 0.5;
        }
    });
    
    // Ограничиваем оценку
    score = Math.max(1, Math.min(10, Math.round(score)));
    
    // Формируем фидбек
    let feedback = '';
    if (score >= 9) {
        feedback = 'Отлично! Ответ структурированный и полный.';
    } else if (score >= 7) {
        feedback = 'Хорошо, но можно добавить больше деталей.';
    } else if (score >= 5) {
        feedback = 'Неплохо, но ответ слишком общий.';
    } else {
        feedback = 'Нужно поработать над ответом.';
    }
    
    return {
        score: score,
        feedback: feedback,
        tips: question.tips || ['Будьте конкретнее', 'Приведите примеры', 'Свяжите с вакансией']
    };
}

// ==================== ОТПРАВКА ОТВЕТА ====================
function submitAnswer() {
    const answerText = elements.userAnswer.value.trim();
    
    if (!answerText) {
        speakText("Пожалуйста, сначала ответьте на вопрос.");
        return;
    }
    
    console.log('📤 Отправляю ответ на анализ:', answerText.substring(0, 50) + '...');
    
    // Анализируем ответ
    const analysis = analyzeAnswer(answerText);
    
    // Показываем оценку
    elements.scoreBadge.textContent = `${analysis.score}/10`;
    elements.feedbackText.textContent = analysis.feedback;
    
    // Показываем советы
    elements.tipsList.innerHTML = '';
    analysis.tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        elements.tipsList.appendChild(li);
    });
    
    // Показываем блок с оценкой
    elements.feedbackSection.classList.remove('hidden');
    
    // Прокручиваем к оценке
    elements.feedbackSection.scrollIntoView({ behavior: 'smooth' });
    
    // ИИ озвучивает оценку
    const feedbackSpeech = `Ваша оценка: ${analysis.score} из 10. ${analysis.feedback}`;
    speakText(feedbackSpeech);
    
    // Через паузу озвучиваем советы
    setTimeout(() => {
        const tipsSpeech = `Советы для улучшения: ${analysis.tips.join('. ')}`;
        speakText(tipsSpeech, 0.9);
    }, analysis.feedback.length * 50 + 1000); // Динамическая пауза
}

// ==================== КАМЕРА И МИКРОФОН ====================
async function startCamera() {
    console.log('📹 Включаю камеру...');
    
    try {
        userVideoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        
        // Показываем видео
        elements.userVideo.srcObject = userVideoStream;
        elements.userVideo.style.display = 'block';
        elements.userVideoBox.querySelector('.placeholder').style.display = 'none';
        
        // Обновляем кнопку
        elements.startCameraBtn.textContent = '📹 Камера включена';
        elements.startCameraBtn.disabled = true;
        elements.toggleMicBtn.disabled = false;
        
        console.log('✅ Камера включена');
        
    } catch (error) {
        console.error('❌ Ошибка камеры:', error);
        elements.voiceStatus.textContent = 'Камера недоступна';
    }
}

async function toggleMicrophone() {
    if (!userAudioStream) {
        // Включаем микрофон
        try {
            userAudioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            elements.toggleMicBtn.textContent = '🎤 Микрофон вкл';
            console.log('✅ Микрофон включен');
        } catch (error) {
            console.error('❌ Ошибка микрофона:', error);
        }
    } else {
        // Выключаем микрофон
        userAudioStream.getTracks().forEach(track => track.stop());
        userAudioStream = null;
        elements.toggleMicBtn.textContent = '🎤 Вкл микрофон';
        console.log('🔇 Микрофон выключен');
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
elements.submitBtn.addEventListener('click', submitAnswer);

elements.hintBtn.addEventListener('click', () => {
    const question = questions[currentQuestionIndex];
    const hintText = `Пример ответа: ${question.good_answer.substring(0, 150)}...`;
    speakText(hintText, 0.8);
});

elements.nextBtn.addEventListener('click', () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    showQuestion();
});

elements.startCameraBtn.addEventListener('click', startCamera);
elements.toggleMicBtn.addEventListener('click', toggleMicrophone);

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function initApp() {
    console.log('🚀 Запускаю ИИ-HR тренер...');
    
    // Загружаем вопросы
    await loadQuestions();
    
    // Инициализируем распознавание речи
    initSpeechRecognition();
    
    // Загружаем голоса для синтеза
    if (speechSynthesis) {
        speechSynthesis.getVoices(); // Инициализация голосов
    }
    
    // Приветствие
    setTimeout(() => {
        speakText("Привет! Я ваш ИИ-HR тренер. Отвечайте на вопросы голосом, и я помогу подготовиться к собеседованию.");
    }, 1500);
    
    console.log('✅ Приложение готово к работе!');
}

// ==================== ЗАПУСК ПРИЛОЖЕНИЯ ====================
// Ждем полной загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
