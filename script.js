// Данные вопросов (пока заглушка, потом заменишь questions.json)
let questions = [
  {
    question: "Расскажите о себе",
    category: "soft skills",
    good_answer: "Я Middle Python-разработчик с 3 годами опыта...",
    tips: ["Свяжи опыт с вакансией", "Упомяни конкретные метрики"]
  }
];

let currentQuestionIndex = 0;

// Элементы DOM
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

// Загрузка вопросов из JSON
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        updateQuestion();
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        // Используем встроенные вопросы как fallback
        updateQuestion();
    }
}

// Обновление текущего вопроса
function updateQuestion() {
    const question = questions[currentQuestionIndex];
    hrQuestionEl.innerHTML = `
        <strong>Вопрос ${currentQuestionIndex + 1}:</strong> ${question.question}
        <br><small>Категория: ${question.category}</small>
    `;
    
    // Сброс формы
    userAnswerEl.value = '';
    feedbackEl.classList.add('hidden');
    
    // Обновление прогресса
    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBarEl.style.width = `${progressPercent}%`;
    currentQuestionEl.textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = questions.length;
}

// Анализ ответа (простая версия)
function analyzeAnswer(userAnswer) {
    const question = questions[currentQuestionIndex];
    const goodAnswer = question.good_answer.toLowerCase();
    const userAnswerLower = userAnswer.toLowerCase();
    
    let score = 5; // Базовая оценка
    
    // Простейший анализ (позже заменим на ИИ)
    if (userAnswer.length < 50) score -= 2;
    if (userAnswer.length > 200) score += 1;
    
    // Проверка ключевых слов
    const keywords = ['опыт', 'проект', 'задачи', 'результат'];
    keywords.forEach(keyword => {
        if (userAnswerLower.includes(keyword)) score += 0.5;
    });
    
    // Ограничиваем оценку
    score = Math.max(1, Math.min(10, Math.round(score)));
    
    return {
        score: score,
        feedback: score >= 7 ? 
            'Отличный ответ! Структурировано и по делу.' :
            'Неплохо, но можно улучшить. Обрати внимание на подсказки ниже.',
        tips: question.tips
    };
}

// Обработчики событий
submitBtn.addEventListener('click', () => {
    const userAnswer = userAnswerEl.value.trim();
    if (!userAnswer) {
        alert('Пожалуйста, напиши ответ!');
        return;
    }
    
    const analysis = analyzeAnswer(userAnswer);
    
    // Показываем оценку
    scoreValueEl.textContent = `${analysis.score}/10`;
    feedbackTextEl.textContent = analysis.feedback;
    tipsEl.innerHTML = `<strong>Подсказки для улучшения:</strong><br>${analysis.tips.join('<br>')}`;
    
    feedbackEl.classList.remove('hidden');
});

hintBtn.addEventListener('click', () => {
    const question = questions[currentQuestionIndex];
    alert(`💡 Подсказка: ${question.tips[0]}\n\nПример хорошего ответа:\n${question.good_answer.substring(0, 200)}...`);
});

nextBtn.addEventListener('click', () => {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
    updateQuestion();
});

// Камера (простейшая реализация)
document.getElementById('startCameraBtn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
        });
        
        const videoBox = document.querySelector('.video-box');
        videoBox.innerHTML = '';
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.borderRadius = '10px';
        
        videoBox.appendChild(video);
        
        // Меняем кнопку
        const btn = document.getElementById('startCameraBtn');
        btn.textContent = '📹 Камера включена';
        btn.disabled = true;
        btn.style.background = '#48bb78';
        
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
        alert('Не удалось включить камеру. Проверь разрешения.');
    }
});

// Инициализация
loadQuestions();
