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

function buildChartSheet(
  workbook: ExcelJS.Workbook,
  course: CourseInput,
  calc: ReturnType<typeof calculateCourse>,
) {
  const sheet = workbook.addWorksheet("5绘图数据");
  setColumns(sheet, [10, 18, 16, ...course.targets.map(() => 14), 14, 14]);
  addHeader(sheet, "绘图数据", `${course.courseName || "未命名课程"} / ${course.className}`);
  sheet.addRow([
    "序号",
    "学号",
    "姓名",
    ...course.targets.map((target) => target.name),
    "总目标",
    "期望值",
  ]);

  calc.chartRows.forEach((row) => {
    sheet.addRow([
      row.index,
      row.studentNo,
      row.studentName,
      ...row.targetAttainments,
      row.totalAttainment,
      row.expectedValue,
    ]);
  });

  sheet.addRow([]);
  sheet.addRow([
    "平均达成度",
    "",
    "",
    ...calc.averages.targetAverages,
    calc.averages.totalAverage,
    course.expectedValue,
  ]);
}

function applyDefaultSheetStyling(workbook: ExcelJS.Workbook) {
  workbook.worksheets.forEach((sheet) => {
    if (sheet.name === "4学生课程目标达成度") {
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
        if (rowNumber <= 4) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
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
    buildChartSheet(workbook, course, calc);
  }

  applyDefaultSheetStyling(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
