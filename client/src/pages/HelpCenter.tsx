import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Zap,
  MessageCircle,
  AlertCircle,
  Info,
  Phone,
  Mail,
  Upload,
  Download,
  Search,
  FileText,
  Shield,
  Clock
} from "lucide-react";
import StickyScrollbar from "@/components/StickyScrollbar";

export default function HelpCenter() {
  const { language } = useLanguage();
  
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

        {/* Tabs for HLR and Email */}
        <Tabs defaultValue="hlr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hlr" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {content.tabs.hlr}
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {content.tabs.email}
            </TabsTrigger>
          </TabsList>

          {/* HLR Tab */}
          <TabsContent value="hlr" className="space-y-6 mt-6">
            {/* What is HLR */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  {content.hlr.whatIs.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{content.hlr.whatIs.desc}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">{content.hlr.whatIs.benefits.title}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {content.hlr.whatIs.benefits.items.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">{content.hlr.whatIs.useCases.title}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {content.hlr.whatIs.useCases.items.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {content.hlr.quickStart.title}
                </CardTitle>
                <CardDescription>{content.hlr.quickStart.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {content.hlr.quickStart.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                        {step.tip && (
                          <p className="text-xs text-primary mt-1">💡 {step.tip}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status Meanings */}
            <Card>
              <CardHeader>
                <CardTitle>{content.hlr.statuses.title}</CardTitle>
                <CardDescription>{content.hlr.statuses.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-green-600 dark:text-green-400">{content.hlr.statuses.valid.title}</span>
                    <p className="text-sm text-muted-foreground">{content.hlr.statuses.valid.desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-red-600 dark:text-red-400">{content.hlr.statuses.invalid.title}</span>
                    <p className="text-sm text-muted-foreground">{content.hlr.statuses.invalid.desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">{content.hlr.statuses.unknown.title}</span>
                    <p className="text-sm text-muted-foreground">{content.hlr.statuses.unknown.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GSM Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {content.hlr.gsmCodes.title}
                </CardTitle>
                <CardDescription>{content.hlr.gsmCodes.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <StickyScrollbar className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">{content.hlr.gsmCodes.codeHeader}</TableHead>
                        <TableHead>{content.hlr.gsmCodes.statusHeader}</TableHead>
                        <TableHead>{content.hlr.gsmCodes.actionHeader}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {content.hlr.gsmCodes.codes.map((code: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant={code.variant as any} className="text-xs">
                              {code.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{code.meaning}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{code.action}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StickyScrollbar>
              </CardContent>
            </Card>

            {/* Phone Number Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {content.hlr.numberTypes.title}
                </CardTitle>
                <CardDescription>{content.hlr.numberTypes.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <StickyScrollbar className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">{content.hlr.numberTypes.typeHeader}</TableHead>
                        <TableHead>{content.hlr.numberTypes.descHeader}</TableHead>
                        <TableHead className="w-[150px]">{content.hlr.numberTypes.smsHeader}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {content.hlr.numberTypes.types.map((type: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant={type.variant as any} className="text-xs">
                              {type.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{type.meaning}</TableCell>
                          <TableCell className="text-sm">
                            {type.sms ? (
                              <span className="text-green-500">✅ {content.hlr.numberTypes.yes}</span>
                            ) : (
                              <span className="text-red-500">❌ {content.hlr.numberTypes.no}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StickyScrollbar>
                <p className="text-sm text-muted-foreground mt-4">
                  {content.hlr.numberTypes.note}
                </p>
              </CardContent>
            </Card>

            {/* Quality Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {content.hlr.quality.title}
                </CardTitle>
                <CardDescription>{content.hlr.quality.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">{content.hlr.quality.high}</span>
                    <span className="text-muted-foreground text-sm">— {content.hlr.quality.highDesc}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-medium">{content.hlr.quality.medium}</span>
                    <span className="text-muted-foreground text-sm">— {content.hlr.quality.mediumDesc}</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="font-medium">{content.hlr.quality.low}</span>
                    <span className="text-muted-foreground text-sm">— {content.hlr.quality.lowDesc}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HLR FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>{content.hlr.faq.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {content.hlr.faq.items.map((item: any, idx: number) => (
                    <AccordionItem key={idx} value={`hlr-faq-${idx}`}>
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
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6 mt-6">
            {/* What is Email Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  {content.email.whatIs.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{content.email.whatIs.desc}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">{content.email.whatIs.benefits.title}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {content.email.whatIs.benefits.items.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">{content.email.whatIs.useCases.title}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {content.email.whatIs.useCases.items.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {content.email.quickStart.title}
                </CardTitle>
                <CardDescription>{content.email.quickStart.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {content.email.quickStart.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                        {step.tip && (
                          <p className="text-xs text-primary mt-1">💡 {step.tip}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Email Status Meanings */}
            <Card>
              <CardHeader>
                <CardTitle>{content.email.statuses.title}</CardTitle>
                <CardDescription>{content.email.statuses.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-green-600 dark:text-green-400">{content.email.statuses.ok.title}</span>
                    <p className="text-sm text-muted-foreground">{content.email.statuses.ok.desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">{content.email.statuses.catchAll.title}</span>
                    <p className="text-sm text-muted-foreground">{content.email.statuses.catchAll.desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-red-600 dark:text-red-400">{content.email.statuses.invalid.title}</span>
                    <p className="text-sm text-muted-foreground">{content.email.statuses.invalid.desc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Clock className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-orange-600 dark:text-orange-400">{content.email.statuses.disposable.title}</span>
                    <p className="text-sm text-muted-foreground">{content.email.statuses.disposable.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {content.email.quality.title}
                </CardTitle>
                <CardDescription>{content.email.quality.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <StickyScrollbar className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{content.email.quality.qualityHeader}</TableHead>
                        <TableHead>{content.email.quality.meaningHeader}</TableHead>
                        <TableHead>{content.email.quality.actionHeader}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {content.email.quality.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant={item.variant as any} className="text-xs">
                              {item.quality}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{item.meaning}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.action}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </StickyScrollbar>
              </CardContent>
            </Card>

            {/* Email Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {content.email.categories.title}
                </CardTitle>
                <CardDescription>{content.email.categories.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">{content.email.categories.corporate.title}</h4>
                    <p className="text-sm text-muted-foreground">{content.email.categories.corporate.desc}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-1">{content.email.categories.free.title}</h4>
                    <p className="text-sm text-muted-foreground">{content.email.categories.free.desc}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-1">{content.email.categories.disposable.title}</h4>
                    <p className="text-sm text-muted-foreground">{content.email.categories.disposable.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>{content.email.faq.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {content.email.faq.items.map((item: any, idx: number) => (
                    <AccordionItem key={idx} value={`email-faq-${idx}`}>
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
          </TabsContent>
        </Tabs>

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
  const gsmCodesRu = [
    { code: "0", label: "OK (0)", variant: "default", meaning: "Номер активен и доступен", action: "✅ Можно использовать" },
    { code: "1", label: "Bad Number (1)", variant: "destructive", meaning: "Номер не существует", action: "❌ Удалить из базы" },
    { code: "5", label: "Bad Number (5)", variant: "destructive", meaning: "Неопознанный абонент", action: "❌ Удалить из базы" },
    { code: "6", label: "Absent (6)", variant: "secondary", meaning: "Телефон выключен или вне сети", action: "🔄 Проверить позже" },
    { code: "9", label: "Blocked (9)", variant: "destructive", meaning: "Номер заблокирован", action: "❌ Удалить из базы" },
    { code: "27", label: "Absent (27)", variant: "secondary", meaning: "Абонент недоступен для SMS", action: "🔄 Проверить позже" },
  ];

  const gsmCodesUk = [
    { code: "0", label: "OK (0)", variant: "default", meaning: "Номер активний і доступний", action: "✅ Можна використовувати" },
    { code: "1", label: "Bad Number (1)", variant: "destructive", meaning: "Номер не існує", action: "❌ Видалити з бази" },
    { code: "5", label: "Bad Number (5)", variant: "destructive", meaning: "Нерозпізнаний абонент", action: "❌ Видалити з бази" },
    { code: "6", label: "Absent (6)", variant: "secondary", meaning: "Телефон вимкнено або поза мережею", action: "🔄 Перевірити пізніше" },
    { code: "9", label: "Blocked (9)", variant: "destructive", meaning: "Номер заблоковано", action: "❌ Видалити з бази" },
    { code: "27", label: "Absent (27)", variant: "secondary", meaning: "Абонент недоступний для SMS", action: "🔄 Перевірити пізніше" },
  ];

  const gsmCodesEn = [
    { code: "0", label: "OK (0)", variant: "default", meaning: "Number is active and reachable", action: "✅ Safe to use" },
    { code: "1", label: "Bad Number (1)", variant: "destructive", meaning: "Number doesn't exist", action: "❌ Remove from list" },
    { code: "5", label: "Bad Number (5)", variant: "destructive", meaning: "Unrecognized subscriber", action: "❌ Remove from list" },
    { code: "6", label: "Absent (6)", variant: "secondary", meaning: "Phone is off or out of network", action: "🔄 Retry later" },
    { code: "9", label: "Blocked (9)", variant: "destructive", meaning: "Number is blocked", action: "❌ Remove from list" },
    { code: "27", label: "Absent (27)", variant: "secondary", meaning: "Subscriber unavailable for SMS", action: "🔄 Retry later" },
  ];

  const emailQualityRu = [
    { quality: "good", variant: "default", meaning: "Email существует и принимает письма", action: "✅ Можно использовать" },
    { quality: "catch_all", variant: "secondary", meaning: "Сервер принимает все письма (нельзя точно проверить)", action: "⚠️ Использовать с осторожностью" },
    { quality: "bad", variant: "destructive", meaning: "Email не существует или не работает", action: "❌ Удалить из базы" },
    { quality: "unknown", variant: "secondary", meaning: "Не удалось проверить (сервер не отвечает)", action: "🔄 Проверить позже" },
  ];

  const emailQualityUk = [
    { quality: "good", variant: "default", meaning: "Email існує і приймає листи", action: "✅ Можна використовувати" },
    { quality: "catch_all", variant: "secondary", meaning: "Сервер приймає всі листи (неможливо точно перевірити)", action: "⚠️ Використовувати обережно" },
    { quality: "bad", variant: "destructive", meaning: "Email не існує або не працює", action: "❌ Видалити з бази" },
    { quality: "unknown", variant: "secondary", meaning: "Не вдалося перевірити (сервер не відповідає)", action: "🔄 Перевірити пізніше" },
  ];

  const emailQualityEn = [
    { quality: "good", variant: "default", meaning: "Email exists and accepts messages", action: "✅ Safe to use" },
    { quality: "catch_all", variant: "secondary", meaning: "Server accepts all emails (can't verify precisely)", action: "⚠️ Use with caution" },
    { quality: "bad", variant: "destructive", meaning: "Email doesn't exist or doesn't work", action: "❌ Remove from list" },
    { quality: "unknown", variant: "secondary", meaning: "Couldn't verify (server not responding)", action: "🔄 Retry later" },
  ];

  const content = {
    ru: {
      title: "Справка",
      subtitle: "Полное руководство по использованию DataCheck Pro",
      tabs: {
        hlr: "Проверка телефонов",
        email: "Проверка email"
      },
      hlr: {
        whatIs: {
          title: "Что такое HLR проверка?",
          desc: "HLR (Home Location Register) — это проверка номера телефона через базу данных мобильного оператора. Система отправляет запрос оператору и получает информацию о статусе номера в реальном времени.",
          benefits: {
            title: "Преимущества",
            items: [
              "Мгновенная проверка статуса номера",
              "Определение оператора и страны",
              "Выявление несуществующих номеров",
              "Экономия на SMS и звонках"
            ]
          },
          useCases: {
            title: "Когда использовать",
            items: [
              "Очистка базы контактов",
              "Проверка перед рассылкой SMS",
              "Валидация номеров при регистрации",
              "Актуализация CRM базы"
            ]
          }
        },
        quickStart: {
          title: "Как проверить номера",
          subtitle: "Пошаговая инструкция для начинающих",
          steps: [
            { 
              title: "Перейдите в раздел проверки", 
              desc: "В меню слева выберите «HLR Проверка» для одного номера или «HLR Массовая» для списка",
              tip: "Для одного номера используйте быструю проверку"
            },
            { 
              title: "Введите номера", 
              desc: "Введите номер вручную или загрузите файл (CSV, TXT, Excel). Номера должны быть в международном формате: +380501234567 или 380501234567",
              tip: "Можно перетащить файл прямо на страницу"
            },
            { 
              title: "Нажмите «Проверить»", 
              desc: "Система отправит запросы к операторам связи. Это занимает 1-2 секунды на номер",
              tip: "Во время проверки можно следить за прогрессом"
            },
            { 
              title: "Просмотрите результаты", 
              desc: "После проверки вы увидите статус каждого номера: валидный, невалидный или неизвестный",
              tip: "Используйте фильтры для быстрого поиска"
            },
            { 
              title: "Скачайте отчёт", 
              desc: "Экспортируйте результаты в CSV или Excel. Можно скачать только валидные или только невалидные номера",
              tip: "Выберите нужный фильтр перед экспортом"
            }
          ]
        },
        statuses: {
          title: "Что означают статусы",
          description: "Результаты проверки показывают текущее состояние номера",
          valid: { 
            title: "✅ Валидный (Valid)", 
            desc: "Номер активен и работает. Абонент может принимать звонки и SMS. Этот номер можно использовать." 
          },
          invalid: { 
            title: "❌ Невалидный (Invalid)", 
            desc: "Номер не существует или отключён навсегда. Удалите его из базы — он никогда не будет работать." 
          },
          unknown: { 
            title: "⚠️ Неизвестно (Unknown)", 
            desc: "Телефон выключен или вне зоны покрытия. Номер может быть рабочим — попробуйте проверить через несколько часов." 
          },
        },
        gsmCodes: {
          title: "GSM коды статусов",
          description: "Детальная информация от оператора связи",
          codeHeader: "Код",
          statusHeader: "Что означает",
          actionHeader: "Что делать",
          codes: gsmCodesRu,
        },
        numberTypes: {
          title: "Типы телефонных номеров",
          description: "Система определяет тип номера на основе данных оператора. Это помогает понять, можно ли отправить SMS на этот номер.",
          typeHeader: "Тип номера",
          descHeader: "Описание",
          smsHeader: "SMS поддержка",
          yes: "Да",
          no: "Нет",
          note: "💡 Совет: Для SMS-рассылок используйте только номера с типом 'mobile'. Стационарные телефоны (fixed_line) не могут принимать SMS.",
          types: [
            { label: "mobile", variant: "default", meaning: "Мобильный телефон. Основной тип для SMS-рассылок и звонков. Поддерживает все функции связи.", sms: true },
            { label: "fixed_line", variant: "secondary", meaning: "Стационарный (проводной) телефон. Домашний или офисный телефон, подключённый кабелем. Не может принимать SMS.", sms: false },
            { label: "fixed_line_or_mobile", variant: "secondary", meaning: "Может быть как стационарным, так и мобильным. В некоторых странах нельзя точно определить тип.", sms: true },
            { label: "voip", variant: "outline", meaning: "VoIP номер (интернет-телефония). Номер, работающий через интернет (Skype, Viber Out и т.д.).", sms: false },
            { label: "toll_free", variant: "outline", meaning: "Бесплатный номер (8-800). Звонки на этот номер бесплатны для звонящего.", sms: false },
            { label: "premium_rate", variant: "destructive", meaning: "Платный номер. Звонки тарифицируются по повышенному тарифу (горячие линии, сервисы).", sms: false },
            { label: "shared_cost", variant: "outline", meaning: "Номер с разделением стоимости. Часть стоимости звонка оплачивает владелец номера.", sms: false },
            { label: "personal_number", variant: "outline", meaning: "Персональный номер. Номер, привязанный к человеку, а не к устройству.", sms: true },
            { label: "pager", variant: "destructive", meaning: "Пейджер. Устаревшее устройство для приёма коротких сообщений.", sms: false },
            { label: "uan", variant: "outline", meaning: "Универсальный номер доступа (UAN). Корпоративный номер с маршрутизацией звонков.", sms: false },
            { label: "unknown", variant: "secondary", meaning: "Тип не определён. Не удалось получить информацию о типе номера.", sms: true },
          ],
        },
        quality: {
          title: "Оценка качества номера",
          description: "Система оценивает надёжность номера по шкале от 0 до 100 баллов",
          high: "🟢 Высокое качество",
          highDesc: "60+ баллов — надёжный номер, можно использовать",
          medium: "🟡 Среднее качество", 
          mediumDesc: "40-59 баллов — требует внимания, проверьте вручную",
          low: "🔴 Низкое качество",
          lowDesc: "менее 40 баллов — ненадёжный номер, лучше удалить",
        },
        faq: {
          title: "Частые вопросы",
          items: [
            {
              q: "В каком формате вводить номера?",
              a: "Используйте международный формат с кодом страны: +380501234567 или 380501234567. Можно вводить по одному номеру на строку или через запятую. Система автоматически уберёт пробелы и лишние символы.",
            },
            {
              q: "Что делать с номерами в статусе «Absent»?",
              a: "Статус «Absent» означает, что телефон выключен или вне сети. Это не значит, что номер плохой — абонент мог просто выключить телефон. Попробуйте проверить такие номера через несколько часов или на следующий день.",
            },
            {
              q: "Как скачать только валидные номера?",
              a: "В результатах проверки нажмите на карточку «Валидные» или используйте фильтр по статусу. Затем нажмите кнопку «Экспорт» — скачается только отфильтрованный список.",
            },
            {
              q: "Какие форматы файлов поддерживаются?",
              a: "CSV, TXT и Excel (XLSX). Номера должны быть в первой колонке или по одному на строку. Можно просто перетащить файл на страницу.",
            },
            {
              q: "Сколько номеров можно проверить за раз?",
              a: "Ограничений нет — можно загрузить хоть 100 000 номеров. Но учитывайте, что проверка занимает 1-2 секунды на номер. Большие списки лучше проверять ночью.",
            },
          ],
        },
      },
      email: {
        whatIs: {
          title: "Что такое Email валидация?",
          desc: "Email валидация — это проверка существования и работоспособности email адреса. Система проверяет синтаксис, существование домена, наличие почтового сервера и возможность доставки письма.",
          benefits: {
            title: "Преимущества",
            items: [
              "Снижение bounce rate (отказов)",
              "Защита репутации отправителя",
              "Экономия на email рассылках",
              "Очистка базы от мусора"
            ]
          },
          useCases: {
            title: "Когда использовать",
            items: [
              "Перед email рассылкой",
              "При регистрации пользователей",
              "Очистка старой базы подписчиков",
              "Проверка лидов из форм"
            ]
          }
        },
        quickStart: {
          title: "Как проверить email адреса",
          subtitle: "Пошаговая инструкция для начинающих",
          steps: [
            { 
              title: "Перейдите в раздел Email", 
              desc: "В меню слева выберите «Email Проверка» для одного адреса или «Email Массовая» для списка",
              tip: "Для быстрой проверки одного email используйте одиночную проверку"
            },
            { 
              title: "Введите email адреса", 
              desc: "Введите email вручную или загрузите файл (CSV, TXT, Excel). Каждый email на отдельной строке",
              tip: "Можно перетащить файл прямо на страницу"
            },
            { 
              title: "Нажмите «Проверить»", 
              desc: "Система проверит синтаксис, домен и почтовый сервер каждого адреса",
              tip: "Проверка одного email занимает 1-3 секунды"
            },
            { 
              title: "Изучите результаты", 
              desc: "Вы увидите статус каждого email: good (хороший), bad (плохой), catch_all или unknown",
              tip: "Обратите внимание на категорию email (корпоративный, бесплатный, одноразовый)"
            },
            { 
              title: "Скачайте отчёт", 
              desc: "Экспортируйте результаты в CSV или Excel. Можно скачать только валидные адреса",
              tip: "Отфильтруйте по качеству перед экспортом"
            }
          ]
        },
        statuses: {
          title: "Что означают статусы",
          description: "Результаты проверки показывают качество email адреса",
          ok: { 
            title: "✅ Good (Хороший)", 
            desc: "Email существует и принимает письма. Можно смело использовать для рассылки." 
          },
          catchAll: { 
            title: "⚠️ Catch-All", 
            desc: "Сервер принимает письма на любые адреса домена. Нельзя точно проверить существование. Используйте с осторожностью." 
          },
          invalid: { 
            title: "❌ Bad (Плохой)", 
            desc: "Email не существует, домен не работает или почтовый ящик переполнен. Удалите из базы." 
          },
          disposable: { 
            title: "🕐 Disposable (Одноразовый)", 
            desc: "Временный email (mailinator, tempmail и т.д.). Такие адреса быстро удаляются. Не используйте для важных рассылок." 
          },
        },
        quality: {
          title: "Качество email",
          description: "Система определяет качество каждого email адреса",
          qualityHeader: "Качество",
          meaningHeader: "Что означает",
          actionHeader: "Что делать",
          items: emailQualityRu,
        },
        categories: {
          title: "Категории email",
          description: "Система автоматически определяет тип email адреса",
          corporate: {
            title: "🏢 Корпоративный",
            desc: "Email на домене компании (ivan@company.com). Обычно самые надёжные адреса."
          },
          free: {
            title: "📧 Бесплатный",
            desc: "Gmail, Yahoo, Mail.ru и другие бесплатные сервисы. Могут быть личными или рабочими."
          },
          disposable: {
            title: "⏳ Одноразовый",
            desc: "Временные email сервисы (mailinator, tempmail). Адреса удаляются через несколько часов."
          }
        },
        faq: {
          title: "Частые вопросы",
          items: [
            {
              q: "Что такое Catch-All email?",
              a: "Catch-All — это настройка почтового сервера, при которой он принимает письма на любые адреса домена, даже несуществующие. Например, если домен company.com настроен как catch-all, письмо на random123@company.com будет принято, даже если такого ящика нет. Такие email нельзя точно проверить.",
            },
            {
              q: "Почему важно удалять плохие email?",
              a: "Высокий процент отказов (bounce rate) портит репутацию отправителя. Почтовые сервисы могут начать отправлять ваши письма в спам или вообще блокировать. Регулярная очистка базы помогает сохранить высокую доставляемость.",
            },
            {
              q: "Как часто нужно проверять базу email?",
              a: "Рекомендуем проверять базу перед каждой крупной рассылкой и минимум раз в 3-6 месяцев. Email адреса «портятся» — люди меняют работу, удаляют ящики, домены перестают работать.",
            },
            {
              q: "Что делать с одноразовыми email?",
              a: "Одноразовые email (disposable) лучше удалять из базы. Они создаются на несколько минут или часов и потом перестают работать. Рассылка на такие адреса — пустая трата ресурсов.",
            },
            {
              q: "Какие форматы файлов поддерживаются?",
              a: "CSV, TXT и Excel (XLSX). Email адреса должны быть в первой колонке или по одному на строку. Можно просто перетащить файл на страницу.",
            },
          ],
        },
      },
      support: {
        title: "Нужна помощь?",
        desc: "Напишите нам в Telegram — ответим в течение часа",
        button: "Написать в Telegram",
      },
    },
    uk: {
      title: "Довідка",
      subtitle: "Повний посібник з використання DataCheck Pro",
      tabs: {
        hlr: "Перевірка телефонів",
        email: "Перевірка email"
      },
      hlr: {
        whatIs: {
          title: "Що таке HLR перевірка?",
          desc: "HLR (Home Location Register) — це перевірка номера телефону через базу даних мобільного оператора. Система надсилає запит оператору і отримує інформацію про статус номера в реальному часі.",
          benefits: {
            title: "Переваги",
            items: [
              "Миттєва перевірка статусу номера",
              "Визначення оператора та країни",
              "Виявлення неіснуючих номерів",
              "Економія на SMS та дзвінках"
            ]
          },
          useCases: {
            title: "Коли використовувати",
            items: [
              "Очищення бази контактів",
              "Перевірка перед розсилкою SMS",
              "Валідація номерів при реєстрації",
              "Актуалізація CRM бази"
            ]
          }
        },
        quickStart: {
          title: "Як перевірити номери",
          subtitle: "Покрокова інструкція для початківців",
          steps: [
            { 
              title: "Перейдіть до розділу перевірки", 
              desc: "У меню зліва оберіть «HLR Перевірка» для одного номера або «Масова перевірка» для списку",
              tip: "Для одного номера використовуйте швидку перевірку"
            },
            { 
              title: "Введіть номери", 
              desc: "Введіть номер вручну або завантажте файл (CSV, TXT, Excel). Номери повинні бути в міжнародному форматі: +380501234567 або 380501234567",
              tip: "Можна перетягнути файл прямо на сторінку"
            },
            { 
              title: "Натисніть «Перевірити»", 
              desc: "Система надішле запити до операторів зв'язку. Це займає 1-2 секунди на номер",
              tip: "Під час перевірки можна стежити за прогресом"
            },
            { 
              title: "Перегляньте результати", 
              desc: "Після перевірки ви побачите статус кожного номера: валідний, невалідний або невідомий",
              tip: "Використовуйте фільтри для швидкого пошуку"
            },
            { 
              title: "Завантажте звіт", 
              desc: "Експортуйте результати в CSV або Excel. Можна завантажити тільки валідні або тільки невалідні номери",
              tip: "Оберіть потрібний фільтр перед експортом"
            }
          ]
        },
        statuses: {
          title: "Що означають статуси",
          description: "Результати перевірки показують поточний стан номера",
          valid: { 
            title: "✅ Валідний (Valid)", 
            desc: "Номер активний і працює. Абонент може приймати дзвінки та SMS. Цей номер можна використовувати." 
          },
          invalid: { 
            title: "❌ Невалідний (Invalid)", 
            desc: "Номер не існує або відключений назавжди. Видаліть його з бази — він ніколи не буде працювати." 
          },
          unknown: { 
            title: "⚠️ Невідомо (Unknown)", 
            desc: "Телефон вимкнено або поза зоною покриття. Номер може бути робочим — спробуйте перевірити через кілька годин." 
          },
        },
        gsmCodes: {
          title: "GSM коди статусів",
          description: "Детальна інформація від оператора зв'язку",
          codeHeader: "Код",
          statusHeader: "Що означає",
          actionHeader: "Що робити",
          codes: gsmCodesUk,
        },
        numberTypes: {
          title: "Типи телефонних номерів",
          description: "Система визначає тип номера на основі даних оператора. Це допомагає зрозуміти, чи можна надіслати SMS на цей номер.",
          typeHeader: "Тип номера",
          descHeader: "Опис",
          smsHeader: "SMS підтримка",
          yes: "Так",
          no: "Ні",
          note: "💡 Порада: Для SMS-розсилок використовуйте тільки номери з типом 'mobile'. Стаціонарні телефони (fixed_line) не можуть приймати SMS.",
          types: [
            { label: "mobile", variant: "default", meaning: "Мобільний телефон. Основний тип для SMS-розсилок та дзвінків. Підтримує всі функції зв'язку.", sms: true },
            { label: "fixed_line", variant: "secondary", meaning: "Стаціонарний (провідний) телефон. Домашній або офісний телефон, підключений кабелем. Не може приймати SMS.", sms: false },
            { label: "fixed_line_or_mobile", variant: "secondary", meaning: "Може бути як стаціонарним, так і мобільним. У деяких країнах неможливо точно визначити тип.", sms: true },
            { label: "voip", variant: "outline", meaning: "VoIP номер (інтернет-телефонія). Номер, що працює через інтернет (Skype, Viber Out тощо).", sms: false },
            { label: "toll_free", variant: "outline", meaning: "Безкоштовний номер (0-800). Дзвінки на цей номер безкоштовні для того, хто дзвонить.", sms: false },
            { label: "premium_rate", variant: "destructive", meaning: "Платний номер. Дзвінки тарифікуються за підвищеним тарифом (гарячі лінії, сервіси).", sms: false },
            { label: "shared_cost", variant: "outline", meaning: "Номер з розподілом вартості. Частину вартості дзвінка сплачує власник номера.", sms: false },
            { label: "personal_number", variant: "outline", meaning: "Персональний номер. Номер, прив'язаний до людини, а не до пристрою.", sms: true },
            { label: "pager", variant: "destructive", meaning: "Пейджер. Застарілий пристрій для прийому коротких повідомлень.", sms: false },
            { label: "uan", variant: "outline", meaning: "Універсальний номер доступу (UAN). Корпоративний номер з маршрутизацією дзвінків.", sms: false },
            { label: "unknown", variant: "secondary", meaning: "Тип не визначено. Не вдалося отримати інформацію про тип номера.", sms: true },
          ],
        },
        quality: {
          title: "Оцінка якості номера",
          description: "Система оцінює надійність номера за шкалою від 0 до 100 балів",
          high: "🟢 Висока якість",
          highDesc: "60+ балів — надійний номер, можна використовувати",
          medium: "🟡 Середня якість", 
          mediumDesc: "40-59 балів — потребує уваги, перевірте вручну",
          low: "🔴 Низька якість",
          lowDesc: "менше 40 балів — ненадійний номер, краще видалити",
        },
        faq: {
          title: "Часті питання",
          items: [
            {
              q: "В якому форматі вводити номери?",
              a: "Використовуйте міжнародний формат з кодом країни: +380501234567 або 380501234567. Можна вводити по одному номеру на рядок або через кому. Система автоматично прибере пробіли та зайві символи.",
            },
            {
              q: "Що робити з номерами в статусі «Absent»?",
              a: "Статус «Absent» означає, що телефон вимкнено або поза мережею. Це не означає, що номер поганий — абонент міг просто вимкнути телефон. Спробуйте перевірити такі номери через кілька годин або наступного дня.",
            },
            {
              q: "Як завантажити тільки валідні номери?",
              a: "У результатах перевірки натисніть на картку «Валідні» або використовуйте фільтр за статусом. Потім натисніть кнопку «Експорт» — завантажиться тільки відфільтрований список.",
            },
            {
              q: "Які формати файлів підтримуються?",
              a: "CSV, TXT та Excel (XLSX). Номери повинні бути в першій колонці або по одному на рядок. Можна просто перетягнути файл на сторінку.",
            },
            {
              q: "Скільки номерів можна перевірити за раз?",
              a: "Обмежень немає — можна завантажити хоч 100 000 номерів. Але враховуйте, що перевірка займає 1-2 секунди на номер. Великі списки краще перевіряти вночі.",
            },
          ],
        },
      },
      email: {
        whatIs: {
          title: "Що таке Email валідація?",
          desc: "Email валідація — це перевірка існування та працездатності email адреси. Система перевіряє синтаксис, існування домену, наявність поштового сервера та можливість доставки листа.",
          benefits: {
            title: "Переваги",
            items: [
              "Зниження bounce rate (відмов)",
              "Захист репутації відправника",
              "Економія на email розсилках",
              "Очищення бази від сміття"
            ]
          },
          useCases: {
            title: "Коли використовувати",
            items: [
              "Перед email розсилкою",
              "При реєстрації користувачів",
              "Очищення старої бази підписників",
              "Перевірка лідів з форм"
            ]
          }
        },
        quickStart: {
          title: "Як перевірити email адреси",
          subtitle: "Покрокова інструкція для початківців",
          steps: [
            { 
              title: "Перейдіть до розділу Email", 
              desc: "У меню зліва оберіть «Email Перевірка» для однієї адреси або «Email Масова» для списку",
              tip: "Для швидкої перевірки одного email використовуйте одиночну перевірку"
            },
            { 
              title: "Введіть email адреси", 
              desc: "Введіть email вручну або завантажте файл (CSV, TXT, Excel). Кожен email на окремому рядку",
              tip: "Можна перетягнути файл прямо на сторінку"
            },
            { 
              title: "Натисніть «Перевірити»", 
              desc: "Система перевірить синтаксис, домен та поштовий сервер кожної адреси",
              tip: "Перевірка одного email займає 1-3 секунди"
            },
            { 
              title: "Вивчіть результати", 
              desc: "Ви побачите статус кожного email: good (хороший), bad (поганий), catch_all або unknown",
              tip: "Зверніть увагу на категорію email (корпоративний, безкоштовний, одноразовий)"
            },
            { 
              title: "Завантажте звіт", 
              desc: "Експортуйте результати в CSV або Excel. Можна завантажити тільки валідні адреси",
              tip: "Відфільтруйте за якістю перед експортом"
            }
          ]
        },
        statuses: {
          title: "Що означають статуси",
          description: "Результати перевірки показують якість email адреси",
          ok: { 
            title: "✅ Good (Хороший)", 
            desc: "Email існує і приймає листи. Можна сміливо використовувати для розсилки." 
          },
          catchAll: { 
            title: "⚠️ Catch-All", 
            desc: "Сервер приймає листи на будь-які адреси домену. Неможливо точно перевірити існування. Використовуйте обережно." 
          },
          invalid: { 
            title: "❌ Bad (Поганий)", 
            desc: "Email не існує, домен не працює або поштова скринька переповнена. Видаліть з бази." 
          },
          disposable: { 
            title: "🕐 Disposable (Одноразовий)", 
            desc: "Тимчасовий email (mailinator, tempmail тощо). Такі адреси швидко видаляються. Не використовуйте для важливих розсилок." 
          },
        },
        quality: {
          title: "Якість email",
          description: "Система визначає якість кожної email адреси",
          qualityHeader: "Якість",
          meaningHeader: "Що означає",
          actionHeader: "Що робити",
          items: emailQualityUk,
        },
        categories: {
          title: "Категорії email",
          description: "Система автоматично визначає тип email адреси",
          corporate: {
            title: "🏢 Корпоративний",
            desc: "Email на домені компанії (ivan@company.com). Зазвичай найнадійніші адреси."
          },
          free: {
            title: "📧 Безкоштовний",
            desc: "Gmail, Yahoo, Mail.ru та інші безкоштовні сервіси. Можуть бути особистими або робочими."
          },
          disposable: {
            title: "⏳ Одноразовий",
            desc: "Тимчасові email сервіси (mailinator, tempmail). Адреси видаляються через кілька годин."
          }
        },
        faq: {
          title: "Часті питання",
          items: [
            {
              q: "Що таке Catch-All email?",
              a: "Catch-All — це налаштування поштового сервера, при якому він приймає листи на будь-які адреси домену, навіть неіснуючі. Наприклад, якщо домен company.com налаштований як catch-all, лист на random123@company.com буде прийнято, навіть якщо такої скриньки немає. Такі email неможливо точно перевірити.",
            },
            {
              q: "Чому важливо видаляти погані email?",
              a: "Високий відсоток відмов (bounce rate) псує репутацію відправника. Поштові сервіси можуть почати відправляти ваші листи в спам або взагалі блокувати. Регулярне очищення бази допомагає зберегти високу доставлюваність.",
            },
            {
              q: "Як часто потрібно перевіряти базу email?",
              a: "Рекомендуємо перевіряти базу перед кожною великою розсилкою і мінімум раз на 3-6 місяців. Email адреси «псуються» — люди змінюють роботу, видаляють скриньки, домени перестають працювати.",
            },
            {
              q: "Що робити з одноразовими email?",
              a: "Одноразові email (disposable) краще видаляти з бази. Вони створюються на кілька хвилин або годин і потім перестають працювати. Розсилка на такі адреси — марна трата ресурсів.",
            },
            {
              q: "Які формати файлів підтримуються?",
              a: "CSV, TXT та Excel (XLSX). Email адреси повинні бути в першій колонці або по одному на рядок. Можна просто перетягнути файл на сторінку.",
            },
          ],
        },
      },
      support: {
        title: "Потрібна допомога?",
        desc: "Напишіть нам у Telegram — відповімо протягом години",
        button: "Написати в Telegram",
      },
    },
    en: {
      title: "Help Center",
      subtitle: "Complete guide to using DataCheck Pro",
      tabs: {
        hlr: "Phone Verification",
        email: "Email Verification"
      },
      hlr: {
        whatIs: {
          title: "What is HLR Verification?",
          desc: "HLR (Home Location Register) is a phone number verification through the mobile carrier's database. The system sends a request to the carrier and receives real-time information about the number's status.",
          benefits: {
            title: "Benefits",
            items: [
              "Instant number status verification",
              "Carrier and country detection",
              "Identification of non-existent numbers",
              "Save money on SMS and calls"
            ]
          },
          useCases: {
            title: "When to use",
            items: [
              "Contact list cleaning",
              "Pre-SMS campaign verification",
              "Registration number validation",
              "CRM database updates"
            ]
          }
        },
        quickStart: {
          title: "How to verify numbers",
          subtitle: "Step-by-step guide for beginners",
          steps: [
            { 
              title: "Go to verification section", 
              desc: "In the left menu, select 'HLR Check' for a single number or 'Bulk Check' for a list",
              tip: "Use quick check for a single number"
            },
            { 
              title: "Enter numbers", 
              desc: "Enter numbers manually or upload a file (CSV, TXT, Excel). Numbers should be in international format: +14155551234 or 14155551234",
              tip: "You can drag and drop files directly onto the page"
            },
            { 
              title: "Click 'Check'", 
              desc: "The system will send requests to mobile carriers. This takes 1-2 seconds per number",
              tip: "You can track progress during verification"
            },
            { 
              title: "Review results", 
              desc: "After verification, you'll see each number's status: valid, invalid, or unknown",
              tip: "Use filters for quick search"
            },
            { 
              title: "Download report", 
              desc: "Export results to CSV or Excel. You can download only valid or only invalid numbers",
              tip: "Select the filter you need before exporting"
            }
          ]
        },
        statuses: {
          title: "What statuses mean",
          description: "Verification results show the current state of the number",
          valid: { 
            title: "✅ Valid", 
            desc: "Number is active and working. Subscriber can receive calls and SMS. This number is safe to use." 
          },
          invalid: { 
            title: "❌ Invalid", 
            desc: "Number doesn't exist or is permanently disconnected. Remove it from your database — it will never work." 
          },
          unknown: { 
            title: "⚠️ Unknown", 
            desc: "Phone is off or out of coverage. Number might be working — try checking again in a few hours." 
          },
        },
        gsmCodes: {
          title: "GSM Status Codes",
          description: "Detailed information from the mobile carrier",
          codeHeader: "Code",
          statusHeader: "What it means",
          actionHeader: "What to do",
          codes: gsmCodesEn,
        },
        numberTypes: {
          title: "Phone Number Types",
          description: "The system determines the number type based on carrier data. This helps understand whether SMS can be sent to this number.",
          typeHeader: "Number Type",
          descHeader: "Description",
          smsHeader: "SMS Support",
          yes: "Yes",
          no: "No",
          note: "💡 Tip: For SMS campaigns, use only numbers with type 'mobile'. Landline phones (fixed_line) cannot receive SMS.",
          types: [
            { label: "mobile", variant: "default", meaning: "Mobile phone. Primary type for SMS campaigns and calls. Supports all communication features.", sms: true },
            { label: "fixed_line", variant: "secondary", meaning: "Landline (wired) phone. Home or office phone connected by cable. Cannot receive SMS.", sms: false },
            { label: "fixed_line_or_mobile", variant: "secondary", meaning: "Could be either landline or mobile. In some countries, the exact type cannot be determined.", sms: true },
            { label: "voip", variant: "outline", meaning: "VoIP number (internet telephony). Number operating via internet (Skype, Viber Out, etc.).", sms: false },
            { label: "toll_free", variant: "outline", meaning: "Toll-free number (1-800). Calls to this number are free for the caller.", sms: false },
            { label: "premium_rate", variant: "destructive", meaning: "Premium rate number. Calls are charged at higher rates (hotlines, services).", sms: false },
            { label: "shared_cost", variant: "outline", meaning: "Shared cost number. Part of the call cost is paid by the number owner.", sms: false },
            { label: "personal_number", variant: "outline", meaning: "Personal number. Number tied to a person, not a device.", sms: true },
            { label: "pager", variant: "destructive", meaning: "Pager. Obsolete device for receiving short messages.", sms: false },
            { label: "uan", variant: "outline", meaning: "Universal Access Number (UAN). Corporate number with call routing.", sms: false },
            { label: "unknown", variant: "secondary", meaning: "Type not determined. Could not retrieve information about the number type.", sms: true },
          ],
        },
        quality: {
          title: "Number Quality Score",
          description: "The system rates number reliability on a scale from 0 to 100 points",
          high: "🟢 High quality",
          highDesc: "60+ points — reliable number, safe to use",
          medium: "🟡 Medium quality", 
          mediumDesc: "40-59 points — needs attention, verify manually",
          low: "🔴 Low quality",
          lowDesc: "less than 40 points — unreliable number, better to remove",
        },
        faq: {
          title: "FAQ",
          items: [
            {
              q: "What format should I use for numbers?",
              a: "Use international format with country code: +14155551234 or 14155551234. You can enter one number per line or separate with commas. The system will automatically remove spaces and extra characters.",
            },
            {
              q: "What to do with 'Absent' status numbers?",
              a: "'Absent' status means the phone is off or out of network. This doesn't mean the number is bad — the subscriber might have just turned off their phone. Try checking these numbers again in a few hours or the next day.",
            },
            {
              q: "How to download only valid numbers?",
              a: "In the results, click on the 'Valid' card or use the status filter. Then click the 'Export' button — only the filtered list will be downloaded.",
            },
            {
              q: "What file formats are supported?",
              a: "CSV, TXT, and Excel (XLSX). Numbers should be in the first column or one per line. You can simply drag and drop files onto the page.",
            },
            {
              q: "How many numbers can I check at once?",
              a: "There's no limit — you can upload even 100,000 numbers. But keep in mind that verification takes 1-2 seconds per number. Large lists are better checked overnight.",
            },
          ],
        },
      },
      email: {
        whatIs: {
          title: "What is Email Validation?",
          desc: "Email validation is the verification of an email address's existence and deliverability. The system checks syntax, domain existence, mail server presence, and delivery capability.",
          benefits: {
            title: "Benefits",
            items: [
              "Reduce bounce rate",
              "Protect sender reputation",
              "Save money on email campaigns",
              "Clean your list from junk"
            ]
          },
          useCases: {
            title: "When to use",
            items: [
              "Before email campaigns",
              "During user registration",
              "Cleaning old subscriber lists",
              "Verifying leads from forms"
            ]
          }
        },
        quickStart: {
          title: "How to verify email addresses",
          subtitle: "Step-by-step guide for beginners",
          steps: [
            { 
              title: "Go to Email section", 
              desc: "In the left menu, select 'Email Check' for a single address or 'Email Bulk' for a list",
              tip: "Use single check for quick email verification"
            },
            { 
              title: "Enter email addresses", 
              desc: "Enter emails manually or upload a file (CSV, TXT, Excel). Each email on a separate line",
              tip: "You can drag and drop files directly onto the page"
            },
            { 
              title: "Click 'Check'", 
              desc: "The system will verify syntax, domain, and mail server for each address",
              tip: "Verification takes 1-3 seconds per email"
            },
            { 
              title: "Review results", 
              desc: "You'll see each email's status: good, bad, catch_all, or unknown",
              tip: "Pay attention to email category (corporate, free, disposable)"
            },
            { 
              title: "Download report", 
              desc: "Export results to CSV or Excel. You can download only valid addresses",
              tip: "Filter by quality before exporting"
            }
          ]
        },
        statuses: {
          title: "What statuses mean",
          description: "Verification results show email address quality",
          ok: { 
            title: "✅ Good", 
            desc: "Email exists and accepts messages. Safe to use for campaigns." 
          },
          catchAll: { 
            title: "⚠️ Catch-All", 
            desc: "Server accepts emails to any address on the domain. Can't precisely verify existence. Use with caution." 
          },
          invalid: { 
            title: "❌ Bad", 
            desc: "Email doesn't exist, domain doesn't work, or mailbox is full. Remove from your list." 
          },
          disposable: { 
            title: "🕐 Disposable", 
            desc: "Temporary email (mailinator, tempmail, etc.). These addresses are quickly deleted. Don't use for important campaigns." 
          },
        },
        quality: {
          title: "Email Quality",
          description: "The system determines the quality of each email address",
          qualityHeader: "Quality",
          meaningHeader: "What it means",
          actionHeader: "What to do",
          items: emailQualityEn,
        },
        categories: {
          title: "Email Categories",
          description: "The system automatically identifies email address type",
          corporate: {
            title: "🏢 Corporate",
            desc: "Email on company domain (john@company.com). Usually the most reliable addresses."
          },
          free: {
            title: "📧 Free",
            desc: "Gmail, Yahoo, Mail.ru and other free services. Can be personal or work emails."
          },
          disposable: {
            title: "⏳ Disposable",
            desc: "Temporary email services (mailinator, tempmail). Addresses are deleted after a few hours."
          }
        },
        faq: {
          title: "FAQ",
          items: [
            {
              q: "What is a Catch-All email?",
              a: "Catch-All is a mail server setting where it accepts emails to any address on the domain, even non-existent ones. For example, if company.com is configured as catch-all, an email to random123@company.com will be accepted even if that mailbox doesn't exist. Such emails can't be precisely verified.",
            },
            {
              q: "Why is it important to remove bad emails?",
              a: "High bounce rate damages sender reputation. Email services may start sending your emails to spam or block them entirely. Regular list cleaning helps maintain high deliverability.",
            },
            {
              q: "How often should I verify my email list?",
              a: "We recommend verifying before each major campaign and at least every 3-6 months. Email addresses 'decay' — people change jobs, delete mailboxes, domains stop working.",
            },
            {
              q: "What to do with disposable emails?",
              a: "Disposable emails are best removed from your list. They're created for a few minutes or hours and then stop working. Sending to such addresses is a waste of resources.",
            },
            {
              q: "What file formats are supported?",
              a: "CSV, TXT, and Excel (XLSX). Email addresses should be in the first column or one per line. You can simply drag and drop files onto the page.",
            },
          ],
        },
      },
      support: {
        title: "Need help?",
        desc: "Contact us on Telegram — we'll respond within an hour",
        button: "Message on Telegram",
      },
    },
  };

  return content[lang as keyof typeof content] || content.en;
}
