import { resolve } from "node:path";
import type { SourcePage } from "./audit-model";
export function detectMime(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!bytes.includes(0) && !bytes.toString("utf8").includes("�"))
    return "text/plain";
  throw new Error("PDF, PNG, JPEG, UTF-8 TXT/CSV немесе XLSX қажет");
}
let extracting = false;
async function ocr(bytes: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["kaz", "rus"], 1, {
    langPath: resolve("resources/ocr"),
    gzip: false,
    cacheMethod: "none",
    workerPath: resolve(
      "node_modules/tesseract.js/src/worker-script/node/index.js",
    ),
    errorHandler: () => {},
  });
  try {
    const result = await worker.recognize(bytes);
    return {
      text: result.data.text.slice(0, 150000),
      confidence: result.data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
export async function extractDocument(
  bytes: Buffer,
  mime: string,
  page: number,
  forceOcr = false,
): Promise<{ page: SourcePage; total: number }> {
  if (extracting)
    throw new Error("Басқа құжат танылып жатыр. Аяқталған соң қайталаңыз.");
  extracting = true;
  try {
    if (mime === "text/plain") {
      if (page !== 1) throw new Error("Мәтіндік файлда бір бет бар");
      return {
        page: {
          page: 1,
          text: bytes.toString("utf8").slice(0, 150000),
          method: "text",
          confidence: null,
        },
        total: 1,
      };
    }
    if (mime.includes("spreadsheetml")) {
      if (page !== 1) throw new Error("Кесте мәтіні бір көріністе беріледі");
      const { default: ExcelJS } = await import("exceljs");
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(
        bytes as unknown as Parameters<typeof book.xlsx.load>[0],
      );
      let text = "";
      for (const sheet of book.worksheets.slice(0, 10)) {
        text += `${sheet.name}\n`;
        sheet.eachRow((row, index) => {
          if (index <= 2000)
            text +=
              row.values instanceof Array
                ? row.values
                    .map((v) =>
                      typeof v === "object"
                        ? "[күрделі ұяшық]"
                        : String(v ?? ""),
                    )
                    .join(" | ") + "\n"
                : "";
        });
      }
      return {
        page: {
          page: 1,
          text: text.slice(0, 150000),
          method: "text",
          confidence: null,
        },
        total: 1,
      };
    }
    if (mime === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      try {
        const info = await parser.getInfo();
        if (page > info.total) throw new Error("PDF беті жоқ");
        if (info.total > 500) throw new Error("PDF 500 беттен аспауы тиіс");
        const result = await parser.getText({ partial: [page] });
        const text = result.pages[0]?.text || "";
        if (!forceOcr && text.replace(/\s/g, "").length > 30)
          return {
            page: {
              page,
              text: text.slice(0, 150000),
              method: "text",
              confidence: null,
            },
            total: info.total,
          };
        const images = await parser.getScreenshot({
          partial: [page],
          desiredWidth: 1700,
          imageBuffer: true,
          imageDataUrl: false,
        });
        const found = await ocr(Buffer.from(images.pages[0].data));
        return { page: { page, ...found, method: "ocr" }, total: info.total };
      } finally {
        await parser.destroy();
      }
    }
    if (page !== 1) throw new Error("Суретте бір бет бар");
    const { loadImage } = await import("@napi-rs/canvas");
    const image = await loadImage(bytes);
    if (image.width * image.height > 25e6)
      throw new Error("Сурет 25 мегапиксельден аспауы тиіс");
    const found = await ocr(bytes);
    return { page: { page: 1, ...found, method: "ocr" }, total: 1 };
  } finally {
    extracting = false;
  }
}
