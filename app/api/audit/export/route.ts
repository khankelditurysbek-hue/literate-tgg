import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { loadAudit, listDocuments } from "@/lib/audit-storage";
import { getAuditMode, auditError } from "@/lib/audit-http";
import { assessBusinessCase, inputLabels, profiles } from "@/lib/audit-engine";
import { officialProgram, compareProgramSources } from "@/lib/official-program";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const mode = getAuditMode(req),
      data = loadAudit(mode),
      docs = listDocuments(mode),
      book = new ExcelJS.Workbook();
    book.creator = "QARJY CONTROL";
    book.created = new Date();
    function sheet(name: string, headers: string[], rows: unknown[][]) {
      const s = book.addWorksheet(name);
      s.addRow(headers);
      for (const row of rows)
        s.addRow(row.map((v) => (typeof v === "number" ? v : String(v ?? ""))));
      s.views = [{ state: "frozen", ySplit: 1 }];
      s.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      s.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF164653" },
      };
      s.columns.forEach((c, i) => {
        c.width = i === 0 ? 24 : 35;
        c.alignment = { vertical: "top", wrapText: true };
      });
      s.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: s.rowCount, column: headers.length },
      };
      return s;
    }
    sheet(
      "Нәтижелер",
      [
        "ID",
        "Тексеру",
        "Режим",
        "Ереже",
        "Жоспар",
        "Өлшем",
        "Есептік қажеттілік",
        "Артық көлем",
        "Мәртебе",
        "Нарық медианасы ₸",
        "Баға ауытқуы %",
        "Жетіспейтін дерек",
        "Сыни баға",
      ],
      data.data.cases.map((c) => {
        const r = assessBusinessCase(c, docs);
        return [
          c.id,
          c.title,
          mode,
          profiles[c.profile].name,
          c.inputs.planned.value,
          c.unit,
          r.quantity.need,
          r.quantity.excess,
          r.label,
          r.market.reference,
          r.market.deviation,
          r.quantity.missing.join("; "),
          c.expertNote,
        ];
      }),
    );
    sheet(
      "Сандар мен дәлел",
      [
        "Тексеру ID",
        "Көрсеткіш",
        "Мән",
        "Файл ID",
        "Бет",
        "Құжаттағы сан",
        "Дәл үзінді",
        "Өлшем және кезең",
        "Дереккөз күні",
        "Формула",
      ],
      data.data.cases.flatMap((c) =>
        profiles[c.profile].keys.map((k) => {
          const v = c.inputs[k];
          return [
            c.id,
            inputLabels[k],
            v.value,
            v.documentId,
            v.page,
            v.raw,
            v.quote,
            v.context,
            docs.find((d) => d.id === v.documentId)?.date,
            assessBusinessCase(c, docs).quantity.formula,
          ];
        }),
      ),
    );
    sheet(
      "Нарық",
      [
        "Тексеру ID",
        "Аноним белгі",
        "Тәуелсіздік тобы",
        "Баға ₸",
        "Күні",
        "Кірді ме",
        "Алып тастау себебі",
        "Файл ID",
        "Бет",
        "Дәл үзінді",
      ],
      data.data.cases.flatMap((c) =>
        assessBusinessCase(c, docs).market.quotes.map((q) => [
          c.id,
          q.alias,
          q.independenceGroup,
          q.price.value,
          q.date,
          q.included ? "Иә" : "Жоқ",
          q.reasons.join("; "),
          q.price.documentId,
          q.price.page,
          q.price.quote,
        ]),
      ),
    );
    sheet(
      "Баламалар",
      [
        "Тексеру ID",
        "Нұсқа",
        "Нәтиже",
        "Сәйкестік",
        "Бастапқы ₸",
        "Жылдық ₸",
        "Кезең соңы ₸",
        "Жыл",
        "Толық құн ₸",
        "Құжат жеткіліксіздігі",
      ],
      data.data.cases.flatMap((c) =>
        assessBusinessCase(c, docs).options.map((o) => [
          c.id,
          o.label,
          o.outcome,
          o.meetsNeed,
          o.initial,
          o.annual,
          o.endCost,
          o.horizon,
          o.total,
          o.issues.join("; "),
        ]),
      ),
    );
    sheet(
      "Құжаттар",
      [
        "ID",
        "Файл",
        "Дереккөз",
        "URL",
        "Алынған күн",
        "Сипатталған түрі",
        "SHA-256",
        "Байт",
        "Танылған беттер",
      ],
      docs.map((d) => [
        d.id,
        d.name,
        d.source,
        d.url,
        d.date,
        d.origin,
        d.sha256,
        d.size,
        d.pages.map((p) => `${p.page} (${p.method})`).join(", "),
      ]),
    );
    sheet(
      "Нақты бағдарлама сынағы",
      [
        "Бағдарлама ID",
        "Көрсеткіш",
        "Жыл",
        "Өлшем",
        "Портал",
        "XLS",
        "Нәтиже",
        "Портал URL",
        "XLS URL",
        "Алынған күн",
        "Ұяшықтар",
      ],
      compareProgramSources().rows.map((r) => [
        officialProgram.id,
        r.name,
        r.year,
        r.unit,
        r.portal,
        r.attachment,
        r.matches ? "Сәйкес" : "Нақтылау керек",
        officialProgram.url,
        officialProgram.fileUrl,
        officialProgram.retrievedAt,
        r.cells,
      ]),
    );
    sheet(
      "Оқу ережесі",
      ["Тақырып", "Мазмұны"],
      [
        [
          "Режим",
          mode === "demo"
            ? "DEMO — шартты дерек, нақты сынаққа қосылмайды"
            : "Нақты режим — құжат түпнұсқалығын адам тексереді",
        ],
        ["Нұсқа", data.version],
        [
          "Қызыл белгі",
          "Дәлел емес; сарапшы назарын сұрайды. Нақты компанияны кінәлауға болмайды.",
        ],
        [
          "Үнем",
          "Құрал нақты үнемді есептемейді; көлем айырмасы мен баға ауытқуы үнем емес.",
        ],
        [
          "Нақты бағдарлама",
          "Бір бағдарламаның екі ресми көрінісі; дерек сапасының алдын ала тексеруі. Артық көлем тәуекелінің толық далалық валидациясы емес.",
        ],
        ["Жеке дерек", "ЖСН, телефон, жеке мекенжай енгізбеңіз."],
        [
          "Файл хэші",
          "Сақталған байттардың ізі; құжат шынайылығы немесе ЭЦҚ растауы емес.",
        ],
      ],
    );
    const bytes = await book.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="qarjy-audit-${mode}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return auditError(e);
  }
}
