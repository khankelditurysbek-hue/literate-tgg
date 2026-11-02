// Facts transcribed and checked against the portal table and the downloadable XLS.
// Original files are not redistributed; the identifiers let the reader recheck them.
export const officialProgram = {
  id: "3542837",
  code: "010",
  administrator: "752 — Қызылорда облысының қоғамдық даму басқармасы",
  title: "Мемлекеттік тілді және Қазақстан халқының басқа да тілдерін дамыту",
  retrievedAt: "2026-11-02",
  attachmentAddedAt: "2024-12-17",
  url: "https://budget.egov.kz/budgetprogram/budgetprogram?budgetId=3542837&budgetState=APPROVED",
  fileUrl: "https://budget.egov.kz/budgetfile/file?fileId=3542841",
  fileName: "УОР - БП на декабрь.xls",
  fileSha256:
    "522272eab470e7a3986a8458604ba22e3e4f2927f1770a79d67260ab746cf82d",
  portalYears: [2023, 2024, 2025, 2026, 2027],
  attachmentYears: [2022, 2023, 2024, 2025, 2026],
  series: [
    {
      key: "budget",
      name: "Бағдарламаның жалпы шығысы",
      unit: "мың теңге",
      portal: [73614, 120035, 122432.6, 148757, 149560],
      attachment: [73614, 120035, 122432.6, 148757, 149560],
      cells: "010 каз / 010 рус: C31:G31 (жыл), C34:G34 (сома)",
    },
    {
      key: "staff",
      name: "Тілдерді оқыту орталығының штаттық бірлігі",
      unit: "бірлік",
      portal: [35, 38, 38, 38, 38],
      attachment: [35, 38, 38, 38, 38],
      cells: "010 каз / 010 рус: C43:G43 (жыл), C44:G44 (сан)",
    },
    {
      key: "projects",
      name: "Мемлекеттік әлеуметтік тапсырыс жобалары",
      unit: "бірлік",
      portal: [0, 3, 2, 2, 2],
      attachment: [0, 3, 2, 2, 2],
      cells: "010 каз / 010 рус: C43:G43 (жыл), C45:G45 (сан)",
    },
  ],
  note: "Excel файлының өзінде жыл атаулары ескірген болуы мүмкін; портал кестесі де қате болуы мүмкін. Қайсысы дұрыс екені осы ашық деректермен шешілмейді. Бұл дерек сапасын нақтылау белгісі; құқықбұзушылық туралы қорытынды емес.",
};
export function compareProgramSources(program = officialProgram) {
  const rows = program.series.flatMap((s) =>
    program.portalYears
      .filter((y) => program.attachmentYears.includes(y))
      .map((year) => {
        const portal = s.portal[program.portalYears.indexOf(year)],
          attachment = s.attachment[program.attachmentYears.indexOf(year)];
        return {
          key: s.key,
          name: s.name,
          year,
          unit: s.unit,
          portal,
          attachment,
          matches: portal === attachment,
          cells: s.cells,
        };
      }),
  );
  const headerMismatch = program.portalYears.some(
    (year, i) => program.attachmentYears[i] !== year,
  );
  return {
    rows,
    headerMismatch,
    mismatches: rows.filter((r) => !r.matches).length,
    total: rows.length,
    usable: !headerMismatch && rows.every((r) => r.matches),
  };
}
export function programTrialCsv() {
  const result = compareProgramSources();
  const rows = [
    [
      "program_id",
      "indicator",
      "year",
      "unit",
      "portal",
      "attachment",
      "result",
      "source_url",
      "file_url",
      "retrieved_at",
    ],
    ...result.rows.map((r) => [
      officialProgram.id,
      r.name,
      r.year,
      r.unit,
      r.portal,
      r.attachment,
      r.matches ? "Сәйкес" : "Дерек сәйкессіз — нақтылау керек",
      officialProgram.url,
      officialProgram.fileUrl,
      officialProgram.retrievedAt,
    ]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n")
  );
}
