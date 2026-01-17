import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  HelpCircle, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Phone, 
  Upload, 
  Download, 
  RefreshCw,
  Shield,
  Zap,
  FileText,
  MessageCircle
} from "lucide-react";

export default function HelpCenter() {
  const { t, language } = useLanguage();
  
  // Content based on language
  const content = getContent(language);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            {content.title}
          </h1>
          <p className="text-muted-foreground">{content.subtitle}</p>
        </div>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {content.quickStart.title}
            </CardTitle>
            <CardDescription>{content.quickStart.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step1.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step1.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step2.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step2.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step3.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step3.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step4.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step4.desc}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HLR Response Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {content.hlrCodes.title}
            </CardTitle>
            <CardDescription>{content.hlrCodes.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Meanings */}
            <div>
              <h4 className="font-semibold mb-3">{content.hlrCodes.statusTitle}</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <span className="font-medium text-green-500">valid / reachable</span>
                    <p className="text-sm text-muted-foreground">{content.hlrCodes.valid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <span className="font-medium text-red-500">invalid / not reachable</span>
                    <p className="text-sm text-muted-foreground">{content.hlrCodes.invalid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <span className="font-medium text-yellow-500">unknown / absent</span>
                    <p className="text-sm text-muted-foreground">{content.hlrCodes.unknown}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* GSM Codes Table */}
            <div>
              <h4 className="font-semibold mb-3">{content.hlrCodes.gsmTitle}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">{content.hlrCodes.code}</th>
                      <th className="text-left py-2 px-3">{content.hlrCodes.meaning}</th>
                      <th className="text-left py-2 px-3">{content.hlrCodes.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.hlrCodes.gsmCodes.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-2 px-3">
                          <Badge variant="outline">{item.code}</Badge>
                        </td>
                        <td className="py-2 px-3">{item.meaning}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Fields */}
            <div>
              <h4 className="font-semibold mb-3">{content.hlrCodes.fieldsTitle}</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {content.hlrCodes.fields.map((field, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-primary">{field.name}</span>
                    <p className="text-sm text-muted-foreground">{field.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              {content.features.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="single">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {content.features.single.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {content.features.single.desc}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="batch">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {content.features.batch.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {content.features.batch.desc}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="export">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {content.features.export.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {content.features.export.desc}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="cache">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {content.features.cache.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {content.features.cache.desc}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tools">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {content.features.tools.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {content.features.tools.desc}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* FAQ / Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {content.faq.title}
            </CardTitle>
            <CardDescription>{content.faq.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {content.faq.items.map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="hover:no-underline text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{content.support.title}</h4>
                <p className="text-sm text-muted-foreground">{content.support.desc}</p>
              </div>
              <a 
                href="https://t.me/toskaqwe1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {content.support.button}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function getContent(lang: string) {
  const content = {
    ru: {
      title: "Справочный центр",
      subtitle: "Руководство по использованию HLR Checker и расшифровка результатов",
      quickStart: {
        title: "Быстрый старт",
        description: "Начните проверку номеров за 4 простых шага",
        step1: { title: "Введите номера", desc: "Введите номера вручную или загрузите файл CSV/TXT" },
        step2: { title: "Запустите проверку", desc: "Нажмите кнопку 'Проверить' для начала HLR запроса" },
        step3: { title: "Дождитесь результатов", desc: "Система проверит каждый номер через сеть оператора" },
        step4: { title: "Экспортируйте данные", desc: "Скачайте результаты в CSV или Excel формате" },
      },
      hlrCodes: {
        title: "Расшифровка HLR ответов",
        description: "Понимание статусов и GSM кодов для правильной интерпретации результатов",
        statusTitle: "Основные статусы",
        valid: "Номер активен, SIM-карта в сети, абонент доступен для звонков и SMS",
        invalid: "Номер не существует, отключен или заблокирован оператором",
        unknown: "Временно недоступен (телефон выключен, нет сети, роуминг)",
        gsmTitle: "GSM коды ошибок",
        code: "Код",
        meaning: "Значение",
        action: "Рекомендация",
        gsmCodes: [
          { code: "0", meaning: "Успешно - номер валиден", action: "Можно использовать" },
          { code: "1", meaning: "Неизвестный абонент", action: "Удалить из базы" },
          { code: "6", meaning: "Абонент отсутствует", action: "Повторить позже" },
          { code: "7", meaning: "Входящие запрещены", action: "Проверить вручную" },
          { code: "8", meaning: "Роуминг запрещен", action: "Номер в роуминге" },
          { code: "11", meaning: "Teleservice не поддерживается", action: "Проверить тип номера" },
          { code: "13", meaning: "Вызов заблокирован", action: "Номер заблокирован" },
          { code: "21", meaning: "Нет ответа от сети", action: "Повторить позже" },
          { code: "27", meaning: "Абонент недоступен", action: "Телефон выключен" },
          { code: "31", meaning: "Сетевая ошибка", action: "Повторить позже" },
        ],
        fieldsTitle: "Дополнительные поля",
        fields: [
          { name: "Ported", desc: "Номер перенесен к другому оператору (MNP)" },
          { name: "Roaming", desc: "Абонент находится в роуминге" },
          { name: "Current Carrier", desc: "Текущий оператор (после переноса)" },
          { name: "Original Carrier", desc: "Изначальный оператор номера" },
          { name: "Country", desc: "Страна регистрации номера" },
          { name: "Health Score", desc: "Оценка качества номера (0-100)" },
        ],
      },
      features: {
        title: "Возможности сервиса",
        single: {
          title: "Быстрая проверка одного номера",
          desc: "Используйте поле 'Быстрая проверка' на главной странице для мгновенной проверки одного номера. Результат появится сразу после запроса. Идеально для проверки отдельных контактов перед звонком.",
        },
        batch: {
          title: "Массовая проверка (Batch)",
          desc: "Загрузите список номеров через текстовое поле (по одному на строку или через запятую) или файл CSV/TXT. Поддерживается неограниченное количество номеров. Результаты сохраняются автоматически, даже если проверка прервется - вы сможете возобновить её.",
        },
        export: {
          title: "Экспорт результатов",
          desc: "Скачивайте результаты в форматах CSV или Excel (XLSX). Доступны фильтры: все номера, только валидные, только невалидные. Экспорт включает все поля: номер, статус, оператор, страна, роуминг, портирование.",
        },
        cache: {
          title: "Кэширование результатов",
          desc: "Система автоматически кэширует результаты проверок на 24 часа. При повторной проверке того же номера используются сохраненные данные без дополнительного API запроса. Это экономит деньги и ускоряет проверку.",
        },
        tools: {
          title: "Инструменты (очистка дубликатов)",
          desc: "Раздел 'Инструменты' позволяет очистить список номеров от дубликатов перед проверкой. Загрузите файл или вставьте текст - система найдет и удалит повторяющиеся номера. Это бесплатно и не тратит API запросы.",
        },
      },
      faq: {
        title: "Решение проблем",
        description: "Ответы на частые вопросы и решения типичных проблем",
        items: [
          {
            q: "Номер показывает 'invalid', но я уверен что он рабочий",
            a: "HLR проверяет статус в реальном времени. Если номер показывает 'invalid', возможно: 1) SIM-карта временно заблокирована, 2) Абонент сменил номер, 3) Долг перед оператором. Попробуйте проверить через несколько часов или свяжитесь с абонентом другим способом.",
          },
          {
            q: "Проверка остановилась на середине списка",
            a: "Не волнуйтесь! Все проверенные номера уже сохранены. Найдите батч в истории проверок и нажмите кнопку 'Возобновить' - система продолжит с того места, где остановилась.",
          },
          {
            q: "Почему некоторые номера показывают 'unknown'?",
            a: "Статус 'unknown' означает, что сеть оператора не дала точного ответа. Причины: телефон выключен, абонент в зоне без покрытия, или оператор не поддерживает HLR запросы. Рекомендуем повторить проверку через несколько часов.",
          },
          {
            q: "Как правильно форматировать номера?",
            a: "Номера должны быть в международном формате с кодом страны: +49176123456 или 49176123456. Система автоматически нормализует номера, но лучше сразу использовать правильный формат. Не используйте пробелы, скобки или дефисы.",
          },
          {
            q: "Что означает 'Ported: yes'?",
            a: "Это значит, что абонент перенес номер от одного оператора к другому (MNP - Mobile Number Portability). В поле 'Current Carrier' будет текущий оператор, а в 'Original Carrier' - изначальный. Номер при этом полностью рабочий.",
          },

          {
            q: "Как узнать свой лимит проверок?",
            a: "Ваши лимиты отображаются на главной странице в разделе 'Лимиты использования'. Если у вас установлен дневной или месячный лимит, вы увидите прогресс-бар с использованием. Если лимита нет - показывается 'без лимита'.",
          },
          {
            q: "Файл не загружается / ошибка формата",
            a: "Поддерживаются форматы: CSV, TXT, XLSX. Файл должен содержать номера телефонов (по одному на строку или в первой колонке). Убедитесь, что файл не поврежден и имеет правильную кодировку (UTF-8). Максимальный размер файла - 10 МБ.",
          },
          {
            q: "Что такое Health Score?",
            a: "Health Score (0-100) - это комплексная оценка качества номера. Учитываются: валидность, достижимость, история проверок, портирование, роуминг. Чем выше балл - тем надежнее номер. Score > 70 считается хорошим.",
          },
          {
            q: "Как связаться с поддержкой?",
            a: "Напишите в Telegram: @toskaqwe1. Мы отвечаем в течение 24 часов в рабочие дни. При обращении укажите ваш логин и опишите проблему подробно.",
          },
        ],
      },
      support: {
        title: "Нужна помощь?",
        desc: "Свяжитесь с нами в Telegram для получения поддержки",
        button: "Написать в Telegram",
      },
    },
    uk: {
      title: "Довідковий центр",
      subtitle: "Посібник з використання HLR Checker та розшифровка результатів",
      quickStart: {
        title: "Швидкий старт",
        description: "Почніть перевірку номерів за 4 простих кроки",
        step1: { title: "Введіть номери", desc: "Введіть номери вручну або завантажте файл CSV/TXT" },
        step2: { title: "Запустіть перевірку", desc: "Натисніть кнопку 'Перевірити' для початку HLR запиту" },
        step3: { title: "Дочекайтесь результатів", desc: "Система перевірить кожен номер через мережу оператора" },
        step4: { title: "Експортуйте дані", desc: "Завантажте результати у CSV або Excel форматі" },
      },
      hlrCodes: {
        title: "Розшифровка HLR відповідей",
        description: "Розуміння статусів та GSM кодів для правильної інтерпретації результатів",
        statusTitle: "Основні статуси",
        valid: "Номер активний, SIM-картка в мережі, абонент доступний для дзвінків та SMS",
        invalid: "Номер не існує, відключений або заблокований оператором",
        unknown: "Тимчасово недоступний (телефон вимкнено, немає мережі, роумінг)",
        gsmTitle: "GSM коди помилок",
        code: "Код",
        meaning: "Значення",
        action: "Рекомендація",
        gsmCodes: [
          { code: "0", meaning: "Успішно - номер валідний", action: "Можна використовувати" },
          { code: "1", meaning: "Невідомий абонент", action: "Видалити з бази" },
          { code: "6", meaning: "Абонент відсутній", action: "Повторити пізніше" },
          { code: "7", meaning: "Вхідні заборонені", action: "Перевірити вручну" },
          { code: "8", meaning: "Роумінг заборонено", action: "Номер у роумінгу" },
          { code: "11", meaning: "Teleservice не підтримується", action: "Перевірити тип номера" },
          { code: "13", meaning: "Виклик заблоковано", action: "Номер заблоковано" },
          { code: "21", meaning: "Немає відповіді від мережі", action: "Повторити пізніше" },
          { code: "27", meaning: "Абонент недоступний", action: "Телефон вимкнено" },
          { code: "31", meaning: "Мережева помилка", action: "Повторити пізніше" },
        ],
        fieldsTitle: "Додаткові поля",
        fields: [
          { name: "Ported", desc: "Номер перенесено до іншого оператора (MNP)" },
          { name: "Roaming", desc: "Абонент знаходиться в роумінгу" },
          { name: "Current Carrier", desc: "Поточний оператор (після перенесення)" },
          { name: "Original Carrier", desc: "Початковий оператор номера" },
          { name: "Country", desc: "Країна реєстрації номера" },
          { name: "Health Score", desc: "Оцінка якості номера (0-100)" },
        ],
      },
      features: {
        title: "Можливості сервісу",
        single: {
          title: "Швидка перевірка одного номера",
          desc: "Використовуйте поле 'Швидка перевірка' на головній сторінці для миттєвої перевірки одного номера. Результат з'явиться одразу після запиту. Ідеально для перевірки окремих контактів перед дзвінком.",
        },
        batch: {
          title: "Масова перевірка (Batch)",
          desc: "Завантажте список номерів через текстове поле (по одному на рядок або через кому) або файл CSV/TXT. Підтримується необмежена кількість номерів. Результати зберігаються автоматично, навіть якщо перевірка перерветься - ви зможете відновити її.",
        },
        export: {
          title: "Експорт результатів",
          desc: "Завантажуйте результати у форматах CSV або Excel (XLSX). Доступні фільтри: всі номери, тільки валідні, тільки невалідні. Експорт включає всі поля: номер, статус, оператор, країна, роумінг, портування.",
        },
        cache: {
          title: "Кешування результатів",
          desc: "Система автоматично кешує результати перевірок на 24 години. При повторній перевірці того ж номера використовуються збережені дані без додаткового API запиту. Це економить гроші та прискорює перевірку.",
        },
        tools: {
          title: "Інструменти (очищення дублікатів)",
          desc: "Розділ 'Інструменти' дозволяє очистити список номерів від дублікатів перед перевіркою. Завантажте файл або вставте текст - система знайде та видалить повторювані номери. Це безкоштовно та не витрачає API запити.",
        },
      },
      faq: {
        title: "Вирішення проблем",
        description: "Відповіді на часті питання та вирішення типових проблем",
        items: [
          {
            q: "Номер показує 'invalid', але я впевнений що він робочий",
            a: "HLR перевіряє статус в реальному часі. Якщо номер показує 'invalid', можливо: 1) SIM-картка тимчасово заблокована, 2) Абонент змінив номер, 3) Борг перед оператором. Спробуйте перевірити через кілька годин або зв'яжіться з абонентом іншим способом.",
          },
          {
            q: "Перевірка зупинилася на середині списку",
            a: "Не хвилюйтесь! Всі перевірені номери вже збережені. Знайдіть батч в історії перевірок та натисніть кнопку 'Відновити' - система продовжить з того місця, де зупинилася.",
          },
          {
            q: "Чому деякі номери показують 'unknown'?",
            a: "Статус 'unknown' означає, що мережа оператора не дала точної відповіді. Причини: телефон вимкнено, абонент у зоні без покриття, або оператор не підтримує HLR запити. Рекомендуємо повторити перевірку через кілька годин.",
          },
          {
            q: "Як правильно форматувати номери?",
            a: "Номери повинні бути в міжнародному форматі з кодом країни: +49176123456 або 49176123456. Система автоматично нормалізує номери, але краще одразу використовувати правильний формат. Не використовуйте пробіли, дужки або дефіси.",
          },
          {
            q: "Що означає 'Ported: yes'?",
            a: "Це означає, що абонент переніс номер від одного оператора до іншого (MNP - Mobile Number Portability). В полі 'Current Carrier' буде поточний оператор, а в 'Original Carrier' - початковий. Номер при цьому повністю робочий.",
          },

          {
            q: "Як дізнатися свій ліміт перевірок?",
            a: "Ваші ліміти відображаються на головній сторінці в розділі 'Ліміти використання'. Якщо у вас встановлено денний або місячний ліміт, ви побачите прогрес-бар з використанням. Якщо ліміту немає - показується 'без ліміту'.",
          },
          {
            q: "Файл не завантажується / помилка формату",
            a: "Підтримуються формати: CSV, TXT, XLSX. Файл повинен містити номери телефонів (по одному на рядок або в першій колонці). Переконайтесь, що файл не пошкоджений та має правильне кодування (UTF-8). Максимальний розмір файлу - 10 МБ.",
          },
          {
            q: "Що таке Health Score?",
            a: "Health Score (0-100) - це комплексна оцінка якості номера. Враховуються: валідність, досяжність, історія перевірок, портування, роумінг. Чим вищий бал - тим надійніший номер. Score > 70 вважається хорошим.",
          },
          {
            q: "Як зв'язатися з підтримкою?",
            a: "Напишіть у Telegram: @toskaqwe1. Ми відповідаємо протягом 24 годин у робочі дні. При зверненні вкажіть ваш логін та опишіть проблему детально.",
          },
        ],
      },
      support: {
        title: "Потрібна допомога?",
        desc: "Зв'яжіться з нами в Telegram для отримання підтримки",
        button: "Написати в Telegram",
      },
    },
    en: {
      title: "Help Center",
      subtitle: "Guide to using HLR Checker and understanding results",
      quickStart: {
        title: "Quick Start",
        description: "Start checking numbers in 4 simple steps",
        step1: { title: "Enter numbers", desc: "Enter numbers manually or upload CSV/TXT file" },
        step2: { title: "Start check", desc: "Click 'Check' button to start HLR request" },
        step3: { title: "Wait for results", desc: "System will verify each number through carrier network" },
        step4: { title: "Export data", desc: "Download results in CSV or Excel format" },
      },
      hlrCodes: {
        title: "HLR Response Codes",
        description: "Understanding statuses and GSM codes for correct result interpretation",
        statusTitle: "Main Statuses",
        valid: "Number is active, SIM card in network, subscriber available for calls and SMS",
        invalid: "Number doesn't exist, disconnected or blocked by carrier",
        unknown: "Temporarily unavailable (phone off, no coverage, roaming)",
        gsmTitle: "GSM Error Codes",
        code: "Code",
        meaning: "Meaning",
        action: "Recommendation",
        gsmCodes: [
          { code: "0", meaning: "Success - number is valid", action: "Can be used" },
          { code: "1", meaning: "Unknown subscriber", action: "Remove from database" },
          { code: "6", meaning: "Absent subscriber", action: "Retry later" },
          { code: "7", meaning: "Incoming calls barred", action: "Check manually" },
          { code: "8", meaning: "Roaming not allowed", action: "Number in roaming" },
          { code: "11", meaning: "Teleservice not supported", action: "Check number type" },
          { code: "13", meaning: "Call barred", action: "Number blocked" },
          { code: "21", meaning: "No response from network", action: "Retry later" },
          { code: "27", meaning: "Subscriber not reachable", action: "Phone is off" },
          { code: "31", meaning: "Network error", action: "Retry later" },
        ],
        fieldsTitle: "Additional Fields",
        fields: [
          { name: "Ported", desc: "Number transferred to another carrier (MNP)" },
          { name: "Roaming", desc: "Subscriber is in roaming" },
          { name: "Current Carrier", desc: "Current carrier (after porting)" },
          { name: "Original Carrier", desc: "Original carrier of the number" },
          { name: "Country", desc: "Country of number registration" },
          { name: "Health Score", desc: "Number quality score (0-100)" },
        ],
      },
      features: {
        title: "Service Features",
        single: {
          title: "Quick single number check",
          desc: "Use the 'Quick Check' field on the main page for instant single number verification. Result appears immediately after request. Perfect for checking individual contacts before calling.",
        },
        batch: {
          title: "Batch Check",
          desc: "Upload a list of numbers via text field (one per line or comma-separated) or CSV/TXT file. Unlimited numbers supported. Results are saved automatically, even if check is interrupted - you can resume it.",
        },
        export: {
          title: "Export Results",
          desc: "Download results in CSV or Excel (XLSX) formats. Available filters: all numbers, valid only, invalid only. Export includes all fields: number, status, carrier, country, roaming, porting.",
        },
        cache: {
          title: "Result Caching",
          desc: "System automatically caches check results for 24 hours. When re-checking the same number, saved data is used without additional API request. This saves money and speeds up checking.",
        },
        tools: {
          title: "Tools (duplicate cleaning)",
          desc: "The 'Tools' section allows you to clean your number list from duplicates before checking. Upload a file or paste text - system will find and remove duplicate numbers. It's free and doesn't use API requests.",
        },
      },
      faq: {
        title: "Troubleshooting",
        description: "Answers to common questions and solutions to typical problems",
        items: [
          {
            q: "Number shows 'invalid' but I'm sure it's working",
            a: "HLR checks status in real-time. If number shows 'invalid', possibly: 1) SIM card temporarily blocked, 2) Subscriber changed number, 3) Debt to carrier. Try checking again in a few hours or contact subscriber another way.",
          },
          {
            q: "Check stopped in the middle of the list",
            a: "Don't worry! All checked numbers are already saved. Find the batch in check history and click 'Resume' button - system will continue from where it stopped.",
          },
          {
            q: "Why do some numbers show 'unknown'?",
            a: "Status 'unknown' means carrier network didn't give a definite answer. Reasons: phone is off, subscriber in area without coverage, or carrier doesn't support HLR requests. We recommend retrying in a few hours.",
          },
          {
            q: "How to format numbers correctly?",
            a: "Numbers should be in international format with country code: +49176123456 or 49176123456. System automatically normalizes numbers, but it's better to use correct format from start. Don't use spaces, brackets or dashes.",
          },
          {
            q: "What does 'Ported: yes' mean?",
            a: "This means subscriber transferred number from one carrier to another (MNP - Mobile Number Portability). 'Current Carrier' field shows current carrier, 'Original Carrier' shows original one. Number is fully working.",
          },

          {
            q: "How to know my check limit?",
            a: "Your limits are shown on main page in 'Usage Limits' section. If you have daily or monthly limit set, you'll see progress bar with usage. If no limit - shows 'unlimited'.",
          },
          {
            q: "File won't upload / format error",
            a: "Supported formats: CSV, TXT, XLSX. File should contain phone numbers (one per line or in first column). Make sure file is not corrupted and has correct encoding (UTF-8). Maximum file size - 10 MB.",
          },
          {
            q: "What is Health Score?",
            a: "Health Score (0-100) is a comprehensive number quality assessment. Considers: validity, reachability, check history, porting, roaming. Higher score means more reliable number. Score > 70 is considered good.",
          },
          {
            q: "How to contact support?",
            a: "Write to Telegram: @toskaqwe1. We respond within 24 hours on business days. When contacting, provide your login and describe the problem in detail.",
          },
        ],
      },
      support: {
        title: "Need help?",
        desc: "Contact us on Telegram for support",
        button: "Write to Telegram",
      },
    },
  };

  return content[lang as keyof typeof content] || content.en;
}
