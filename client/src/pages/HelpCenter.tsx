import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Phone, 
  Upload, 
  Download,
  Zap,
  MessageCircle,
  AlertCircle
} from "lucide-react";

export default function HelpCenter() {
  const { language } = useLanguage();
  
  const content = getContent(language);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">1</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step1.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step1.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">2</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step2.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step2.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">3</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step3.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step3.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">4</div>
                <div>
                  <h4 className="font-medium">{content.quickStart.step4.title}</h4>
                  <p className="text-sm text-muted-foreground">{content.quickStart.step4.desc}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Meanings */}
        <Card>
          <CardHeader>
            <CardTitle>{content.statuses.title}</CardTitle>
            <CardDescription>{content.statuses.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-green-600 dark:text-green-400">{content.statuses.valid.title}</span>
                <p className="text-sm text-muted-foreground">{content.statuses.valid.desc}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-red-600 dark:text-red-400">{content.statuses.invalid.title}</span>
                <p className="text-sm text-muted-foreground">{content.statuses.invalid.desc}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">{content.statuses.unknown.title}</span>
                <p className="text-sm text-muted-foreground">{content.statuses.unknown.desc}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Score */}
        <Card>
          <CardHeader>
            <CardTitle>{content.quality.title}</CardTitle>
            <CardDescription>{content.quality.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium">{content.quality.high}</span>
                <span className="text-muted-foreground text-sm">— {content.quality.highDesc}</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="font-medium">{content.quality.medium}</span>
                <span className="text-muted-foreground text-sm">— {content.quality.mediumDesc}</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-medium">{content.quality.low}</span>
                <span className="text-muted-foreground text-sm">— {content.quality.lowDesc}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>{content.faq.title}</CardTitle>
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
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold">{content.support.title}</h4>
                <p className="text-sm text-muted-foreground">{content.support.desc}</p>
              </div>
              <a 
                href="https://t.me/toskaqwe1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
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
      title: "Справка",
      subtitle: "Как пользоваться сервисом проверки номеров",
      quickStart: {
        title: "Как проверить номера",
        step1: { title: "Введите номера", desc: "Введите номера вручную или загрузите файл CSV/TXT" },
        step2: { title: "Нажмите «Проверить»", desc: "Система отправит запросы к операторам связи" },
        step3: { title: "Дождитесь результатов", desc: "Проверка занимает несколько секунд на номер" },
        step4: { title: "Скачайте отчёт", desc: "Экспортируйте результаты в CSV или Excel" },
      },
      statuses: {
        title: "Что означают статусы",
        description: "Результаты проверки показывают текущее состояние номера",
        valid: { 
          title: "Валидный (Valid)", 
          desc: "Номер активен и работает. Можно звонить и отправлять SMS." 
        },
        invalid: { 
          title: "Невалидный (Invalid)", 
          desc: "Номер не существует или отключён. Не тратьте время на этот контакт." 
        },
        unknown: { 
          title: "Неизвестно (Unknown)", 
          desc: "Телефон выключен или вне зоны покрытия. Попробуйте проверить позже." 
        },
      },
      quality: {
        title: "Оценка качества",
        description: "Система оценивает надёжность номера по шкале от 0 до 100",
        high: "Высокое качество",
        highDesc: "60+ баллов, надёжный номер",
        medium: "Среднее качество", 
        mediumDesc: "40-59 баллов, требует внимания",
        low: "Низкое качество",
        lowDesc: "менее 40 баллов, ненадёжный номер",
      },
      faq: {
        title: "Частые вопросы",
        items: [
          {
            q: "Как правильно вводить номера?",
            a: "Используйте международный формат с кодом страны: +49176123456 или 49176123456. Можно вводить по одному номеру на строку или через запятую.",
          },
          {
            q: "Номер показывает «невалидный», но я уверен что он рабочий",
            a: "Проверка показывает текущий статус в сети оператора. Возможно, у абонента временные проблемы с оплатой или SIM-карта заблокирована. Попробуйте проверить через несколько часов.",
          },
          {
            q: "Что делать если проверка остановилась?",
            a: "Не волнуйтесь — все проверенные номера уже сохранены. Найдите проверку в истории и нажмите «Возобновить».",
          },
          {
            q: "Как скачать только валидные номера?",
            a: "В результатах проверки нажмите на карточку «Высокое качество» или «Валидные», затем нажмите кнопку экспорта — скачается только отфильтрованный список.",
          },
          {
            q: "Какие форматы файлов поддерживаются?",
            a: "CSV, TXT и XLSX. Номера должны быть в первой колонке или по одному на строку.",
          },
        ],
      },
      support: {
        title: "Нужна помощь?",
        desc: "Напишите нам в Telegram",
        button: "Telegram",
      },
    },
    uk: {
      title: "Довідка",
      subtitle: "Як користуватися сервісом перевірки номерів",
      quickStart: {
        title: "Як перевірити номери",
        step1: { title: "Введіть номери", desc: "Введіть номери вручну або завантажте файл CSV/TXT" },
        step2: { title: "Натисніть «Перевірити»", desc: "Система надішле запити до операторів зв'язку" },
        step3: { title: "Дочекайтесь результатів", desc: "Перевірка займає кілька секунд на номер" },
        step4: { title: "Завантажте звіт", desc: "Експортуйте результати в CSV або Excel" },
      },
      statuses: {
        title: "Що означають статуси",
        description: "Результати перевірки показують поточний стан номера",
        valid: { 
          title: "Валідний (Valid)", 
          desc: "Номер активний і працює. Можна дзвонити та надсилати SMS." 
        },
        invalid: { 
          title: "Невалідний (Invalid)", 
          desc: "Номер не існує або відключений. Не витрачайте час на цей контакт." 
        },
        unknown: { 
          title: "Невідомо (Unknown)", 
          desc: "Телефон вимкнено або поза зоною покриття. Спробуйте перевірити пізніше." 
        },
      },
      quality: {
        title: "Оцінка якості",
        description: "Система оцінює надійність номера за шкалою від 0 до 100",
        high: "Висока якість",
        highDesc: "60+ балів, надійний номер",
        medium: "Середня якість", 
        mediumDesc: "40-59 балів, потребує уваги",
        low: "Низька якість",
        lowDesc: "менше 40 балів, ненадійний номер",
      },
      faq: {
        title: "Часті питання",
        items: [
          {
            q: "Як правильно вводити номери?",
            a: "Використовуйте міжнародний формат з кодом країни: +49176123456 або 49176123456. Можна вводити по одному номеру на рядок або через кому.",
          },
          {
            q: "Номер показує «невалідний», але я впевнений що він робочий",
            a: "Перевірка показує поточний статус у мережі оператора. Можливо, у абонента тимчасові проблеми з оплатою або SIM-картка заблокована. Спробуйте перевірити через кілька годин.",
          },
          {
            q: "Що робити якщо перевірка зупинилася?",
            a: "Не хвилюйтесь — всі перевірені номери вже збережені. Знайдіть перевірку в історії та натисніть «Відновити».",
          },
          {
            q: "Як завантажити тільки валідні номери?",
            a: "У результатах перевірки натисніть на картку «Висока якість» або «Валідні», потім натисніть кнопку експорту — завантажиться тільки відфільтрований список.",
          },
          {
            q: "Які формати файлів підтримуються?",
            a: "CSV, TXT та XLSX. Номери повинні бути в першій колонці або по одному на рядок.",
          },
        ],
      },
      support: {
        title: "Потрібна допомога?",
        desc: "Напишіть нам у Telegram",
        button: "Telegram",
      },
    },
    en: {
      title: "Help",
      subtitle: "How to use the number verification service",
      quickStart: {
        title: "How to check numbers",
        step1: { title: "Enter numbers", desc: "Enter numbers manually or upload a CSV/TXT file" },
        step2: { title: "Click \"Check\"", desc: "The system will send requests to mobile carriers" },
        step3: { title: "Wait for results", desc: "Verification takes a few seconds per number" },
        step4: { title: "Download report", desc: "Export results to CSV or Excel" },
      },
      statuses: {
        title: "What statuses mean",
        description: "Check results show the current state of the number",
        valid: { 
          title: "Valid", 
          desc: "Number is active and working. You can call and send SMS." 
        },
        invalid: { 
          title: "Invalid", 
          desc: "Number doesn't exist or is disconnected. Don't waste time on this contact." 
        },
        unknown: { 
          title: "Unknown", 
          desc: "Phone is off or out of coverage. Try checking later." 
        },
      },
      quality: {
        title: "Quality Score",
        description: "The system rates number reliability on a scale from 0 to 100",
        high: "High quality",
        highDesc: "60+ points, reliable number",
        medium: "Medium quality", 
        mediumDesc: "40-59 points, needs attention",
        low: "Low quality",
        lowDesc: "less than 40 points, unreliable number",
      },
      faq: {
        title: "FAQ",
        items: [
          {
            q: "How to enter numbers correctly?",
            a: "Use international format with country code: +49176123456 or 49176123456. You can enter one number per line or separate with commas.",
          },
          {
            q: "Number shows \"invalid\" but I'm sure it's working",
            a: "The check shows current status in carrier network. The subscriber may have temporary payment issues or blocked SIM. Try checking in a few hours.",
          },
          {
            q: "What to do if check stopped?",
            a: "Don't worry — all checked numbers are already saved. Find the check in history and click \"Resume\".",
          },
          {
            q: "How to download only valid numbers?",
            a: "In check results, click on \"High quality\" or \"Valid\" card, then click export button — only filtered list will be downloaded.",
          },
          {
            q: "What file formats are supported?",
            a: "CSV, TXT and XLSX. Numbers should be in the first column or one per line.",
          },
        ],
      },
      support: {
        title: "Need help?",
        desc: "Contact us on Telegram",
        button: "Telegram",
      },
    },
  };

  return content[lang as keyof typeof content] || content.en;
}
