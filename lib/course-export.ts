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
    const sheet = workbook.addWorksheet("3课程达成度分析报告");
    setColumns(sheet, [18, 18, 18, 18, 18, 18]);
    addHeader(sheet, `${course.courseName || "未命名课程"}课程目标达成度分析报告`, `${course.semester} / ${course.className}`);
    sheet.addRows([
      ["课程名称", course.courseName, "课程编码", course.courseCode, "开课学期", course.semester],
      ["课程类别", course.courseType, "专业", course.major, "开课学部（院）", course.department],
      ["班级", course.className, "任课教师", course.teacherNames, "课程责任人", course.ownerTeacher],
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

  if (kind === "4") {
    const sheet = workbook.addWorksheet("4学生课程目标达成度");
    setColumns(sheet, [10, 16, 16, ...course.targets.map(() => 14), 14]);
    addHeader(sheet, "学生课程目标达成度", `${course.courseName || "未命名课程"} / ${course.className}`);
    sheet.addRow([
      "序号",
      "学号",
      "姓名",
      ...course.targets.map((target) => target.name),
      "总目标达成度",
    ]);

    calc.studentSummaries.forEach((student, index) => {
      sheet.addRow([
        index + 1,
        student.studentNo,
        student.studentName,
        ...student.targetAttainments,
        student.totalAttainment,
      ]);
    });
  }

  if (kind === "5") {
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
    sheet.addRow(["平均达成度", "", "", ...calc.averages.targetAverages, calc.averages.totalAverage, course.expectedValue]);
  }

  workbook.worksheets.forEach((sheet) => {
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
