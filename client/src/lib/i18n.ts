// Russian localization for HLR Bulk Checker
// All UI text is in Russian

export const t = {
  // Common
  loading: "Загрузка...",
  save: "Сохранить",
  cancel: "Отмена",
  delete: "Удалить",
  edit: "Редактировать",
  create: "Создать",
  close: "Закрыть",
  yes: "Да",
  no: "Нет",
  search: "Поиск",
  filter: "Фильтр",
  exportWord: "Экспорт",
  download: "Скачать",
  upload: "Загрузить",
  view: "Просмотр",
  actions: "Действия",
  status: "Статус",
  date: "Дата",
  name: "Название",
  all: "Все",
  
  // Auth
  auth: {
    welcomeBack: "Добро пожаловать",
    signIn: "Войти",
    signOut: "Выйти",
    username: "Имя пользователя",
    password: "Пароль",
    enterUsername: "Введите имя пользователя",
    enterPassword: "Введите пароль",
    signInToAccess: "Войдите для доступа к HLR Checker",
    contactAdmin: "Свяжитесь с администратором для получения аккаунта",
    invalidCredentials: "Неверное имя пользователя или пароль",
    accountLocked: "Аккаунт заблокирован. Попробуйте через 15 минут.",
    attemptsRemaining: "Осталось попыток",
  },
  
  // Navigation
  nav: {
    hlrChecker: "HLR Проверка",
    history: "История",
    statistics: "Статистика",
    admin: "Админ",
    allHistory: "Вся история",
  },
  
  // Home page
  home: {
    title: "HLR Bulk Checker",
    subtitle: "Проверка телефонных номеров через Seven.io HLR lookup",
    apiBalance: "Баланс API",
    
    // Quick check
    quickCheck: "Быстрая проверка",
    quickCheckDesc: "Проверить один номер мгновенно",
    enterPhoneNumber: "Введите номер телефона",
    
    // Batch input
    phoneNumbers: "Телефонные номера",
    phoneNumbersDesc: "Введите номера через запятую или с новой строки, или загрузите CSV файл",
    batchName: "Название проверки (необязательно)",
    batchNamePlaceholder: "например, Кампания Q1 2026",
    textInput: "Текстовый ввод",
    fileUpload: "Загрузка файла",
    numbersDetected: "номеров обнаружено",
    clickToUpload: "Нажмите для загрузки",
    orDragDrop: "или перетащите файл",
    csvOrTxt: "CSV или TXT файл с номерами",
    numbersLoaded: "номеров загружено из файла",
    
    // Check button
    checkNumbers: "Проверить",
    processing: "Обработка...",
    
    // History
    checkHistory: "История проверок",
    checkHistoryDesc: "Просмотр и управление предыдущими проверками",
    noChecksYet: "Проверок пока нет",
    startByEntering: "Начните с ввода номеров выше",
    valid: "валидных",
    
    // Results
    results: "Результаты",
    resultsOf: "из",
    exportCSV: "Экспорт CSV",
    exportSettings: "Настройки экспорта",
    noResultsMatch: "Нет результатов по заданным фильтрам",
    
    // Table headers
    phoneNumber: "Номер телефона",
    operator: "Оператор",
    country: "Страна",
    roaming: "Роуминг",
    ported: "Портирован",
    health: "Качество",
    
    // Status
    statusValid: "Валидный",
    statusInvalid: "Невалидный",
    statusUnknown: "Неизвестно",
    allStatus: "Все статусы",
    allCountries: "Все страны",
    allOperators: "Все операторы",
    
    // Single check result
    international: "Международный",
    carrier: "Оператор",
    network: "Сеть",
    healthScore: "Оценка качества",
    status: "Статус",
  },
  
  // Cost calculator
  cost: {
    analyzing: "Анализ номеров...",
    uniqueNumbers: "уникальных номеров",
    duplicates: "дубликатов",
    noDuplicates: "Без дубликатов",
    estimatedCost: "Ориентировочная стоимость",
    perNumber: "/номер",
    duplicatesFound: "Найдены дубликаты",
    remove: "Удалить",
    duplicatesRemoved: "Дубликаты удалены",
    multipleAppearances: "номеров повторяются. Дубликаты будут автоматически удалены при проверке.",
  },
  
  // Health score
  health: {
    healthScore: "Оценка качества",
    excellent: "Отлично",
    good: "Хорошо",
    fair: "Удовлетворительно",
    poor: "Плохо",
    bad: "Очень плохо",
    score: "Оценка качества",
    qualityNumber: "качество номера",
    basedOn: "На основе:",
    validity: "Валидность",
    reachability: "Достижимость",
    portingStatus: "Статус портирования",
    roamingStatus: "Статус роуминга",
    networkType: "Тип сети",
    pts: "баллов",
  },
  
  // Common actions
  common: {
    cancel: "Отмена",
    close: "Закрыть",
    save: "Сохранить",
    delete: "Удалить",
    edit: "Редактировать",
  },
  
  // Export settings and templates
  export: {
    exportSettings: "Настройки экспорта",
    exportTemplates: "Шаблоны экспорта",
    description: "Создавайте и управляйте шаблонами экспорта для выбора полей в CSV",
    savedTemplates: "Сохранённые шаблоны",
    noTemplates: "Шаблонов пока нет",
    fields: "полей",
    use: "Использовать",
    default: "По умолчанию",
    createNew: "Создать новый шаблон",
    templateName: "Название шаблона",
    templateNamePlaceholder: "например, Базовый экспорт, Полные данные...",
    selectFields: "Выберите поля",
    selectAll: "Выбрать все",
    clear: "Очистить",
    saveTemplate: "Сохранить шаблон",
    quickExport: "Быстрый экспорт",
    basic: "Базовый",
    standard: "Стандартный",
    full: "Полный",
    allFields: "все поля",
    templateCreated: "Шаблон создан",
    templateDeleted: "Шаблон удалён",
    templateApplied: "Шаблон применён",
    defaultUpdated: "Шаблон по умолчанию обновлён",
    enterTemplateName: "Введите название шаблона",
    selectAtLeastOne: "Выберите хотя бы одно поле",
    failedToCreate: "Не удалось создать шаблон",
    failedToDelete: "Не удалось удалить шаблон",
    failedToUpdate: "Не удалось обновить шаблон",
  },
  
  
  
  // History page
  history: {
    title: "История проверок",
    subtitle: "Просмотр всех предыдущих HLR проверок",
    searchPlaceholder: "Поиск по названию...",
    batchName: "Название",
    total: "Всего",
    completed: "Завершено",
    noBatches: "Проверок не найдено",
    deleteConfirm: "Удалить проверку",
    deleteConfirmDesc: "Вы уверены, что хотите удалить эту проверку? Все результаты будут удалены.",
    batchDeleted: "Проверка удалена",
  },
  
  // Statistics page
  stats: {
    title: "Статистика",
    subtitle: "Обзор использования HLR проверок",
    totalBatches: "Всего проверок",
    totalChecks: "Всего номеров",
    validNumbers: "Валидных",
    invalidNumbers: "Невалидных",
    checksToday: "Проверок сегодня",
    checksThisMonth: "Проверок за месяц",
    yourLimits: "Ваши лимиты",
    daily: "Дневной",
    monthly: "Месячный",
    unlimited: "Без ограничений",
  },
  
  // Admin page
  admin: {
    title: "Панель администратора",
    subtitle: "Управление пользователями HLR Checker",
    accessDenied: "Доступ запрещён",
    accessDeniedDesc: "У вас нет прав для доступа к панели администратора. Только администраторы могут управлять пользователями.",
    goToDashboard: "Перейти на главную",
    
    // Users
    allUsers: "Все пользователи",
    registeredUsers: "зарегистрированных пользователей",
    createUser: "Создать пользователя",
    createNewUser: "Создать нового пользователя",
    createNewUserDesc: "Создание нового аккаунта с логином и паролем",
    user: "Пользователь",
    email: "Email",
    role: "Роль",
    lastSignIn: "Последний вход",
    active: "Активен",
    inactive: "Неактивен",
    you: "Вы",
    
    // User form
    usernameRequired: "Имя пользователя *",
    passwordRequired: "Пароль *",
    displayName: "Отображаемое имя",
    minChars: "минимум 6 символов",
    optional: "необязательно",
    
    // Actions
    resetPassword: "Сбросить пароль",
    setLimits: "Установить лимиты",
    deactivateUser: "Деактивировать",
    activateUser: "Активировать",
    deleteUser: "Удалить пользователя",
    deleteUserConfirm: "Вы уверены, что хотите удалить",
    deleteUserDesc: "Это также удалит всю историю HLR проверок пользователя.",
    
    // Limits
    setUserLimits: "Установить лимиты пользователя",
    setUserLimitsDesc: "Настройка дневных и месячных лимитов проверок для",
    dailyLimit: "Дневной лимит",
    monthlyLimit: "Месячный лимит",
    zeroUnlimited: "0 = Без ограничений",
    limitsUpdated: "Лимиты обновлены",
    
    // Messages
    userCreated: "Пользователь создан",
    userDeleted: "Пользователь удалён",
    roleUpdated: "Роль обновлена",
    userActivated: "Пользователь активирован",
    userDeactivated: "Пользователь деактивирован",
    passwordReset: "Пароль сброшен",
    cannotDeleteSelf: "Нельзя удалить себя",
    cannotDemoteSelf: "Нельзя понизить себя",
    cannotDeactivateSelf: "Нельзя деактивировать себя",
    usernameExists: "Имя пользователя уже существует",
    enterNewPassword: "Введите новый пароль для",
  },
  
  // Admin History page
  adminHistory: {
    title: "История всех пользователей",
    subtitle: "Просмотр истории HLR проверок всех пользователей и админов",
    searchPlaceholder: "Поиск по названию или пользователю...",
    filterByUser: "Фильтр по пользователю",
    allUsers: "Все пользователи",
    checkHistory: "История проверок",
    batchesFound: "проверок найдено",
    batchResults: "Результаты проверки",
  },
  
  // Field labels for export
  fields: {
    phoneNumber: "Номер телефона",
    internationalFormat: "Международный формат",
    nationalFormat: "Национальный формат",
    validNumber: "Валидность",
    reachable: "Достижимость",
    countryName: "Страна",
    countryCode: "Код страны",
    countryPrefix: "Префикс страны",
    currentCarrierName: "Текущий оператор",
    currentNetworkType: "Тип сети",
    originalCarrierName: "Оригинальный оператор",
    ported: "Портирован",
    roaming: "Роуминг",
    healthScore: "Оценка качества",
    status: "Статус",
    errorMessage: "Сообщение об ошибке",
  },
  
  // Roaming/Ported status
  roamingStatus: {
    not_roaming: "Не в роуминге",
    roaming: "В роуминге",
    unknown: "Неизвестно",
  },
  
  portedStatus: {
    not_ported: "Не портирован",
    ported: "Портирован",
    assumed_not_ported: "Предположительно не портирован",
    assumed_ported: "Предположительно портирован",
    unknown: "Неизвестно",
  },
};

export default t;
