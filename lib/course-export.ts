import fs from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";

import { calculateCourse } from "@/lib/course-calculator";
import type { CourseInput } from "@/lib/course-schema";

function addHeader(sheet: ExcelJS.Worksheet, title: string, subtitle?: string) {
  sheet.addRow([title]);
  sheet.getRow(sheet.rowCount).font = { size: 16, bold: true };
  if (subtitle) {
    sheet.addRow([subtitle]);
    sheet.getRow(sheet.rowCount).font = { color: { argb: "FF5F6B7A" } };
  }
  sheet.addRow([]);
}

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

function getVisibleMethods(course: CourseInput) {
  const processMethods = course.methods.filter(
    (method) => method.enabled && method.category === "PROCESS",
  );
  const resultMethod = course.methods.find(
    (method) => method.enabled && method.category === "RESULT",
  );
  return resultMethod ? [...processMethods, resultMethod] : processMethods;
}

function buildCourseAnalysisSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
) {
  const sheet = workbook.addWorksheet("3课程达成度分析报告");
  setColumns(sheet, [18, 18, 18, 18, 18, 18]);
  addHeader(
    sheet,
    `${course.courseName || "未命名课程"}课程目标达成度分析报告`,
    `${course.semester} / ${course.className}`,
  );

  sheet.addRows([
    ["课程名称", course.courseName, "课程编码", course.courseCode, "开课学期", course.semester],
    ["课程类别", course.courseType, "专业", course.major, "开课学院（部）", course.department],
    ["班级", course.className, "任课教师", course.teacherNames, "课程负责人", course.ownerTeacher],
    ["选课人数", course.selectedCount, "参评人数", course.evaluatedCount, "期望值", course.expectedValue],
    [],
    ["课程目标", "直接评价", "间接评价", "综合达成度", "期望值", "是否达标"],
  ]);

  calc.targetSummaries.forEach((summary) => {
    sheet.addRow([
      summary.targetName,
      summary.directAttainment,
      summary.indirectAttainment,
      summary.finalAttainment,
      summary.expectedValue,
      summary.finalAttainment >= summary.expectedValue ? "达标" : "待改进",
    ]);
  });

  sheet.addRows([
    [],
    ["课程分析", course.reportTexts.analysisText],
    ["存在问题", course.reportTexts.problemText],
    ["改进措施", course.reportTexts.improvementText],
    ["教师评价", course.reportTexts.teacherComment],
  ]);
}

function buildStudentTargetAttainmentSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
) {
  const sheet = workbook.addWorksheet("4学生课程目标达成度");
  const visibleMethods = getVisibleMethods(course);
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

async function loadChartTemplate() {
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
        return { worksheet };
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

function normalizeChartHeader(sheet: ExcelJS.Worksheet) {
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

  for (let columnIndex = 13; columnIndex <= 20; columnIndex += 1) {
    sheet.getCell(1, columnIndex).value =
      columnIndex < 20 ? `目标${columnIndex - 12}` : "总目标";
    sheet.getCell(2, columnIndex).value = null;
  }

  sheet.getRow(4).height = 15;
}

async function buildChartSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
) {
  const { worksheet: templateSheet } = await loadChartTemplate();
  const sheet = workbook.addWorksheet("5绘图数据");
  cloneWorksheetStructure(templateSheet, sheet);
  clearWorksheetValues(sheet);

  const fixedTargetCount = 7;
  const leftStartColumn = 4;
  const leftTotalColumn = 11;
  const averageStartColumn = 13;
  const averageTotalColumn = 20;
  const expectedColumn = 22;
  const helperLabelColumn = 24;
  const helperValueColumn = 25;
  const helperExpectedColumn = 26;
  const chartStartRow = 3;
  const helperStartRow = 4;

  try {
    sheet.unMergeCells("A1:A2");
  } catch {}
  try {
    sheet.unMergeCells("B1:B2");
  } catch {}
  try {
    sheet.unMergeCells("C1:C2");
  } catch {}
  sheet.mergeCells("A1:A2");
  sheet.mergeCells("B1:B2");
  sheet.mergeCells("C1:C2");

  sheet.getCell("A1").value = "序号";
  sheet.getCell("B1").value = "学号";
  sheet.getCell("C1").value = "   平均达\n     成度\n姓名";
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  for (let index = 0; index < fixedTargetCount; index += 1) {
    sheet.getCell(1, leftStartColumn + index).value = `目标${index + 1}`;
    sheet.getCell(1, averageStartColumn + index).value = `目标${index + 1}`;
  }
  sheet.getCell(1, leftTotalColumn).value = "总目标";
  sheet.getCell(1, averageTotalColumn).value = "总目标";
  sheet.getCell(1, expectedColumn).value = "期望值";
  sheet.getCell("M2").value = "平均达成度";

  const averageValues = Array.from({ length: fixedTargetCount }, (_, index) =>
    calc.averages.targetAverages[index] ?? 0,
  );

  averageValues.forEach((value, index) => {
    sheet.getCell(2, leftStartColumn + index).value = value;
    sheet.getCell(2, leftStartColumn + index).numFmt = "0.00";
    sheet.getCell(2, averageStartColumn + index).value = value;
    sheet.getCell(2, averageStartColumn + index).numFmt = "0.00";
  });
  sheet.getCell(2, leftTotalColumn).value = calc.averages.totalAverage;
  sheet.getCell(2, leftTotalColumn).numFmt = "0.00";
  sheet.getCell(2, averageTotalColumn).value = calc.averages.totalAverage;
  sheet.getCell(2, averageTotalColumn).numFmt = "0.00";

  calc.chartRows.forEach((chartRow, index) => {
    const rowIndex = chartStartRow + index;
    sheet.getRow(rowIndex).height = 15;
    sheet.getCell(rowIndex, 1).value = index;
    sheet.getCell(rowIndex, 2).value = chartRow.studentNo;
    sheet.getCell(rowIndex, 3).value = chartRow.studentName;

    for (let targetIndex = 0; targetIndex < fixedTargetCount; targetIndex += 1) {
      const targetValue = chartRow.targetAttainments[targetIndex] ?? 0;
      sheet.getCell(rowIndex, leftStartColumn + targetIndex).value = targetValue;
      sheet.getCell(rowIndex, leftStartColumn + targetIndex).numFmt = "0.00";
      sheet.getCell(rowIndex, averageStartColumn + targetIndex).value = averageValues[targetIndex];
      sheet.getCell(rowIndex, averageStartColumn + targetIndex).numFmt = "0.00";
    }

    sheet.getCell(rowIndex, leftTotalColumn).value = chartRow.totalAttainment;
    sheet.getCell(rowIndex, leftTotalColumn).numFmt = "0.00";
    sheet.getCell(rowIndex, averageTotalColumn).value = calc.averages.totalAverage;
    sheet.getCell(rowIndex, averageTotalColumn).numFmt = "0.00";
    sheet.getCell(rowIndex, expectedColumn).value = course.expectedValue;
    sheet.getCell(rowIndex, expectedColumn).numFmt = "0.00";
  });

  const helperLabels = [
    ...Array.from(
      { length: fixedTargetCount },
      (_, index) => course.targets[index]?.name ?? `课程目标${index + 1}`,
    ),
    "课程总目标",
  ];
  const helperValues = [
    ...Array.from(
      { length: fixedTargetCount },
      (_, index) => calc.targetSummaries[index]?.finalAttainment ?? 0,
    ),
    calc.targetSummaries.reduce(
      (sum, summary, index) =>
        sum + summary.finalAttainment * (course.targets[index]?.overallWeight ?? 0),
      0,
    ),
  ];

  helperLabels.forEach((label, index) => {
    const rowIndex = helperStartRow + index;
    sheet.getCell(rowIndex, helperLabelColumn).value = label;
    sheet.getCell(rowIndex, helperValueColumn).value = helperValues[index];
    sheet.getCell(rowIndex, helperValueColumn).numFmt = "0.00";
    sheet.getCell(rowIndex, helperExpectedColumn).value = course.expectedValue;
    sheet.getCell(rowIndex, helperExpectedColumn).numFmt = "0.00";
  });

  for (let rowIndex = 1; rowIndex <= 4; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= sheet.columnCount; columnIndex += 1) {
      sheet.getRow(rowIndex).getCell(columnIndex).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    }
  }

  normalizeChartHeader(sheet);
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

export async function exportWorkbook(
  course: CourseInput,
  kind: "3" | "4" | "5",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();
  workbook.modified = new Date();

  const calc = calculateCourse(course);

  if (kind === "3") {
    buildCourseAnalysisSheet(workbook, course, calc);
  }

  if (kind === "4") {
    buildStudentTargetAttainmentSheet(workbook, course, calc);
  }

  if (kind === "5") {
    await buildChartSheet(workbook, course, calc);
  }

  applyDefaultSheetStyling(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
