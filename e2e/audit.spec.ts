import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";

test("Value Gate 2: evidence-backed demo, profile rules, market exclusions, exports, mode isolation", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Тексеру үстелі", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page.getByRole("button", { name: "6 сценарийді қосу" }).click();
  await expect(page.getByRole("table")).toContainText(
    "20 жұмыс орнына компьютер қажеттілігі",
  );
  await expect(page.locator(".aq-metrics")).toContainText("80%");
  const initial = await (await request.get("/api/audit?mode=demo")).json();
  expect(initial.data.cases).toHaveLength(6);
  expect(initial.documents.length).toBeGreaterThan(20);
  await page
    .getByRole("button", { name: "Қажеттілік есебі", exact: true })
    .click();
  await expect(page.locator(".aq-result-number")).toContainText("8");
  await expect(page.locator(".aq-result-card")).toContainText("12 дана");
  await page
    .getByRole("button", { name: "Нарық салыстыруы", exact: true })
    .click();
  await expect(page.locator(".aq-result-card")).toContainText("3 / 4");
  await expect(page.locator(".aq-result-card")).toContainText(/33[.,]3%/);
  await page.locator(".aq-offer").last().locator(":scope > summary").click();
  await expect(page.locator(".aq-offer").last()).toContainText(
    "Бір топ / бір файл қайта саналған",
  );
  await page
    .getByRole("button", { name: "Бес сұрақтық негіздеме", exact: true })
    .click();
  await expect(page.locator(".aq-five .ready")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Нәтиже және есеп", exact: true })
    .click();
  let d = page.waitForEvent("download");
  await page.getByRole("button", { name: "3–5 беттік түсініктеме" }).click();
  let download = await d;
  const html = await readFile((await download.path())!, "utf8");
  expect((html.match(/<section>/g) || []).length).toBe(5);
  expect(html).toContain("3542837");
  expect(html).not.toContain("<script>");
  d = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel нәтижелері" }).click();
  download = await d;
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile((await download.path())!);
  expect(book.getWorksheet("Нәтижелер")!.rowCount).toBe(7);
  expect(book.getWorksheet("Нақты бағдарлама сынағы")!.rowCount).toBe(13);
  await page
    .getByRole("button", { name: "Нақты бағдарлама сынағы", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "7 / 12 ортақ ұяшықта мән сәйкес емес" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("149");
  await page
    .getByRole("button", { name: "Қажеттілік есебі", exact: true })
    .click();
  const planned = page.getByLabel("Жоспарланған көлем", { exact: true });
  await planned.fill("30");
  await expect(page.locator(".aq-result-card")).toContainText(
    "Дерек жеткіліксіз",
  );
  await page
    .getByRole("button", { name: "Өзгерістерді сақтау", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("сақталды");
  await page.reload();
  await page.getByRole("button", { name: "DEMO", exact: true }).click();
  await page
    .getByRole("button", { name: "Қажеттілік есебі", exact: true })
    .click();
  await expect(planned).toHaveValue("30");
  await expect(page.locator(".aq-result-card")).toContainText(
    "Дерек жеткіліксіз",
  );
  const real = await (await request.get("/api/audit?mode=real")).json();
  const cross = await request.put("/api/audit?mode=real", {
    data: { version: real.version, data: initial.data },
  });
  expect(cross.status()).toBe(400);
  expect(
    (
      await request.get(
        `/api/documents?mode=real&id=${initial.documents[0].id}`,
      )
    ).status(),
  ).toBe(404);
  const current = await (await request.get("/api/audit?mode=demo")).json();
  expect(
    (
      await request.put("/api/audit?mode=demo", {
        data: { version: current.version - 1, data: current.data },
      })
    ).status(),
  ).toBe(409);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Тексеру үстелі", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/value-gate-2-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.screenshot({
    path: "test-results/value-gate-2-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("PDF and image: real local extraction, page preview, document bytes and source date persist", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Құжаттар мен суреттер", exact: true })
    .click();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1100;
    c.height = 320;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "black";
    x.font = "40px Arial";
    x.fillText("Жоспар саны 20", 50, 100);
    x.fillText("Қолда бар 12", 50, 180);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[name="file"]').setInputFiles({
    name: "synthetic-scan.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await page
    .getByLabel("Дереккөз / құжат иесі", { exact: true })
    .fill("Автоматты тест — нақты орган емес");
  await page.getByRole("button", { name: "Түпнұсқаны сақтау" }).click();
  await expect(page.getByRole("status")).toContainText("Түпнұсқа сақталды");
  await page
    .getByRole("button", { name: "Бет мәтінін алу", exact: true })
    .click();
  await expect(page.locator(".aq-source-view pre")).toContainText("20", {
    timeout: 60000,
  });
  await expect(page.locator(".aq-source-view pre")).toContainText("12");
  await page.getByRole("button", { name: "Бет суретін көрсету" }).click();
  await expect(page.getByAltText("Түпнұсқа құжат беті")).toBeVisible();
  const all = await (await request.get("/api/audit?mode=real")).json(),
    image = all.documents.find(
      (d: { name: string }) => d.name === "synthetic-scan.png",
    );
  expect(image.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(image.pages[0].method).toBe("ocr");
  const original = await request.get(`/api/documents?mode=real&id=${image.id}`);
  expect((await original.body()).equals(Buffer.from(data, "base64"))).toBe(
    true,
  );
  // Browser-generated fixture, not an actual procurement document.
  const fixture = await page.context().newPage();
  await fixture.setContent(
    '<meta charset="utf-8"><h1>QARJY TEST</h1><p>Жоспар саны = 20</p><p>Қор саны = 12</p>',
  );
  const pdf = await fixture.pdf({ format: "A4" });
  await fixture.close();
  const upload = await request.post("/api/documents?mode=real", {
    multipart: {
      file: { name: "synthetic.pdf", mimeType: "application/pdf", buffer: pdf },
      source: "Тест PDF",
      url: "",
      date: "2026-11-02",
      origin: "internal",
    },
  });
  expect(upload.status()).toBe(201);
  const doc = await upload.json();
  const extracted = await request.post("/api/documents/extract?mode=real", {
    data: { id: doc.id, page: 1 },
  });
  expect(extracted.status()).toBe(200);
  expect((await extracted.json()).pages[0].text).toContain("20");
  const preview = await request.post("/api/documents/preview?mode=real", {
    data: { id: doc.id, page: 1 },
  });
  expect(preview.status()).toBe(200);
  expect(preview.headers()["content-type"]).toBe("image/png");
  expect(
    (
      await request.post("/api/documents/extract?mode=real", {
        data: { id: doc.id, page: 999 },
      })
    ).status(),
  ).toBe(400);
  const external = await request.post("/api/documents?mode=real", {
    headers: { Origin: "https://example.org" },
    multipart: {
      file: {
        name: "a.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("test"),
      },
      source: "test",
      url: "",
      date: "2026-11-02",
      origin: "internal",
    },
  });
  expect(external.status()).toBe(400);
  await page.reload();
  await page
    .getByRole("button", { name: "Құжаттар мен суреттер", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Оқылатын құжат" }),
  ).toContainText("synthetic.pdf");
});
