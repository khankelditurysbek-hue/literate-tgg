import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";

test("Толық сценарий: өтінім → активтер → TCO → шешім → импорт/экспорт → DEMO бөлінуі", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/archive");
  await expect(
    page.getByRole("heading", { name: "Басқару панелі", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Алғашқы өтінімді тексеруден бастаңыз"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Жаңа өтінім", exact: true }).click();
  let modal = page.getByRole("dialog");
  for (const [label, value] of [
    ["Өтінім идентификаторы", "REAL-001"],
    ["Мемлекеттік орган", "Сынақ органы"],
    ["Тауар немесе қызмет атауы", "Ноутбуктер"],
    ["Сатып алу санаты", "Компьютер"],
    ["Жоспарланған саны", "20"],
    ["Бірлік бағасы, ₸", "250000"],
    ["Қажетті жұмыс орындары / алушылар саны", "20"],
    ["Қажетті қызметтік нәтиже", "20 қосымша жұмыс орнын қамтамасыз ету"],
    ["Негіздемелік құжат / құжатқа сілтеме", "Сынақ актісі"],
    ["Ақпарат көзі", "Интеграциялық сынақ"],
    ["Дәлел құжатының атауы", "Түгендеу актісі"],
    ["Дерек алынған күн", "2026-11-02"],
  ])
    await modal.getByLabel(label, { exact: false }).fill(value);
  await modal.getByLabel("Дерек сенімділігі").selectOption("documented");
  await modal.getByLabel("Дерек пен құжатты тексердім").check();
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole("button", { name: "Қажеттілікті тексеру", exact: true })
    .click();
  await page.getByText("Осы санаттағы активтер толық түгенделді").click();
  await expect(page.getByRole("status")).toContainText("сақталды");
  await page
    .getByRole("button", { name: "Активтер тізілімі", exact: true })
    .click();
  await page.getByRole("button", { name: "Актив енгізу", exact: true }).click();
  modal = page.getByRole("dialog");
  for (const [label, value] of [
    ["Жалпы саны", "15"],
    ["Қолданылып жатқан саны", "0"],
    ["Жарамды бос активтер", "12"],
    ["Жөндеуге жарамды", "2"],
    ["Жарамсыз", "1"],
    ["Тексеру күні", "2026-11-02"],
    ["Тексеруші (қызметтік рөлі)", "Түгендеуші"],
    ["Ақпарат көзі", "Сынақ"],
    ["Дәлел құжатының атауы", "Акт"],
    ["Дерек алынған күн", "2026-11-02"],
  ])
    await modal.getByLabel(label, { exact: true }).fill(value);
  await modal.getByLabel("Функционалдық сәйкестік").selectOption("true");
  await modal
    .getByLabel("Талдау мерзімінде нақты қолжетімді")
    .selectOption("true");
  await modal.getByLabel("Дерек сенімділігі").selectOption("documented");
  await modal.getByLabel("Дерек пен құжатты тексердім").check();
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole("button", { name: "Баламаларды салыстыру", exact: true })
    .click();
  for (const [name, cost] of [
    ["Толық сатып алу", "5000000"],
    ["Ішінара сатып алу", "2000000"],
  ]) {
    await page
      .getByRole("button", { name: "Балама қосу", exact: true })
      .click();
    modal = page.getByRole("dialog");
    await modal.getByLabel("Балама атауы").fill(name);
    for (const input of await modal.locator("input[type=number]").all())
      await input.fill("0");
    await modal.getByLabel("Бастапқы сатып алу құны, ₸").fill(cost);
    await modal.getByLabel("Қамтамасыз етілетін қызмет мерзімі, жыл").fill("3");
    await modal
      .getByLabel("Бірдей қызметтік нәтижеге сәйкес пе?")
      .selectOption("true");
    await modal.getByLabel("Ақпарат көзі", { exact: true }).fill("Сынақ");
    await modal.getByLabel("Дәлел құжатының атауы").fill("Баға негіздемесі");
    await modal.getByLabel("Дерек алынған күн").fill("2026-11-02");
    await modal.getByLabel("Дерек сенімділігі").selectOption("documented");
    await modal.getByLabel("Дерек пен құжатты тексердім").check();
    await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
    await expect(modal).not.toBeVisible();
  }
  await page
    .getByRole("button", { name: "Қаржылық тиімділік", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Нұсқалар мен растауды енгізу" })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Салыстырылатын бастапқы нұсқа")
    .selectOption({ label: "Толық сатып алу" });
  await modal
    .getByLabel("Қолмен таңдалған балама")
    .selectOption({ label: "Ішінара сатып алу" });
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByText("Нақты үнем расталмаған", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Қажеттілікті тексеру", exact: true })
    .click();
  await expect(
    page.getByText("Ықтимал артық көлем анықталды", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".metric").filter({ hasText: "Негізделген жаңа саны" }),
  ).toContainText("8");
  await page
    .getByRole("button", { name: "Шешімдер журналы", exact: true })
    .click();
  await page.getByRole("button", { name: "Шешім тіркеу", exact: true }).click();
  modal = page.getByRole("dialog");
  for (const [label, value] of [
    ["Анықталған мәселе", "Артық көлем"],
    ["Дәлел", "Түгендеу актісі"],
    ["Ұсынылған шешім", "8 дана сатып алу"],
    ["Шешім қабылдаушының рөлі", "Сатып алу маманы"],
    ["Негіздеме", "12 бос жарамды актив бар"],
  ])
    await modal.getByLabel(label, { exact: false }).fill(value);
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Шешімдер журналы", exact: true })
    .click();
  await expect(
    page.getByText("8 дана сатып алу", { exact: true }),
  ).toBeVisible();
  const state = await (await request.get("/api/store?mode=real")).json();
  expect(state.data.requests).toHaveLength(1);
  expect(state.data.decisions).toHaveLength(1);
  const conflict = await request.put("/api/store?mode=real", {
    data: { data: state.data, version: 0 },
  });
  expect(conflict.status()).toBe(409);
  await page
    .getByRole("button", { name: "Сатып алу өтінімдері", exact: true })
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "XLSX", exact: true }).click();
  const downloaded = await downloadEvent;
  const path = await downloaded.path();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await readFile(path!)) as never);
  expect(wb.worksheets[0].getCell("A2").value).toBe("REAL-001");
  await page.locator("input[type=file]").setInputFiles({
    name: "trial.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "id,organization,title,category,plannedQuantity,unit,unitPrice,requiredOutcome,requiredQuantity,horizon\nREAL-002,Сынақ органы,Принтер,Принтер,2,дана,100000,Қосымша жұмыс,2,3\n",
    ),
  });
  await expect(
    page.getByRole("heading", { name: "Импортты растау" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Дерекқорға сақтау" }).click();
  await expect(page.getByText("REAL-002 · Сынақ органы")).toBeVisible();
  const importedRow = page.getByRole("row").filter({ hasText: "REAL-002" });
  await importedRow
    .getByRole("button", { name: "Өзгерту", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Тауар немесе қызмет атауы")
    .fill("Өзгертілген принтер");
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(importedRow).toContainText("Өзгертілген принтер");
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page
    .getByRole("button", { name: "Мысалды жүктеу", exact: true })
    .click();
  await expect(
    page.getByText("DEMO-001 · Шартты мемлекеттік орган"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Нақты дерек", exact: true }).click();
  await expect(page.getByText("REAL-002 · Сынақ органы")).toBeVisible();
  await expect(
    page.getByText("DEMO-001 · Шартты мемлекеттік орган"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Басқару панелі", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Мәзір", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Мәзір", exact: true }).click();
  await page
    .getByRole("button", { name: "Жоба әдістемесі", exact: true })
    .click();
  await expect(
    page.getByText("Дәрістегі таңдалған құрал — нақтылау қажет"),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-method.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const section of [
    "Есептер және аналитика",
    "Нақты деректермен сынақ",
    "Сыни бағалау",
    "ЖИ итерациялары",
    "Тәуекелдер мен ескертулер",
  ]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: section, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Сатып алу өтінімдері", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("row")
    .filter({ hasText: "REAL-002" })
    .getByRole("button", { name: "Жою", exact: true })
    .click();
  await expect(page.getByText("REAL-002 · Сынақ органы")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Қосымша формалар: ресми сынақ, сарапшы бағасы, ЖИ журналы, әдістеме және есеп", async ({
  page,
  request,
}) => {
  const { demoDataset } = await import("../lib/demo");
  const current = await (await request.get("/api/store?mode=demo")).json();
  expect(
    (
      await request.put("/api/store?mode=demo", {
        data: {
          data: demoDataset(),
          version: current.version,
          resetDemo: true,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/archive");
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page
    .getByRole("button", { name: "Сатып алу өтінімдері", exact: true })
    .click();
  await expect(
    page.getByText("DEMO-001 · Шартты мемлекеттік орган"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Жоба әдістемесі", exact: true })
    .click();
  await page.getByRole("button", { name: "Әдістемені толықтыру" }).click();
  let modal = page.getByRole("dialog");
  await modal
    .getByLabel("Дәрістегі нақты таңдалған құрал")
    .fill("Шартты тест құралы");
  await modal
    .getByLabel("Жауапты маманның қызметтік рөлі")
    .fill("Пилот жетекшісі");
  await modal.getByLabel("Тексеру жиілігі").fill("Әрбір жоспарлау алдында");
  await modal
    .getByLabel("Кезеңдер, мерзімдер және жауапкершілік")
    .fill("Шартты пилот → тексеру → мониторинг");
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.getByRole("button", { name: "Сыни бағалау", exact: true }).click();
  await page.getByRole("button", { name: "Бағалау қосу" }).click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Жалған дабылдар")
    .fill("Шартты сценарий: мерзімде қолжетімсіз актив");
  await modal
    .getByLabel("Сарапшының қорытындысы")
    .fill("Қолжетімділікті қайта тексеру керек");
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByText("Қолжетімділікті қайта тексеру керек", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ЖИ итерациялары", exact: true })
    .click();
  await page.getByRole("button", { name: "Нақты итерация енгізу" }).click();
  modal = page.getByRole("dialog");
  for (const label of [
    "Нақты енгізілген промпт",
    "Қабылданған шешім",
    "Орындалған тексерулер",
    "Нақты өзгерістер",
  ])
    await modal
      .getByLabel(label, { exact: false })
      .fill("Шартты тест мәтіні, нақты диалог емес");
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole("button", { name: "Нақты деректермен сынақ", exact: true })
    .click();
  await page.getByRole("button", { name: "Жазба қосу" }).click();
  modal = page.getByRole("dialog");
  await modal.getByLabel("Ресми идентификатор").fill("DEMO-LOT");
  await modal.getByLabel("Атауы", { exact: false }).fill("Шартты лот");
  await modal.getByLabel("Ресми дереккөз URL").fill("https://goszakup.gov.kz");
  await modal.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ has: page.getByText("DEMO-LOT", { exact: true }) })
      .getByText(
        "Бұл лот бойынша негізгі тәуекелді тексеруге қажетті ішкі деректер жоқ",
        { exact: true },
      ),
  ).toBeVisible();
  const response = await request.get(
    "/api/files?mode=demo&kind=trials&format=xlsx",
  );
  expect(response.ok()).toBeTruthy();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await response.body()) as never);
  expect(wb.worksheets[0].getColumn(3).values).toContain("DEMO-LOT");
  const upload = await request.post("/api/files?mode=real&kind=trials", {
    multipart: {
      file: {
        name: "invalid.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "id,type,officialId,title,url,date\nx,lot,1,Wrong,javascript:alert(1),2026-01-01\n",
        ),
      },
    },
  });
  expect(upload.status()).toBe(400);
  await page
    .getByRole("button", { name: "Есептер және аналитика", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Түсініктеме және енгізу жоспары" })
    .click();
  const download = await event;
  const content = await readFile((await download.path())!, "utf8");
  expect(content).toContain("Пилот жетекшісі");
  expect(content).toContain("Шартты тест құралы");
  expect(content).toContain("DEMO — Шартты дерек");
  expect(content).toContain(
    "Бұл лот бойынша негізгі тәуекелді тексеруге қажетті ішкі деректер жоқ",
  );
  expect(content.match(/<section>/g)).toHaveLength(5);
  await page.reload();
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page.getByRole("button", { name: "Сыни бағалау", exact: true }).click();
  await expect(
    page.getByText("Қолжетімділікті қайта тексеру керек", { exact: true }),
  ).toBeVisible();
});

test("Актив жүктемесі: нақты кейс, өзгерту, сақтау, экспорт және бұрынғы деректерді сақтау", async ({
  page,
  request,
}) => {
  const before = await (await request.get("/api/store?mode=real")).json();
  await page.goto("/archive");
  await page
    .getByRole("button", { name: "Актив жүктемесі", exact: true })
    .click();
  await expect(
    page.getByText("Жүктеме жазбалары енгізілмеген", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Шиелі аудит кейсін қарау" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ресми аудит кейсі" }),
  ).toContainText("бұзушылықтар анықталмағаны");
  expect(
    (await (await request.get("/api/store?mode=real")).json()).data.workloads,
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Нақты дерекке қосу" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("17.99%", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Төмен жүктеме: себептерін тексеру қажет", { exact: true }),
  ).toBeVisible();
  const after = await (await request.get("/api/store?mode=real")).json();
  expect(after.data.trials).toEqual(before.data.trials);
  expect(after.data.requests).toEqual(before.data.requests);
  expect(after.data.decisions).toEqual(before.data.decisions);
  await page.getByRole("button", { name: "Жүктеме жазбасын өзгерту" }).click();
  let form = page.getByRole("dialog", { name: "Жүктеме жазбасы" });
  await form.getByLabel("Қарау шегі, % (1–100)").fill("10");
  await form.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByText("Жүктеме белгіленген шектен төмен емес", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Жүктеме жазбасын өзгерту" }).click();
  form = page.getByRole("dialog", { name: "Жүктеме жазбасы" });
  await form.getByLabel("Қарау шегі, % (1–100)").fill("30");
  await form
    .getByLabel("Резервтік / шұғыл медициналық қажеттілік бар ма?")
    .selectOption("yes");
  await form.getByRole("button", { name: "Сақтау", exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByText("Төмен жүктеме: түсіндірмені сарапшы бағаласын", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Актив жүктемесі", exact: true })
    .click();
  await expect(page.getByText("17.99%", { exact: true })).toBeVisible();
  const response = await request.get(
    "/api/files?mode=real&kind=workloads&format=xlsx",
  );
  expect(response.ok()).toBeTruthy();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await response.body()) as never);
  const sheet = wb.worksheets[0];
  const cells = sheet.getRow(1).values as unknown[];
  const col = cells.findIndex((v) => v === "utilizationPercent");
  expect(sheet.getRow(2).getCell(col).value as number).toBeCloseTo(
    (914 / 5080) * 100,
  );
  await page
    .getByRole("button", { name: "Есептер және аналитика", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Түсініктеме және енгізу жоспары" })
    .click();
  const downloaded = await event;
  const content = await readFile((await downloaded.path())!, "utf8");
  expect(content).toContain("17.99%");
  expect(content.match(/<section>/g)).toHaveLength(5);
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page
    .getByRole("button", { name: "Актив жүктемесі", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Бейне гастроскопы бар эндоскопиялық бейнеақпараттық жүйе",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("DEMO · Эндоскопиялық жүйе", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Шиелі аудит кейсін қарау" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Нақты дерек", exact: true }).click();
  await page
    .getByRole("button", { name: "Актив жүктемесі", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/workload-case-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/workload-case-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Жүктеме жазбасын жою" }).click();
  await expect(
    page.getByText("Жүктеме жазбалары енгізілмеген", { exact: true }),
  ).toBeVisible();
});

test("Ішкі қарау кезеңдері: серверлік шектеулер, тарих және толтырылған DEMO жұмыс кеңістігі", async ({
  page,
  request,
}) => {
  await page.goto("/archive");
  await page
    .getByRole("button", { name: "Өтінімдерді қарау", exact: true })
    .click();
  let card = page.locator(".review-card").filter({ hasText: "REAL-001" });
  await card.getByRole("button", { name: "Кезеңді тіркеу" }).click();
  let modal = page.getByRole("dialog", { name: "Өтінім кезеңін тіркеу" });
  await modal.getByLabel("Ұсынған бөлім").fill("IT бөлімі");
  await modal.getByLabel("Жауапты маманның рөлі").fill("Сатып алу маманы");
  await modal.getByLabel("Жаңа кезең").selectOption("submitted");
  await modal.getByLabel("Оқиғаны тіркеушінің рөлі").fill("Бөлім маманы");
  await modal
    .getByLabel("Оқиға / шешім негіздемесі")
    .fill("Қосымша жұмыс орындары бойынша өтінім ұсынылды");
  await modal.getByRole("button", { name: "Кезеңді сақтау" }).click();
  await expect(modal).not.toBeVisible();
  await expect(card.locator(".stage-badge")).toContainText("Ұсынылды");
  await card.getByRole("button", { name: "Кезеңді тіркеу" }).click();
  modal = page.getByRole("dialog", { name: "Өтінім кезеңін тіркеу" });
  await modal.getByLabel("Жаңа кезең").selectOption("review");
  await modal.getByLabel("Оқиғаны тіркеушінің рөлі").fill("Сарапшы");
  await modal
    .getByLabel("Оқиға / шешім негіздемесі")
    .fill("Активтер мен баламаларды қарау басталды");
  await modal.getByRole("button", { name: "Кезеңді сақтау" }).click();
  await expect(modal).not.toBeVisible();
  await card.getByRole("button", { name: "Кезеңді тіркеу" }).click();
  modal = page.getByRole("dialog", { name: "Өтінім кезеңін тіркеу" });
  await modal.getByLabel("Жаңа кезең").selectOption("approved");
  await modal.getByLabel("Оқиғаны тіркеушінің рөлі").fill("Ішкі бақылаушы");
  await modal
    .getByLabel("Оқиға / шешім негіздемесі")
    .fill("Ішінара сатып алу нұсқасын ішкі қарауда келісу");
  await modal.getByRole("button", { name: "Кезеңді сақтау" }).click();
  await expect(modal.getByRole("alert")).toContainText("Ескертулерді");
  await modal
    .getByLabel("Ескертулерді қарап, қабылданған шешімге негіздеме бердім")
    .check();
  await modal.getByRole("button", { name: "Кезеңді сақтау" }).click();
  await expect(modal).not.toBeVisible();
  await expect(card.locator(".stage-badge")).toContainText(
    "Ішкі келісім берілді",
  );
  const state = await (await request.get("/api/store?mode=real")).json();
  const record = state.data.requests.find(
    (r: { id: string }) => r.id === "REAL-001",
  );
  expect(record.workflow.events).toHaveLength(3);
  const tampered = structuredClone(state.data);
  tampered.requests.find(
    (r: { id: string }) => r.id === "REAL-001",
  ).workflow.events[0].note = "Ескі тарихты өзгерту";
  expect(
    (
      await request.put("/api/store?mode=real", {
        data: { data: tampered, version: state.version },
      })
    ).status(),
  ).toBe(400);
  const incomplete = structuredClone(state.data);
  incomplete.requests.find(
    (r: { id: string }) => r.id === "REAL-001",
  ).requiredQuantity = null;
  expect(
    (
      await request.put("/api/store?mode=real", {
        data: { data: incomplete, version: state.version },
      })
    ).status(),
  ).toBe(400);
  await page.reload();
  await page
    .getByRole("button", { name: "Өтінімдерді қарау", exact: true })
    .click();
  card = page.locator(".review-card").filter({ hasText: "REAL-001" });
  await expect(card.locator(".stage-badge")).toContainText(
    "Ішкі келісім берілді",
  );
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await expect(page.locator(".review-card")).toHaveCount(10);
  await page.getByRole("button", { name: /^Ішкі келісім берілді/ }).click();
  await expect(page.locator(".review-card")).toHaveCount(2);
  await page.getByRole("button", { name: /^Барлығы/ }).click();
  await page.getByLabel("Қарау кезегін іздеу").fill("Микроскоп");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await expect(page.locator(".review-card")).toContainText("Дерек жеткіліксіз");
  await page.getByLabel("Қарау кезегін іздеу").fill("");
  await page.getByLabel("Басымдық сүзгісі").selectOption("urgent");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await page.getByLabel("Басымдық сүзгісі").selectOption("all");
  await page.screenshot({
    path: "test-results/review-desk-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Басқару панелі", exact: true })
    .click();
  await expect(page.locator(".donut strong")).toHaveText("10");
  await page.screenshot({
    path: "test-results/rich-demo-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Мәзір", exact: true }).click();
  await page
    .getByRole("button", { name: "Өтінімдерді қарау", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/review-desk-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
