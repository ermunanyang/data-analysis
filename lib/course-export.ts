import fs from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";
import JSZip from "jszip";

import { calculateCourse } from "@/lib/course-calculator";
import type { CourseInput } from "@/lib/course-schema";

type ProcessMethod = {
  index: number;
  name: string;
  category: "PROCESS" | "RESULT" | "OTHER";
  fullScore: number;
  enabled: boolean;
};

type ReportProcessItem = {
  name: string;
  weight: number;
  targetScore: number;
  averageScore: number;
  attainment: number;
};

type ReportTargetSummary = {
  targetName: string;
  processItems: ReportProcessItem[];
  resultWeight: number;
  resultTargetScore: number;
  resultAverageScore: number;
  resultAttainment: number;
  indirectWeight: number;
  indirectAverageScore: number;
  indirectAttainment: number;
  overallWeight: number;
  finalAttainment: number;
};

type ReportExportData = {
  targetSummaries: ReportTargetSummary[];
  courseFinalAttainment: number;
};

const TEMPLATE_TARGET_COUNT = 7;

function setColumns(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.columns = widths.map((width) => ({ width }));
}

function applyBorder(cell: ExcelJS.Cell, color = "FF000000") {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function applyInfoBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
    diagonal: { style: "thin", color: { argb: "FF000000" }, down: true, up: false },
  };
}

function setCellAlignment(
  cell: ExcelJS.Cell,
  horizontal: ExcelJS.Alignment["horizontal"] = "center",
  vertical: ExcelJS.Alignment["vertical"] = "middle",
  wrapText = false,
) {
  cell.alignment = { horizontal, vertical, wrapText };
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripCellType(attrs: string) {
  return attrs.replace(/\s+t="[^"]*"/g, "");
}

function setXmlCellValue(xml: string, cellRef: string, value: string | number | null) {
  const escapedRef = cellRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fullTagPattern = new RegExp(`<c([^>]*\\br="${escapedRef}"[^>]*)>([\\s\\S]*?)</c>`);
  const emptyTagPattern = new RegExp(`<c([^>]*\\br="${escapedRef}"[^>]*)\\s*/>`);

  const replacer = (_match: string, attrs: string) => {
    const safeAttrs = stripCellType(attrs);
    if (value === null || value === "") {
      return `<c${safeAttrs}/>`;
    }

    if (typeof value === "number") {
      return `<c${safeAttrs}><v>${value}</v></c>`;
    }

    return `<c${safeAttrs} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  };

  if (emptyTagPattern.test(xml)) {
    return xml.replace(emptyTagPattern, replacer);
  }

  if (fullTagPattern.test(xml)) {
    return xml.replace(fullTagPattern, replacer);
  }

  return xml;
}

function setXmlCells(xml: string, entries: Array<[string, string | number | null]>) {
  return entries.reduce((current, [cellRef, value]) => setXmlCellValue(current, cellRef, value), xml);
}

function setWorkbookVisibleSheetOnly(xml: string, visibleSheetName: string) {
  let nextXml = xml.replace(/<sheet\b([^>]*?)\bname="([^"]+)"([^>]*)\/>/g, (_match, before, name, after) => {
    const attrs = `${before}name="${name}"${after}`.replace(/\s+state="[^"]*"/g, "");
    const state = name === visibleSheetName ? "" : ' state="hidden"';
    return `<sheet${attrs}${state}/>`;
  });

  nextXml = nextXml.replace(
    /<workbookView\b([^>]*)\bfirstSheet="[^"]*"([^>]*)\bactiveTab="[^"]*"([^>]*)\/>/,
    '<workbookView$1firstSheet="3"$2activeTab="3"$3/>',
  );

  nextXml = nextXml.replace(
    /<calcPr\b([^>]*)\/>/,
    '<calcPr$1 calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>',
  );

  return nextXml;
}

function hideXmlRows(xml: string, rowNumbers: number[]) {
  return rowNumbers.reduce((currentXml, rowNumber) => {
    const rowPattern = new RegExp(`<row([^>]*\\br="${rowNumber}"[^>]*)>`);
    return currentXml.replace(rowPattern, (_match, attrs) => {
      const nextAttrs = attrs.replace(/\s+hidden="1"/g, "");
      return `<row${nextAttrs} hidden="1">`;
    });
  }, xml);
}

function isStudentFilled(student: CourseInput["students"][number]) {
  return Boolean(student.studentNo.trim() || student.studentName.trim());
}

function getMethodSets(course: CourseInput) {
  const processMethods = course.methods
    .map((method, index) => ({ ...method, index }))
    .filter((method) => method.enabled && method.category === "PROCESS") as ProcessMethod[];

  const resultMethod = course.methods
    .map((method, index) => ({ ...method, index }))
    .find((method) => method.enabled && method.category === "RESULT") as
    | ProcessMethod
    | undefined;

  return { processMethods, resultMethod };
}

function getConfig(input: CourseInput, targetIndex: number, methodIndex: number) {
  return (
    input.targetMethodConfigs.find(
      (item) => item.targetIndex === targetIndex && item.methodIndex === methodIndex,
    ) ?? { weight: 0, targetScore: 0 }
  );
}

function getAverageStudentScore(course: CourseInput, methodIndex: number, targetIndex: number) {
  const activeStudents = course.students.filter(isStudentFilled);
  if (activeStudents.length === 0) {
    return 0;
  }

  const values = activeStudents
    .map((student) => student.scores[String(methodIndex)]?.[String(targetIndex)])
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / activeStudents.length);
}

function calculateIndirectAttainment(course: CourseInput, targetIndex: number) {
  const row = course.indirectEvaluations.find((item) => item.targetIndex === targetIndex);
  if (!row) {
    return 0;
  }

  const total = row.countA + row.countB + row.countC + row.countD + row.countE;
  if (total === 0) {
    return 0;
  }

  const surveyScore =
    (row.countA * 1 +
      row.countB * 0.8 +
      row.countC * 0.6 +
      row.countD * 0.4 +
      row.countE * 0.2) /
    total;

  const target = course.targets[targetIndex];
  return round(
    surveyScore * (target?.surveyEvaluationRatio ?? 0) +
      0 * (target?.otherEvaluationRatio ?? 0),
  );
}

function buildReportExportData(course: CourseInput): ReportExportData {
  const { processMethods, resultMethod } = getMethodSets(course);

  const targetSummaries = course.targets.map((target, targetIndex) => {
    const processItems = Array.from({ length: 4 }, (_, slotIndex) => {
      const method = processMethods[slotIndex];
      if (!method) {
        return {
          name: slotIndex === 0 ? "0" : "",
          weight: 0,
          targetScore: 0,
          averageScore: 0,
          attainment: 0,
        };
      }

      const config = getConfig(course, targetIndex, method.index);
      const averageScore = getAverageStudentScore(course, method.index, targetIndex);
      const attainment = config.targetScore > 0 ? round(averageScore / config.targetScore) : 0;

      return {
        name: method.name,
        weight: config.weight,
        targetScore: config.targetScore,
        averageScore,
        attainment,
      };
    });

    const resultConfig =
      resultMethod ? getConfig(course, targetIndex, resultMethod.index) : { targetScore: 0 };
    const resultAverageScore =
      resultMethod ? getAverageStudentScore(course, resultMethod.index, targetIndex) : 0;
    const resultAttainment =
      resultConfig.targetScore > 0 ? round(resultAverageScore / resultConfig.targetScore) : 0;
    const indirectWeight = round(target.surveyEvaluationRatio + target.otherEvaluationRatio);
    const indirectAverageScore = calculateIndirectAttainment(course, targetIndex);

    const finalAttainment = round(
      processItems.reduce((sum, item) => sum + item.attainment * item.weight, 0) +
        resultAttainment * target.resultEvaluationRatio +
        indirectAverageScore * indirectWeight,
    );

    return {
      targetName: target.name,
      processItems,
      resultWeight: target.resultEvaluationRatio,
      resultTargetScore: resultConfig.targetScore,
      resultAverageScore,
      resultAttainment,
      indirectWeight,
      indirectAverageScore,
      indirectAttainment: indirectAverageScore,
      overallWeight: target.overallWeight,
      finalAttainment,
    };
  });

  const courseFinalAttainment = round(
    targetSummaries.reduce(
      (sum, summary) => sum + summary.finalAttainment * summary.overallWeight,
      0,
    ),
  );

  return { targetSummaries, courseFinalAttainment };
}

function buildStudentTargetAttainmentSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
) {
  const sheet = workbook.addWorksheet("4学生课程目标达成度");
  const { processMethods, resultMethod } = getMethodSets(course);
  const visibleMethods = resultMethod ? [...processMethods, resultMethod] : processMethods;
  const attainmentColumnIndex = 5 + visibleMethods.length;
  const totalColumnIndex = attainmentColumnIndex + 1;
  const columnCount = totalColumnIndex;

  setColumns(sheet, [8, 16, 14, 16, ...visibleMethods.map(() => 14), 16, 16]);

  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "基于直接评价的学生课程目标达成度";
  titleCell.font = { name: "黑体", size: 18, bold: true, color: { argb: "FF000000" } };
  setCellAlignment(titleCell, "center", "middle");
  sheet.getRow(1).height = 22.5;

  sheet.mergeCells(2, 1, 4, 3);
  const infoCell = sheet.getCell(2, 1);
  infoCell.value = "          \n          课程信息\n\n\n\n学生信息";
  infoCell.font = { name: "仿宋", size: 12, bold: true };
  setCellAlignment(infoCell, "left", "top", true);
  applyInfoBorder(infoCell);

  sheet.mergeCells(2, 4, 4, 4);
  const targetCell = sheet.getCell(2, 4);
  targetCell.value = "课程分目标";
  targetCell.font = { name: "仿宋", size: 12, bold: true };
  setCellAlignment(targetCell, "center", "middle", true);

  visibleMethods.forEach((method, index) => {
    const headerCell = sheet.getCell(2, 5 + index);
    headerCell.value = `评价方式${index + 1}`;
    headerCell.font = { name: "仿宋", size: 12, bold: true };
    setCellAlignment(headerCell, "center", "middle", true);

    const methodCell = sheet.getCell(3, 5 + index);
    methodCell.value = method.name;
    methodCell.font = { name: "仿宋", size: 12, bold: true };
    setCellAlignment(methodCell, "center", "middle", true);
  });

  sheet.mergeCells(2, attainmentColumnIndex, 4, attainmentColumnIndex);
  const attainmentCell = sheet.getCell(2, attainmentColumnIndex);
  attainmentCell.value = "分目标达成度";
  attainmentCell.font = { name: "宋体", size: 11, bold: true };
  setCellAlignment(attainmentCell, "center", "middle", true);

  sheet.mergeCells(2, totalColumnIndex, 4, totalColumnIndex);
  const totalCell = sheet.getCell(2, totalColumnIndex);
  totalCell.value = "总目标达成度";
  totalCell.font = { name: "宋体", size: 11, bold: true };
  setCellAlignment(totalCell, "center", "middle", true);

  sheet.getRow(2).height = 28.5;
  sheet.getRow(3).height = 28.5;
  sheet.getRow(4).height = 14.25;

  for (let rowIndex = 2; rowIndex <= 4; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      if (rowIndex === 2 && columnIndex === 1) {
        continue;
      }
      applyBorder(row.getCell(columnIndex));
    }
  }

  let rowIndex = 5;
  calc.studentDetails.forEach((student, studentIndex) => {
    const startRow = rowIndex;
    const endRow = startRow + Math.max(student.details.length - 1, 0);

    if (student.details.length > 1) {
      sheet.mergeCells(startRow, 1, endRow, 1);
      sheet.mergeCells(startRow, 2, endRow, 2);
      sheet.mergeCells(startRow, 3, endRow, 3);
      sheet.mergeCells(startRow, totalColumnIndex, endRow, totalColumnIndex);
    }

    student.details.forEach((detail, detailIndex) => {
      const row = sheet.getRow(rowIndex);
      row.height = 14.25;

      row.getCell(1).value = studentIndex + 1;
      row.getCell(2).value = student.studentNo;
      row.getCell(3).value = student.studentName;
      row.getCell(4).value = detail.targetName;

      visibleMethods.forEach((method, methodOffset) => {
        const methodScore = detail.methodScores.find((item) => item.methodName === method.name);
        row.getCell(5 + methodOffset).value = methodScore?.score ?? "";
        row.getCell(5 + methodOffset).numFmt = "0_ ";
      });

      row.getCell(attainmentColumnIndex).value = detail.attainment;
      row.getCell(attainmentColumnIndex).numFmt = "0.00_ ";

      if (detailIndex === 0) {
        row.getCell(totalColumnIndex).value = student.totalAttainment;
        row.getCell(totalColumnIndex).numFmt = "0.00_ ";
      }

      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        const cell = row.getCell(columnIndex);
        cell.font = { name: "宋体", size: 11 };
        setCellAlignment(cell, "center", "middle");
        applyBorder(cell);
      }

      rowIndex += 1;
    });
  });
}

async function loadStandaloneChartTemplate() {
  const desktopPath = path.join(process.env.USERPROFILE ?? "C:/Users/admin", "Desktop");
  const entries = await fs.promises.readdir(desktopPath, { withFileTypes: true });
  const candidateFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".xlsx") && !entry.name.startsWith("~$"))
    .map((entry) => path.join(desktopPath, entry.name));

  for (const filePath of candidateFiles) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet("5绘图数据");
      if (worksheet) {
        return worksheet;
      }
    } catch {
      continue;
    }
  }

  throw new Error("未找到包含“5绘图数据”工作表的 Excel 模板文件");
}

function cloneWorksheetStructure(source: ExcelJS.Worksheet, target: ExcelJS.Worksheet) {
  target.properties = { ...source.properties };
  target.pageSetup = { ...source.pageSetup };
  target.headerFooter = { ...source.headerFooter };
  target.views = source.views.map((view) => ({ ...view }));
  target.state = source.state;

  source.columns.forEach((column, index) => {
    const nextColumn = target.getColumn(index + 1);
    nextColumn.width = column.width;
    nextColumn.hidden = column.hidden ?? false;
    nextColumn.outlineLevel = column.outlineLevel ?? 0;
    nextColumn.style = JSON.parse(JSON.stringify(column.style ?? {}));
  });

  for (let rowIndex = 1; rowIndex <= source.rowCount; rowIndex += 1) {
    const sourceRow = source.getRow(rowIndex);
    const targetRow = target.getRow(rowIndex);
    targetRow.height = sourceRow.height;
    targetRow.hidden = sourceRow.hidden ?? false;
    targetRow.outlineLevel = sourceRow.outlineLevel ?? 0;

    for (let columnIndex = 1; columnIndex <= source.columnCount; columnIndex += 1) {
      const sourceCell = sourceRow.getCell(columnIndex);
      const targetCell = targetRow.getCell(columnIndex);
      targetCell.style = JSON.parse(JSON.stringify(sourceCell.style ?? {}));
      targetCell.numFmt = sourceCell.numFmt;
    }
  }

  const merges = (source as ExcelJS.Worksheet & { _merges?: Record<string, unknown> })._merges ?? {};
  for (const mergeKey of Object.keys(merges)) {
    target.mergeCells(mergeKey);
  }
}

function clearWorksheetValues(sheet: ExcelJS.Worksheet) {
  for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= sheet.columnCount; columnIndex += 1) {
      sheet.getRow(rowIndex).getCell(columnIndex).value = null;
    }
  }
}

function normalizeStandaloneChartHeader(sheet: ExcelJS.Worksheet) {
  try {
    sheet.unMergeCells("M1:T1");
  } catch {}
  try {
    sheet.unMergeCells("M2:T2");
  } catch {}
  sheet.mergeCells("M2:T2");
  sheet.getCell("M2").value = "平均达成度";
  sheet.getCell("M2").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getCell("C1").value = "   平均达\n     成度\n姓名";
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(4).height = 15;
}

function fillStandaloneChartSheet(
  sheet: ExcelJS.Worksheet,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
  report: ReportExportData,
) {
  const targetAverageCount = TEMPLATE_TARGET_COUNT;
  const averageValues = Array.from({ length: targetAverageCount }, (_, index) =>
    calc.averages.targetAverages[index] ?? 0,
  );

  sheet.getCell("A1").value = "序号";
  sheet.getCell("B1").value = "学号";
  sheet.getCell("C1").value = "   平均达\n     成度\n姓名";
  sheet.getCell("K1").value = "总目标";
  sheet.getCell("T1").value = "总目标";
  sheet.getCell("U1").value = "期望值";
  sheet.getCell("M2").value = "平均达成度";

  for (let index = 0; index < targetAverageCount; index += 1) {
    sheet.getCell(1, 4 + index).value = `目标${index + 1}`;
    sheet.getCell(1, 13 + index).value = `目标${index + 1}`;
    sheet.getCell(2, 4 + index).value = averageValues[index];
    sheet.getCell(2, 4 + index).numFmt = "0.00";
  }

  sheet.getCell("K2").value = calc.averages.totalAverage;
  sheet.getCell("K2").numFmt = "0.00";

  calc.chartRows.forEach((row, index) => {
    const rowIndex = 3 + index;
    sheet.getRow(rowIndex).height = 15;
    sheet.getCell(`A${rowIndex}`).value = index;
    sheet.getCell(`B${rowIndex}`).value = row.studentNo;
    sheet.getCell(`C${rowIndex}`).value = row.studentName;

    for (let targetIndex = 0; targetIndex < targetAverageCount; targetIndex += 1) {
      const targetValue = row.targetAttainments[targetIndex] ?? 0;
      sheet.getCell(rowIndex, 4 + targetIndex).value = targetValue;
      sheet.getCell(rowIndex, 4 + targetIndex).numFmt = "0.00";
      sheet.getCell(rowIndex, 13 + targetIndex).value = averageValues[targetIndex];
      sheet.getCell(rowIndex, 13 + targetIndex).numFmt = "0.00";
    }

    sheet.getCell(`K${rowIndex}`).value = row.totalAttainment;
    sheet.getCell(`K${rowIndex}`).numFmt = "0.00";
    sheet.getCell(`T${rowIndex}`).value = calc.averages.totalAverage;
    sheet.getCell(`T${rowIndex}`).numFmt = "0.00";
    sheet.getCell(`U${rowIndex}`).value = course.expectedValue;
    sheet.getCell(`U${rowIndex}`).numFmt = "0.00";
  });

  for (let rowIndex = 3 + calc.chartRows.length; rowIndex <= 180; rowIndex += 1) {
    sheet.getRow(rowIndex).height = 15;
    sheet.getCell(`A${rowIndex}`).value = rowIndex - 3;
    for (const column of ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "M", "N", "O", "P", "Q", "R", "S", "T", "U"]) {
      sheet.getCell(`${column}${rowIndex}`).value = null;
    }
  }

  const helperLabels = [
    ...Array.from(
      { length: 7 },
      (_, index) => course.targets[index]?.name ?? `课程目标${index + 1}`,
    ),
    "课程总目标",
  ];
  const helperValues = [
    ...Array.from(
      { length: 7 },
      (_, index) => report.targetSummaries[index]?.finalAttainment ?? 0,
    ),
    report.courseFinalAttainment,
  ];

  helperLabels.forEach((label, index) => {
    const rowIndex = 4 + index;
    sheet.getCell(`X${rowIndex}`).value = label;
    sheet.getCell(`Y${rowIndex}`).value = helperValues[index];
    sheet.getCell(`Y${rowIndex}`).numFmt = "0.00";
    sheet.getCell(`Z${rowIndex}`).value = course.expectedValue;
    sheet.getCell(`Z${rowIndex}`).numFmt = "0.00";
  });

  normalizeStandaloneChartHeader(sheet);
}

async function buildStandaloneChartSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
  report: ReportExportData,
) {
  const templateSheet = await loadStandaloneChartTemplate();
  const sheet = workbook.addWorksheet("5绘图数据");
  cloneWorksheetStructure(templateSheet, sheet);
  clearWorksheetValues(sheet);
  fillStandaloneChartSheet(sheet, course, calc, report);
}

function applyDefaultSheetStyling(workbook: ExcelJS.Workbook) {
  workbook.worksheets.forEach((sheet) => {
    if (sheet.name === "4学生课程目标达成度" || sheet.name === "5绘图数据") {
      return;
    }

    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D7DE" } },
          left: { style: "thin", color: { argb: "FFD3D7DE" } },
          bottom: { style: "thin", color: { argb: "FFD3D7DE" } },
          right: { style: "thin", color: { argb: "FFD3D7DE" } },
        };
        cell.alignment =
          rowNumber <= 4
            ? { vertical: "middle", horizontal: "left" }
            : { vertical: "middle", horizontal: "center" };
      });
    });
  });
}

async function loadReportTemplateZip() {
  const templatePath = path.join(process.cwd(), "3课程达成度分析报告模板.xlsx");
  const buffer = await fs.promises.readFile(templatePath);
  return JSZip.loadAsync(buffer);
}

function buildTemplateChartSheetXml(
  sheetXml: string,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
  report: ReportExportData,
) {
  const entries: Array<[string, string | number | null]> = [];
  const averageValues = Array.from({ length: 7 }, (_, index) => calc.averages.targetAverages[index] ?? 0);

  for (let index = 0; index < 7; index += 1) {
    entries.push([`${String.fromCharCode(68 + index)}1`, `目标${index + 1}`]);
    entries.push([`${String.fromCharCode(77 + index)}1`, `目标${index + 1}`]);
    entries.push([`${String.fromCharCode(68 + index)}2`, averageValues[index]]);
  }
  entries.push(["K1", "总目标"], ["T1", "总目标"], ["M2", "平均达成度"], ["U1", "期望值"], ["K2", calc.averages.totalAverage]);

  calc.chartRows.forEach((row, index) => {
    const rowIndex = 3 + index;
    entries.push([`A${rowIndex}`, index], [`B${rowIndex}`, row.studentNo], [`C${rowIndex}`, row.studentName]);
    for (let targetIndex = 0; targetIndex < 7; targetIndex += 1) {
      entries.push([`${String.fromCharCode(68 + targetIndex)}${rowIndex}`, row.targetAttainments[targetIndex] ?? 0]);
      entries.push([`${String.fromCharCode(77 + targetIndex)}${rowIndex}`, averageValues[targetIndex]]);
    }
    entries.push([`K${rowIndex}`, row.totalAttainment], [`T${rowIndex}`, calc.averages.totalAverage], [`U${rowIndex}`, course.expectedValue]);
  });

  for (let rowIndex = 3 + calc.chartRows.length; rowIndex <= 180; rowIndex += 1) {
    entries.push([`A${rowIndex}`, rowIndex - 3], [`B${rowIndex}`, null], [`C${rowIndex}`, null]);
    for (const column of ["D", "E", "F", "G", "H", "I", "J", "K", "M", "N", "O", "P", "Q", "R", "S", "T", "U"]) {
      entries.push([`${column}${rowIndex}`, null]);
    }
  }

  const helperLabels = [
    ...Array.from(
      { length: 7 },
      (_, index) => course.targets[index]?.name ?? `课程目标${index + 1}`,
    ),
    "课程总目标",
  ];
  const helperValues = [
    ...Array.from(
      { length: 7 },
      (_, index) => report.targetSummaries[index]?.finalAttainment ?? 0,
    ),
    report.courseFinalAttainment,
  ];

  helperLabels.forEach((label, index) => {
    const rowIndex = 4 + index;
    entries.push([`X${rowIndex}`, label], [`Y${rowIndex}`, helperValues[index]], [`Z${rowIndex}`, course.expectedValue]);
  });

  return setXmlCells(sheetXml, entries);
}

function buildTemplateReportSheetXml(
  sheetXml: string,
  course: CourseInput,
  report: ReportExportData,
) {
  const { processMethods } = getMethodSets(course);
  const entries: Array<[string, string | number | null]> = [];

  const audience = [course.department, course.major, course.className].filter(Boolean).join("");
  const hoursCredit = [course.hours, course.credit].filter(Boolean).join("/");

  entries.push(
    ["A1", `《${course.courseName}》`],
    ["D4", course.courseName],
    ["P4", course.courseCode],
    ["D5", course.courseType],
    ["P5", hoursCredit],
    ["D6", course.semester],
    ["P6", audience || course.className],
    ["D7", course.selectedCount],
    ["P7", course.evaluatedCount],
    ["D8", course.teacherNames],
    ["P8", course.ownerTeacher],
    ["D23", processMethods[0]?.name ?? null],
    ["G23", processMethods[1]?.name ?? null],
    ["J23", processMethods[2]?.name ?? null],
    ["M23", processMethods[3]?.name ?? null],
    ["O22", "结果性评价"],
    ["R22", "学生调查问卷"],
    ["T22", "其它"],
    ["B47", round(course.examQuestions.reduce((sum, question) => sum + (question.score ?? 0), 0))],
    ["B93", report.courseFinalAttainment],
  );

  Array.from({ length: 7 }, (_, targetIndex) => {
    const target = course.targets[targetIndex];
    const rowIndex = 12 + targetIndex;
    entries.push([`A${rowIndex}`, target ? "课程总目标" : null]);
    entries.push([`B${rowIndex}`, target?.name ?? null]);
    entries.push([
      `F${rowIndex}`,
      target
        ? [target.summary, target.graduationRequirement && `支撑指标点：${target.graduationRequirement}`]
            .filter(Boolean)
            .join("\n")
        : null,
    ]);
    entries.push([`T${rowIndex}`, target?.supportStrength ?? null]);
  });

  Array.from({ length: 7 }, (_, targetIndex) => {
    const target = course.targets[targetIndex];
    const targetSummary = report.targetSummaries[targetIndex];
    const rowIndex = 24 + targetIndex;
    entries.push([`A${rowIndex}`, target?.name ?? null]);
    entries.push([`C${rowIndex}`, targetSummary?.processItems[0]?.weight ?? 0]);
    entries.push([`F${rowIndex}`, targetSummary?.processItems[1]?.weight ?? 0]);
    entries.push([`I${rowIndex}`, targetSummary?.processItems[2]?.weight ?? 0]);
    entries.push([`L${rowIndex}`, targetSummary?.processItems[3]?.weight ?? 0]);
    entries.push([`O${rowIndex}`, target?.resultEvaluationRatio ?? 0]);
    entries.push([`R${rowIndex}`, target?.surveyEvaluationRatio ?? 0]);
    entries.push([`T${rowIndex}`, target?.otherEvaluationRatio ?? 0]);
  });

  Array.from({ length: 7 }, (_, targetIndex) => {
    const target = course.targets[targetIndex];
    const oddRow = 33 + targetIndex * 2;
    const evenRow = oddRow + 1;
    const labels = course.examQuestions.map((question) => question.targetLabels[targetIndex] ?? "").slice(0, 15);
    const scores = course.examQuestions.map((question) => question.targetScores[targetIndex] ?? 0).slice(0, 15);

    entries.push([`A${oddRow}`, target?.name ?? null], [`B${oddRow}`, target?.name ?? null], [`C${oddRow}`, target ? "小题号" : null]);
    entries.push([`A${evenRow}`, target?.name ?? null], [`B${evenRow}`, target?.name ?? null], [`C${evenRow}`, target ? "分值" : null]);

    for (let index = 0; index < 15; index += 1) {
      const column = String.fromCharCode(68 + index);
      entries.push([`${column}${oddRow}`, labels[index] || null]);
      entries.push([`${column}${evenRow}`, scores[index] ?? 0]);
    }
    entries.push([`S${oddRow}`, "合计"], [`S${evenRow}`, round(scores.reduce((sum, value) => sum + (value ?? 0), 0))]);
  });

  const hiddenRows: number[] = [];

  Array.from({ length: 7 }, (_, targetIndex) => {
    const target = course.targets[targetIndex];
    const summary = report.targetSummaries[targetIndex];
    const baseRow = 51 + targetIndex * 6;

    if (!target || !summary) {
      hiddenRows.push(baseRow, baseRow + 1, baseRow + 2, baseRow + 3, baseRow + 4, baseRow + 5);
      return;
    }
    entries.push([`A${baseRow}`, target?.name ?? null], [`B${baseRow}`, "直接评价"], [`C${baseRow}`, "过程性评价"], [`R${baseRow}`, summary?.overallWeight ?? 0], [`T${baseRow}`, summary?.finalAttainment ?? 0]);

    (summary?.processItems ?? []).forEach((item, processIndex) => {
      const rowIndex = baseRow + processIndex;
      entries.push([`A${rowIndex}`, target?.name ?? null]);
      entries.push([`D${rowIndex}`, item.name || "0"]);
      entries.push([`I${rowIndex}`, item.weight]);
      entries.push([`K${rowIndex}`, item.targetScore]);
      entries.push([`N${rowIndex}`, item.averageScore]);
      entries.push([`P${rowIndex}`, item.attainment]);
    });

    const resultRow = baseRow + 4;
    entries.push([`A${resultRow}`, target?.name ?? null], [`C${resultRow}`, "结果性评价"], [`I${resultRow}`, summary?.resultWeight ?? 0], [`K${resultRow}`, summary?.resultTargetScore ?? 0], [`N${resultRow}`, summary?.resultAverageScore ?? 0], [`P${resultRow}`, summary?.resultAttainment ?? 0]);

    const indirectRow = baseRow + 5;
    entries.push([`A${indirectRow}`, target?.name ?? null], [`B${indirectRow}`, "间接评价"], [`I${indirectRow}`, summary?.indirectWeight ?? 0], [`K${indirectRow}`, 1], [`N${indirectRow}`, summary?.indirectAverageScore ?? 0], [`P${indirectRow}`, summary?.indirectAttainment ?? 0]);
  });

  const textBlock = [
    "（一）课程分析",
    course.reportTexts.analysisText || "",
    "",
    "（二）存在问题",
    course.reportTexts.problemText || "",
    "",
    "（三）改进措施",
    course.reportTexts.improvementText || "",
    "",
    "（四）教师评价",
    course.reportTexts.teacherComment || "",
  ].join("\n");
  entries.push(["A96", textBlock]);

  return hideXmlRows(setXmlCells(sheetXml, entries), hiddenRows);
}

function buildTemplateInfoSheetXml(sheetXml: string, course: CourseInput) {
  const { processMethods } = getMethodSets(course);
  const audience = [course.department, course.major, course.className].filter(Boolean).join("");
  const hoursCredit = [course.hours, course.credit].filter(Boolean).join("/");
  const entries: Array<[string, string | number | null]> = [
    ["D3", course.courseName],
    ["M3", course.courseCode],
    ["D4", course.courseType],
    ["M4", hoursCredit],
    ["D5", course.semester],
    ["M5", audience || course.className],
    ["D6", course.selectedCount],
    ["M6", course.evaluatedCount],
    ["D7", course.teacherNames],
    ["M7", course.ownerTeacher],
    ["E24", processMethods[0]?.name ?? null],
    ["I24", processMethods[1]?.name ?? null],
    ["L24", processMethods[2]?.name ?? null],
    ["O24", processMethods[3]?.name ?? null],
  ];

  Array.from({ length: 7 }, (_, targetIndex) => {
    const target = course.targets[targetIndex];
    const rowIndex = 12 + targetIndex;
    entries.push([`A${rowIndex}`, target ? "课程总目标" : null]);
    entries.push([`B${rowIndex}`, target?.name ?? null]);
    entries.push([
      `E${rowIndex}`,
      target
        ? [target.summary, target.graduationRequirement && `支撑指标点：${target.graduationRequirement}`]
            .filter(Boolean)
            .join("\n")
        : null,
    ]);
    entries.push([`P${rowIndex}`, target?.supportStrength ?? null]);
  });

  return setXmlCells(sheetXml, entries);
}

async function exportCourseAnalysisTemplate(course: CourseInput) {
  const zip = await loadReportTemplateZip();
  const calc = calculateCourse(course);
  const report = buildReportExportData(course);

  const workbookPath = "xl\\workbook.xml";
  const sheet1Path = "xl\\worksheets\\sheet1.xml";
  const sheet4Path = "xl\\worksheets\\sheet4.xml";
  const sheet6Path = "xl\\worksheets\\sheet6.xml";
  const workbookFile = zip.file(workbookPath);
  const sheet1File = zip.file(sheet1Path);
  const sheet4File = zip.file(sheet4Path);
  const sheet6File = zip.file(sheet6Path);
  if (!workbookFile || !sheet1File) {
    throw new Error("模板文件缺少必要的工作表");
  }
  if (!sheet4File || !sheet6File) {
    throw new Error("模板文件缺少表3或表5工作表");
  }

  const updatedWorkbook = setWorkbookVisibleSheetOnly(
    await workbookFile.async("string"),
    "3课程达成度分析报告",
  );
  const updatedSheet1 = buildTemplateInfoSheetXml(await sheet1File.async("string"), course);
  const updatedSheet6 = buildTemplateChartSheetXml(await sheet6File.async("string"), course, calc, report);
  const updatedSheet4 = buildTemplateReportSheetXml(await sheet4File.async("string"), course, report);

  zip.file(workbookPath, updatedWorkbook);
  zip.file(sheet1Path, updatedSheet1);
  zip.file(sheet6Path, updatedSheet6);
  zip.file(sheet4Path, updatedSheet4);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(buffer);
}

export async function exportWorkbook(
  course: CourseInput,
  kind: "3" | "4" | "5",
): Promise<Buffer> {
  if (kind === "3") {
    return exportCourseAnalysisTemplate(course);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();
  workbook.modified = new Date();

  const calc = calculateCourse(course);
  const report = buildReportExportData(course);

  if (kind === "4") {
    buildStudentTargetAttainmentSheet(workbook, course, calc);
  }

  if (kind === "5") {
    await buildStandaloneChartSheet(workbook, course, calc, report);
  }

  applyDefaultSheetStyling(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
