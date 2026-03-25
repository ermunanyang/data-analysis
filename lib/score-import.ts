import { Buffer } from "node:buffer";

import JSZip from "../node_modules/.pnpm/exceljs@4.4.0/node_modules/jszip/lib/index.js";

import { createEmptyStudent } from "@/lib/course-defaults";
import type { CourseInput } from "@/lib/course-schema";

type WorkbookScoreBlock = {
  startColumnIndex: number;
  targetColumnCount: number;
  title: string;
};

type SheetCellValue = number | string | null;

type ParsedWorksheet = {
  rowCount: number;
  columnCount: number;
  getCell: (rowIndex: number, columnIndex: number) => SheetCellValue;
};

const RESULT_METHOD_NAME = "结果性评价";

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function getColumnIndexFromReference(reference: string): number {
  const match = reference.match(/[A-Z]+/i);
  if (!match) return 0;

  return match[0]
    .toUpperCase()
    .split("")
    .reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 64), 0);
}

function getRowIndexFromReference(reference: string): number {
  const match = reference.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, "").replace(/[：:]/g, "").trim();
}

function normalizeComparable(text: string): string {
  return text.replace(/\s+/g, "").trim();
}

function toText(value: SheetCellValue): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
}

function toNumber(value: SheetCellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

async function getRequiredZipText(zip: JSZip, filePath: string): Promise<string> {
  const file = zip.file(filePath);
  if (!file) {
    throw new Error(`导入文件缺少 ${filePath}`);
  }

  return file.async("string");
}

function parseSharedStrings(xml: string): string[] {
  const matches = xml.match(/<(?:[\w-]+:)?si\b[\s\S]*?<\/(?:[\w-]+:)?si>/g) ?? [];

  return matches.map((item) => {
    const textMatches = [
      ...item.matchAll(/<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>/g),
    ];
    return decodeXml(textMatches.map((match) => match[1] ?? "").join(""));
  });
}

function parseWorkbookSheets(xml: string): Array<{ name: string; relationId: string }> {
  return [
    ...xml.matchAll(
      /<(?:[\w-]+:)?sheet\b[^>]*name="([^"]+)"[^>]*(?:r:id|[\w-]+:id)="([^"]+)"/g,
    ),
  ].map((match) => ({
    name: decodeXml(match[1] ?? ""),
    relationId: match[2] ?? "",
  }));
}

function parseWorkbookRelations(xml: string): Map<string, string> {
  return new Map(
    [...xml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [
      match[1] ?? "",
      match[2] ?? "",
    ]),
  );
}

function parseCellValue(cellXml: string, sharedStrings: string[]): SheetCellValue {
  const typeMatch = cellXml.match(/\bt="([^"]+)"/);
  const type = typeMatch?.[1] ?? "";

  if (type === "inlineStr") {
    const textMatches = [
      ...cellXml.matchAll(/<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>/g),
    ];
    return decodeXml(textMatches.map((match) => match[1] ?? "").join(""));
  }

  const valueMatch = cellXml.match(/<(?:[\w-]+:)?v>([\s\S]*?)<\/(?:[\w-]+:)?v>/);
  if (!valueMatch) {
    return null;
  }

  const rawValue = decodeXml(valueMatch[1] ?? "");

  if (type === "s") {
    const sharedIndex = Number(rawValue);
    return sharedStrings[sharedIndex] ?? "";
  }

  if (type === "str") {
    return rawValue;
  }

  if (type === "b") {
    return rawValue === "1" ? 1 : 0;
  }

  const numeric = Number(rawValue);
  return Number.isNaN(numeric) ? rawValue : numeric;
}

function parseWorksheet(xml: string, sharedStrings: string[]): ParsedWorksheet {
  const cellMap = new Map<string, SheetCellValue>();
  let rowCount = 0;
  let columnCount = 0;

  const cellPattern = new RegExp(
    '<(?:[\\w-]+:)?c\\b[^>]*r="([A-Z]+\\d+)"[^>]*/>|<(?:[\\w-]+:)?c\\b[^>]*r="([A-Z]+\\d+)"[^>]*>[\\s\\S]*?<\\/(?:[\\w-]+:)?c>',
    "g",
  );

  for (const match of xml.matchAll(cellPattern)) {
    const reference = match[1] ?? match[2] ?? "";
    const cellXml = match[0] ?? "";
    const rowIndex = getRowIndexFromReference(reference);
    const columnIndex = getColumnIndexFromReference(reference);

    rowCount = Math.max(rowCount, rowIndex);
    columnCount = Math.max(columnCount, columnIndex);
    cellMap.set(`${rowIndex}:${columnIndex}`, parseCellValue(cellXml, sharedStrings));
  }

  return {
    rowCount,
    columnCount,
    getCell(rowIndex: number, columnIndex: number) {
      return cellMap.get(`${rowIndex}:${columnIndex}`) ?? null;
    },
  };
}

async function loadWorksheetFromWorkbook(
  fileBuffer: Buffer,
): Promise<ParsedWorksheet> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const workbookXml = await getRequiredZipText(zip, "xl/workbook.xml");
  const workbookRelsXml = await getRequiredZipText(zip, "xl/_rels/workbook.xml.rels");
  const sharedStringsXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const sheets = parseWorkbookSheets(workbookXml);
  const relations = parseWorkbookRelations(workbookRelsXml);

  const sheet = sheets[0];
  if (!sheet) {
    throw new Error("未找到“1课程考核方式及成绩组成”工作表");
  }

  const target = relations.get(sheet.relationId);
  if (!target) {
    throw new Error("导入文件缺少工作表关系定义");
  }

  const normalizedPath = target.startsWith("/xl/")
    ? target.slice(1)
    : target.startsWith("worksheets/")
      ? `xl/${target}`
      : `xl/${target.replace(/^\.\//, "")}`;
  const worksheetXml = await getRequiredZipText(zip, normalizedPath);
  return parseWorksheet(worksheetXml, sharedStrings);
}

function findLabelValue(
  worksheet: ParsedWorksheet,
  label: string,
  maxRows = 6,
  maxColumns = 40,
): string {
  const expected = normalizeLabel(label);

  for (let rowIndex = 1; rowIndex <= Math.min(maxRows, worksheet.rowCount); rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= maxColumns; columnIndex += 1) {
      if (normalizeLabel(toText(worksheet.getCell(rowIndex, columnIndex))) !== expected) {
        continue;
      }

      for (
        let valueColumnIndex = columnIndex + 1;
        valueColumnIndex <= maxColumns;
        valueColumnIndex += 1
      ) {
        const valueText = toText(worksheet.getCell(rowIndex, valueColumnIndex));
        if (valueText) {
          return valueText;
        }
      }
    }
  }

  return "";
}

function getTemplateCourseName(worksheet: ParsedWorksheet): string {
  return toText(worksheet.getCell(2, 3)) || findLabelValue(worksheet, "课程");
}

function getTemplateClassName(worksheet: ParsedWorksheet): string {
  return toText(worksheet.getCell(3, 3)) || findLabelValue(worksheet, "班级");
}

function findHeaderRow(worksheet: ParsedWorksheet): number {
  for (let rowIndex = 1; rowIndex <= Math.min(20, worksheet.rowCount); rowIndex += 1) {
    const rowValues = Array.from({ length: 40 }, (_, index) =>
      normalizeLabel(toText(worksheet.getCell(rowIndex, index + 1))),
    );

    if (rowValues.includes("学号") && rowValues.includes("姓名") && rowValues.includes("班级")) {
      return rowIndex;
    }
  }

  throw new Error("未找到成绩表头，请确认导入的是“1课程考核方式及成绩组成”模板");
}

function findColumnIndex(worksheet: ParsedWorksheet, rowIndex: number, label: string): number {
  const expected = normalizeLabel(label);

  for (let columnIndex = 1; columnIndex <= Math.max(worksheet.columnCount, 40); columnIndex += 1) {
    if (normalizeLabel(toText(worksheet.getCell(rowIndex, columnIndex))) === expected) {
      return columnIndex;
    }
  }

  throw new Error(`未找到“${label}”列，请确认导入模板结构正确`);
}

function getStudentStartRow(worksheet: ParsedWorksheet, headerRowIndex: number): number {
  const hasTargetScoreRow = Array.from({ length: 20 }, (_, index) =>
    normalizeLabel(toText(worksheet.getCell(headerRowIndex + 1, index + 1))),
  ).includes("目标分值");

  return hasTargetScoreRow ? headerRowIndex + 2 : headerRowIndex + 1;
}

function isSameCourseField(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeComparable(expected);
  const normalizedActual = normalizeComparable(actual);

  if (!normalizedExpected || !normalizedActual) {
    return false;
  }

  return (
    normalizedExpected === normalizedActual ||
    normalizedExpected.includes(normalizedActual) ||
    normalizedActual.includes(normalizedExpected)
  );
}

function hasBlockStudentScores(
  worksheet: ParsedWorksheet,
  startColumnIndex: number,
  targetCount: number,
  studentStartRowIndex: number,
): boolean {
  for (let rowIndex = studentStartRowIndex; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    for (let offset = 0; offset < targetCount; offset += 1) {
      const value = toNumber(worksheet.getCell(rowIndex, startColumnIndex + offset));
      if (value !== null) {
        return true;
      }
    }
  }

  return false;
}

function hasBlockTargetScores(
  worksheet: ParsedWorksheet,
  startColumnIndex: number,
  targetCount: number,
  targetScoreRowIndex: number,
): boolean {
  for (let offset = 0; offset < targetCount; offset += 1) {
    const value = toNumber(worksheet.getCell(targetScoreRowIndex, startColumnIndex + offset));
    if (value !== null && value !== 0) {
      return true;
    }
  }

  return false;
}

function findWorkbookScoreBlocks(
  worksheet: ParsedWorksheet,
  methodNameRowIndex: number,
  headerRowIndex: number,
  targetScoreRowIndex: number,
  scoreStartColumnIndex: number,
): WorkbookScoreBlock[] {
  const blocks: WorkbookScoreBlock[] = [];
  let startColumnIndex = scoreStartColumnIndex;

  while (startColumnIndex <= worksheet.columnCount) {
    let totalColumnIndex = startColumnIndex;

    while (
      totalColumnIndex <= worksheet.columnCount &&
      normalizeLabel(toText(worksheet.getCell(headerRowIndex, totalColumnIndex))) !== "总分"
    ) {
      totalColumnIndex += 1;
    }

    if (totalColumnIndex > worksheet.columnCount) {
      break;
    }

    const targetColumnCount = totalColumnIndex - startColumnIndex;
    const title = toText(worksheet.getCell(methodNameRowIndex, startColumnIndex));
    const normalizedTitle = normalizeComparable(title);
    const isResultBlock = normalizedTitle === normalizeComparable(RESULT_METHOD_NAME);
    const hasStudentScores = hasBlockStudentScores(
      worksheet,
      startColumnIndex,
      targetColumnCount,
      targetScoreRowIndex + 1,
    );
    const hasTargetScores = hasBlockTargetScores(
      worksheet,
      startColumnIndex,
      targetColumnCount,
      targetScoreRowIndex,
    );

    const isIgnorablePlaceholder =
      !isResultBlock &&
      (normalizedTitle === "" || normalizedTitle === "0") &&
      !hasStudentScores &&
      !hasTargetScores;

    if (isIgnorablePlaceholder) {
      startColumnIndex = totalColumnIndex + 1;
      continue;
    }

    const hasAnyVisibleContent = normalizedTitle !== "" || hasStudentScores || hasTargetScores;
    if (!hasAnyVisibleContent) {
      startColumnIndex = totalColumnIndex + 1;
      continue;
    }

    blocks.push({ startColumnIndex, targetColumnCount, title });
    startColumnIndex = totalColumnIndex + 1;
  }

  return blocks;
}

function getEnabledProcessMethods(course: CourseInput) {
  return course.methods
    .map((method, index) => ({ method, index }))
    .filter(({ method }) => method.enabled && method.category === "PROCESS");
}

function getEnabledResultMethodIndex(course: CourseInput) {
  return course.methods.findIndex((method) => method.enabled && method.category === "RESULT");
}

function isSameMethodName(expected: string, actual: string): boolean {
  return normalizeComparable(expected) === normalizeComparable(actual);
}

export async function importScoresFromWorkbook(
  fileBuffer: Buffer,
  course: CourseInput,
): Promise<CourseInput["students"]> {
  const worksheet = await loadWorksheetFromWorkbook(fileBuffer);
  const workbookCourseName = getTemplateCourseName(worksheet);
  const workbookClassName = getTemplateClassName(worksheet);

  if (!isSameCourseField(course.courseName, workbookCourseName)) {
    throw new Error(
      `导入文件课程名称为“${workbookCourseName || "未填写"}”，与当前课程“${course.courseName}”不匹配`,
    );
  }

  if (!isSameCourseField(course.className, workbookClassName)) {
    throw new Error(
      `导入文件班级为“${workbookClassName || "未填写"}”，与当前课程班级“${course.className}”不匹配`,
    );
  }

  const headerRowIndex = findHeaderRow(worksheet);
  const methodNameRowIndex = Math.max(1, headerRowIndex - 2);
  const studentStartRowIndex = getStudentStartRow(worksheet, headerRowIndex);
  const targetScoreRowIndex = studentStartRowIndex - 1;
  const majorColumnIndex = findColumnIndex(worksheet, headerRowIndex, "专业名");
  const classColumnIndex = findColumnIndex(worksheet, headerRowIndex, "班级");
  const studentNoColumnIndex = findColumnIndex(worksheet, headerRowIndex, "学号");
  const studentNameColumnIndex = findColumnIndex(worksheet, headerRowIndex, "姓名");

  const targetCount = course.targets.length;
  const scoreStartColumnIndex = studentNameColumnIndex + 1;
  const workbookBlocks = findWorkbookScoreBlocks(
    worksheet,
    methodNameRowIndex,
    headerRowIndex,
    targetScoreRowIndex,
    scoreStartColumnIndex,
  );
  const workbookProcessBlocks = workbookBlocks.filter(
    (block) => !isSameMethodName(block.title, RESULT_METHOD_NAME),
  );
  const workbookResultBlock = workbookBlocks.find((block) =>
    isSameMethodName(block.title, RESULT_METHOD_NAME),
  );
  const processMethods = getEnabledProcessMethods(course);
  const resultMethodIndex = getEnabledResultMethodIndex(course);

  if (workbookProcessBlocks.length !== processMethods.length) {
    throw new Error(
      `导入文件中的过程性评价为“${workbookProcessBlocks.map((block) => block.title || "未命名").join("、") || "无"}”，与当前页面配置不一致`,
    );
  }

  workbookProcessBlocks.forEach((block, visibleMethodIndex) => {
    const method = processMethods[visibleMethodIndex]?.method;
    if (!method || !isSameMethodName(method.name, block.title)) {
      throw new Error(
        `导入文件中的第 ${visibleMethodIndex + 1} 个过程性评价为“${block.title || "未命名"}”，与当前页面配置不一致`,
      );
    }
  });

  const students: CourseInput["students"] = [];

  for (let rowIndex = studentStartRowIndex; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const studentNo = toText(worksheet.getCell(rowIndex, studentNoColumnIndex));
    const studentName = toText(worksheet.getCell(rowIndex, studentNameColumnIndex));
    const majorName = toText(worksheet.getCell(rowIndex, majorColumnIndex));
    const className = toText(worksheet.getCell(rowIndex, classColumnIndex));

    if (!studentNo && !studentName && !majorName && !className) {
      continue;
    }

    const student = createEmptyStudent(course.methods.length, targetCount);
    student.studentNo = studentNo;
    student.studentName = studentName;
    student.majorName = majorName;
    student.className = className;

    workbookProcessBlocks.forEach((block, visibleMethodIndex) => {
      const methodIndex = processMethods[visibleMethodIndex]?.index;
      if (methodIndex === undefined) return;

      for (
        let targetIndex = 0;
        targetIndex < Math.min(targetCount, block.targetColumnCount);
        targetIndex += 1
      ) {
        const score = toNumber(worksheet.getCell(rowIndex, block.startColumnIndex + targetIndex));
        student.scores[String(methodIndex)][String(targetIndex)] = score;
      }
    });

    if (workbookResultBlock && resultMethodIndex >= 0) {
      for (
        let targetIndex = 0;
        targetIndex < Math.min(targetCount, workbookResultBlock.targetColumnCount);
        targetIndex += 1
      ) {
        const score = toNumber(
          worksheet.getCell(rowIndex, workbookResultBlock.startColumnIndex + targetIndex),
        );
        student.scores[String(resultMethodIndex)][String(targetIndex)] = score;
      }
    }

    students.push(student);
  }

  return students;
}
