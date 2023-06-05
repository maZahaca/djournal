
export const helloMessage = (): string[] => [
  `Привет!`,
  `Я психотерапевт, в моей основе — искусственный интеллект 🤖`,
  `Чтобы я мог дать полезные рекомендации, опиши свое состояние, расскажи о своих эиоциях или просто опиши свой день ✍️`,
  `Разговоры записываются для улучшения ИИ`,
];

export const systemError = () => `Бот работает в тестовом режиме и у него ограниченные возможности, мы не может обработать так много сообщений. Приходите завтра`;

export const buttonIDontKnowWhatToWrite = () => `Я не знаю о чем писать`;
export const textIDontKnowWhatToWrite = () => `Или выбирай:`;

export const whatToWriteAbout = (): string[] => [
  `Вот несколько наводящих вопросов:`,
  `1. Какие основные события или моменты произошли сегодня?`,
  `2. Какие чувства или эмоции вы испытали сегодня?`,
  `3. Есть ли определенная тема или фокус, которую вы хотели бы обсудить`,
];

export const badAIResponse = (): string => `К сожалению,`;
export const notCorrectDiaryMessage = () => `Похоже, это не в моей компетенции, поделитесь вашими чувствами, переживаниями или просто опишите свой день.`;

export const feedbackMessage1 = (): string => `Расскажите что вам **понравилось** в опыте использования бота. Это поможет сделать сервис лучше 👇`;
export const feedbackMessage2 = (): string => `Спасибо. Расскажите что бы вы хотели **улучшить** в опыте использования бота 👇`;
export const feedbackMessage3 = (): string => `Класс. И, наконец, что бы вы хотели **убрать** из текущей реализации? Что вам не понравилось 👇`;

export const feedbackMessageFinish = (): string => `Спасибо за фидбек! 😊`;

export const helpMessages = (): string[] => [
  `Привет!`,
  `Я психотерапевт, в моей основе — искусственный интеллект 🤖`,
  `Вот команды, которые я понимаю:`,
  `/start — начать диалог заново`,
  `/feedback — оставить фидбек`,
  `/subscribe — подписаться на платную версию`,
  `/help — показать это сообщение`,
];

export const diaryAIMessageV3 = (userMessage: string): string => `
Проанализируй сообщение и постарайся понять похоже ли это сообщение на вопрос, связанный с психотерапией? Не пиши "Похоже, что это сообщение имеет отношение к психотерапии."  

Если ответ нет, то напиши "${notCorrectDiaryMessage()}". 
Если ответ да, то ответь на сообщение как будто ты психотерапевт, не говоря что ты действуешь как психотерапевт, обращайся на ты. Разбей ответ на абзацы, напиши 2 или 3 абзаца. Не давай совет обратиться к специалисту. 

Ниже сообщение которое надо проанализировать
'${userMessage}'
`;

export const diaryAISummary = (): string => `
проанализируй свой ответ, выдели основные мысли. Сделай список из 3 пунктов, длинна пункта 1-2 слова. пункты должны быть темами, которые можно развить как продолжение твоего ответа. проверь, чтобы написанные тобой пункты имели отношение к психотерапии. если ты найдешь пункты, которые не относятся к психотерапии, то исключи их
`;

export const diaryUserSummary = (): string => `
Выберите о чем вы хотели бы узнать подробнее 👇
`;

export const diaryAISummaryRecommend = (userMessage: string): string => `
Расскажи подробнее как это сделать правильно, порекомендуй техники и упраждения для пункта "${userMessage}"
`;

export const subscriptionHeader = (): string => `
Мы работаем в тестовом режиме, поэтому количество запросов ограничено, чтобы продолжить использование необходимо подписаться
`;

export const subscriptionNotReady = (): string => `
Не готов
`;

export const subscriptionSubscribed = (): string => `
Спасибо! Мы тестируем спрос на подписку, бот напишет когда это станет возможно 🤝
`;

export const subscriptionNotSubscribed = (): string => `
Жаль, что ты не готов платить за этого бота, расскажи что тебе понравилось и что хотелось бы улучшить, можно просто сообщением. Спасибо!
`;
