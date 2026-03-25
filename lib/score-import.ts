import { Buffer } from "node:buffer";

import ExcelJS from "exceljs";

import { createEmptyStudent } from "@/lib/course-defaults";
import type { CourseInput } from "@/lib/course-schema";
import { getScoreSheetMethodIndexes, SCORE_SHEET_STUDENT_START_ROW } from "@/lib/score-sheet";

function toNumber(value: ExcelJS.CellValue | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "object" && "result" in value && typeof value.result === "number") {
    return value.result;
  }

  return null;
}

function toText(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }

  if (
    typeof value === "object" &&
    "result" in value &&
    value.result !== null &&
    value.result !== undefined
  ) {
    return String(value.result).trim();
  }

  return "";
}

export async function importScoresFromWorkbook(
  fileBuffer: Buffer,
  course: CourseInput,
): Promise<CourseInput["students"]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(fileBuffer) as never);

  const worksheet =
    workbook.getWorksheet("1课程考核方式及成绩组成") ??
    workbook.worksheets.find((sheet) => sheet.name.includes("课程考核方式及成绩组成"));

  if (!worksheet) {
    throw new Error("未找到“1课程考核方式及成绩组成”工作表");
  }

  const targetCount = course.targets.length;
  const methodBlockWidth = targetCount + 1;
  const students: CourseInput["students"] = [];
  const methodIndexes = getScoreSheetMethodIndexes(course);

  methodIndexes.forEach((methodIndex, visibleMethodIndex) => {
    const method = course.methods[methodIndex];
    const columnIndex = 6 + visibleMethodIndex * methodBlockWidth;
    const workbookMethodName = toText(worksheet.getRow(6).getCell(columnIndex).value);

    if (workbookMethodName && workbookMethodName !== method.name.trim()) {
      throw new Error(
        `导入模板中的第 ${visibleMethodIndex + 1} 个评价方式为“${workbookMethodName}”，与当前课程配置“${method.name}”不一致`,
      );
    }
  });

  for (
    let rowIndex = SCORE_SHEET_STUDENT_START_ROW;
    rowIndex <= worksheet.rowCount;
    rowIndex += 1
  ) {
    const row = worksheet.getRow(rowIndex);
    const studentNo = toText(row.getCell(4).value);
    const studentName = toText(row.getCell(5).value);
    const majorName = toText(row.getCell(2).value);
    const className = toText(row.getCell(3).value);

    if (!studentNo && !studentName && !majorName && !className) {
      continue;
    }

    const student = createEmptyStudent(course.methods.length, targetCount);
    student.studentNo = studentNo;
    student.studentName = studentName;
    student.majorName = majorName;
    student.className = className;

    methodIndexes.forEach((methodIndex, visibleMethodIndex) => {
      course.targets.forEach((_, targetIndex) => {
        const columnIndex = 6 + visibleMethodIndex * methodBlockWidth + targetIndex;
        const score = toNumber(row.getCell(columnIndex).value);
        student.scores[String(methodIndex)][String(targetIndex)] = score;
      });
    });

    students.push(student);
  }

  return students;
}
